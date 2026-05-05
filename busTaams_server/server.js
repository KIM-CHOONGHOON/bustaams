/**
 * busTaams API Server
 * 2026-04-13 Update: Encryption & GCS Integration Merged with Advanced Business APIs
 */

const express = require('express');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const { pool, getNextId } = require('./db');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const { encrypt, decrypt } = require('./crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// 라우터 가져오기
const customerRouter = require('./routes/customer');
const bidRouter = require('./routes/bid');
const appAuthRouter = require('./routes/appAuth'); // 앱 전용 인증 라우터 추가
const appCustomerRouter = require('./routes/appCustomer'); // 앱 전용 고객 라우터 추가
const appAuctionRouter = require('./routes/appAuction'); // 앱 전용 경매 라우터 추가
const appDriverRouter = require('./routes/appDriver'); // 앱 전용 기사 라우터 추가
const appChatRouter = require('./routes/appChat'); // 앱 전용 채팅 라우터 추가


const app = express();

// --- 1. 환경 설정 및 초기화 (Shared/Upstream) ---

// Firebase Admin SDK 초기화
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH))) {
    try {
        const serviceAccount = require(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to load Firebase Service Account Key:', e.message);
        // Fallback: Default initialization (will try to use ADC)
        try { admin.initializeApp(); } catch(err) {} 
    }
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set or file does not exist in .env. Real SMS verification will be bypassed in development mode.');
    try { admin.initializeApp(); } catch(e) {}
}

// Google Cloud Storage 설정
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

// 프로필 이미지 등 로컬 백업 업로드 디렉토리 설정 (Stashed)
const profileUploadDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(profileUploadDir)){
    fs.mkdirSync(profileUploadDir, { recursive: true });
}

// Multer 설정 (로컬 개발용)
const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storageConfig,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- 2. 보안 유틸리티 (Stashed/JWT) ---

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// UUID String을 Buffer(16)로 변환 (모든 버전 호환 및 예외 처리 강화)
const uuidToBuffer = (uuid) => {
    if (!uuid) return null;
    if (Buffer.isBuffer(uuid)) return uuid;
    try {
        const cleanUuid = typeof uuid === 'string' ? uuid.replace(/-/g, '') : uuid.toString();
        return Buffer.from(cleanUuid, 'hex');
    } catch (e) {
        console.error('[uuidToBuffer] Conversion Error:', e);
        return null;
    }
};

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });

    jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
        
        // CUST_ID가 토큰에 없는 경우를 대비해 DB에서 확인 (하위 호환성)
        let custId = decoded.custId;
        if (!custId && decoded.userId) {
            try {
                const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [decoded.userId]);
                if (uRows.length > 0) {
                    custId = uRows[0].CUST_ID;
                }
            } catch (dbErr) {
                console.error('[AuthToken] Failed to fetch CUST_ID:', dbErr);
            }
        }

        req.user = {
            ...decoded,
            userId: decoded.userId,
            custId: custId,
            userUuid: decoded.userId // 하위 호환성
        };
        next();
    });
};

// --- 3. 공통 미들웨어 ---

app.use(cors({
    origin: [
        'http://localhost:5173', 'http://127.0.0.1:5173', 
        'http://localhost:5174', 'http://127.0.0.1:5174', 
        'http://localhost:5175', 'http://127.0.0.1:5175',
        'http://localhost:5176', 'http://127.0.0.1:5176',
        'http://localhost:5177', 'http://127.0.0.1:5177',
        'http://localhost:5178', 'http://127.0.0.1:5178',
        'http://localhost:5179', 'http://127.0.0.1:5179'
    ],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// 이미지 중계 API (GCS -> Backend -> Browser)
app.get('/api/common/display-image', async (req, res) => {
    try {
        const { path: imagePath } = req.query;
        if (!imagePath) return res.status(400).send('Image path is required');

        // GCS URL이 전체 경로로 들어온 경우 파일명만 추출
        let fileName = imagePath;
        if (imagePath.startsWith('http')) {
            const urlParts = imagePath.split('/');
            fileName = urlParts.slice(urlParts.indexOf(bucketName) + 1).join('/');
        }

        const file = bucket.file(fileName);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).send('Image not found');
        }

        const [metadata] = await file.getMetadata();
        res.setHeader('Content-Type', metadata.contentType || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐싱

        file.createReadStream().pipe(res);
    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).send('Internal server error');
    }
});

// [App 호환성] 단일 파일 업로드 API (Multer 사용)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '업로드할 파일이 없습니다.' });
        }
        
        // 정적 파일 서빙 경로인 /uploads/... 형태의 URL 생성
        const fileUrl = `/uploads/profiles/${req.file.filename}`;
        
        console.log(`[File Upload] Success: ${req.file.filename}`);
        res.json({ 
            success: true, 
            fileUrl: fileUrl 
        });
    } catch (err) {
        console.error('[File Upload] Error:', err);
        res.status(500).json({ success: false, error: '파일 업로드 중 서버 오류가 발생했습니다.' });
    }
});

// [App 호환성] 앱 예약 상세 정보 조회 (TB_AUCTION_REQ 연동)
app.get('/api/app/customer/reservation/:id', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const userId = req.user?.userId;

        console.log(`[Debug] Detail Request (Priority) - ID: ${reqId}, User: ${userId}`);

        if (!reqId || !userId) {
            throw new Error('필수 정보(ID 또는 사용자 정보)가 누락되었습니다.');
        }

        const [rows] = await pool.execute(`
            SELECT 
                REQ_ID as reqId, TRIP_TITLE as tripName, START_ADDR as from_addr, END_ADDR as to_addr,
                DATE_FORMAT(START_DT, '%Y-%m-%d %H:%i') as start_date, DATE_FORMAT(END_DT, '%Y-%m-%d %H:%i') as end_date,
                REQ_AMT as total_price, DATA_STAT as status, REQ_COMMENT as specialRequest, PASSENGER_CNT as passengerCount,
                TRAVELER_ID as ownerId,
                CASE 
                    WHEN DATA_STAT = 'AUCTION' THEN '입찰중' WHEN DATA_STAT = 'CONFIRM' THEN '예약확정'
                    WHEN DATA_STAT = 'DONE' THEN '운행완료' WHEN DATA_STAT = 'CANCEL' THEN '취소됨' ELSE '대기중'
                END as statusText
            FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: '해당 예약을 찾을 수 없습니다.' });

        const reservation = rows[0];
        if (reservation.ownerId !== userId) {
            return res.status(403).json({ success: false, error: '본인의 예약 내역만 조회 가능합니다.' });
        }

        const [viaRows] = await pool.execute(`SELECT VIA_ADDR as addr, VIA_TYPE as type FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC`, [reqId]);
        const fullRoute = [{ type: 'START', addr: reservation.from_addr, title: '출발지', time: reservation.start_date }];
        
        let hasRoundTrip = false;
        viaRows.forEach(v => {
            if (v.type === 'START_NODE' || v.type === 'END_NODE') return;

            let title = '경유지';
            if (v.type === 'START_WAY') title = '가는길 경유지';
            else if (v.type === 'ROUND_TRIP') {
                title = '도착지(회차)';
                hasRoundTrip = true;
            }
            else if (v.type === 'END_WAY') title = '복귀길 경유지';
            
            fullRoute.push({ 
                type: v.type === 'ROUND_TRIP' ? 'ROUND' : 'WAY', 
                addr: v.addr, 
                title: title 
            });
        });
        
        fullRoute.push({ 
            type: 'END', 
            addr: hasRoundTrip ? reservation.from_addr : reservation.to_addr, 
            title: hasRoundTrip ? '복귀지' : '도착지', 
            time: reservation.end_date 
        });
        reservation.route = fullRoute;

        const [busRows] = await pool.execute(`
            SELECT REQ_BUS_SEQ as reqBusId, BUS_TYPE_CD as busType, REQ_BUS_CNT as count, TOLLS_AMT as price
            FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?
        `, [reqId]);
        reservation.requestedBuses = busRows;

        res.json({ success: true, data: reservation });
    } catch (err) {
        console.error('Reservation detail error:', err);
        res.status(500).json({ success: false, error: `서버 오류: ${err.message}` });
    }
});

// --- 분리된 라우터 등록 ---
// Debug middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
});

app.use('/api/app/customer', appCustomerRouter); 
app.use('/api/app/auth', appAuthRouter); 
app.use('/api/app/auction', appAuctionRouter); 
app.use('/api/app/driver', appDriverRouter); // 앱 전용 기사 라우터 등록
app.use('/api/app/chat', appChatRouter); // 앱 전용 채팅 라우터 등록
app.use('/api/bid', bidRouter);

// [App 호환성] 앱 대시보드에서 직접 호출하는 경로 지원
app.get('/api/my-pending-requests', (req, res, next) => {
    req.url = '/my-pending-requests'; // 경로 재작성
    customerRouter(req, res, next);
});

// [App 호환성] 앱 예약 리스트 조회 (TB_AUCTION_REQ 연동)
app.get('/api/my-reservations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [rows] = await pool.execute(`
            SELECT 
                REQ_ID as reqId,
                TRIP_TITLE as tripName,
                START_ADDR as from_addr,
                END_ADDR as to_addr,
                DATE_FORMAT(START_DT, '%Y.%m.%d') as startDate,
                DATE_FORMAT(END_DT, '%Y.%m.%d') as endDate,
                DATA_STAT as status,
                CASE 
                    WHEN DATA_STAT = 'AUCTION' THEN '입찰중'
                    WHEN DATA_STAT = 'CONFIRM' THEN '예약확정'
                    WHEN DATA_STAT = 'DONE' THEN '운행완료'
                    WHEN DATA_STAT = 'CANCEL' THEN '취소됨'
                    ELSE '대기중'
                END as statusText
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_ID = ? 
            ORDER BY REG_DT DESC
        `, [userId]);

        const ongoing = rows.filter(r => ['AUCTION', 'CONFIRM'].includes(r.status));
        const completed = rows.filter(r => ['DONE', 'CANCEL'].includes(r.status));

        // 프론트엔드 기대 형식에 맞게 날짜 문자열 조합
        const formatRes = (list) => list.map(item => ({
            ...item,
            date: `${item.startDate} ~ ${item.endDate}`
        }));

        res.json({
            success: true,
            data: {
                ongoing: formatRes(ongoing),
                completed: formatRes(completed)
            }
        });
    } catch (err) {
        console.error('Fetch my-reservations error:', err);
        res.status(500).json({ success: false, error: '내역 조회 중 오류가 발생했습니다.' });
    }
});
// --- 4. 인증 API (Merged Upstream + Stashed) ---

// 아이디 중복 확인
app.get('/api/auth/check-id', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.json({ isAvailable: false });
        
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE USER_ID = ?', [userId]);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

// 이메일 중복 확인
app.get('/api/auth/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.json({ isAvailable: false });
        
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE EMAIL = ?', [email]);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

// 전화번호 중복 확인
app.get('/api/auth/check-phone', async (req, res) => {
    try {
        const { phoneNo } = req.query;
        if (!phoneNo) return res.json({ isAvailable: false });
        
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ?', [phoneNo]);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

// [신규] SMS 인증 번호 요청 및 이력 저장
app.post('/api/auth/request-sms', async (req, res) => {
    try {
        const { phoneNo, category } = req.body;
        if (!phoneNo) return res.status(400).json({ error: '휴대폰 번호가 필요합니다.' });

        const purePhone = phoneNo.replace(/[^0-9]/g, '');
        // 가입된 전화번호인지 체크 (회원가입 카테고리일 경우)
        if (category === 'SIGN_UP') {
            const [users] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ? AND USER_STAT = "ACTIVE"', [purePhone]);
            if (users.length > 0) {
                return res.status(400).json({ error: '이미 가입된 전화번호입니다.' });
            }
        }

        const authCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리

        // 1. 발송 이력 저장 (TB_SMS_LOG)
        // 신규 로직: 가입된 사용자인 경우 CUST_ID를, 아니면 '0000000000'을 RECEIVER_ID로 사용
        const [userRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE HP_NO = ? AND USER_STAT = "ACTIVE" LIMIT 1', [purePhone]);
        const receiverId = userRows.length > 0 ? userRows[0].CUST_ID : '0000000000';

        const sendCategory = category === 'JOIN' ? 'SIGN_UP' : (category === 'NEWPW' ? 'NEW_PASSWORD' : (category === 'ETC' ? 'OTHER' : (category || 'OTHER')));
        const msgContent = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;

        const logQuery = `
            INSERT INTO TB_SMS_LOG (
                SEND_CATEGORY, RECEIVER_ID, REG_ID, RECEIVER_PHONE, MSG_CONTENT, MSG_TYPE, SEND_STAT, REG_DT
            ) VALUES (?, ?, ?, ?, ?, 'SMS', 'SUCCESS', NOW())
        `;

        await pool.execute(logQuery, [sendCategory, receiverId, receiverId, purePhone, msgContent]);

        console.log(`[SMS AUTH] To: ${purePhone}, Code: ${authCode}`);

        res.json({ 
            success: true, 
            message: '인증번호가 발송되었습니다. (테스트용)', 
            code: authCode // 실운영 시에는 보안상 제외하거나 실제 SMS 발송
        });
    } catch (err) {
        console.error('SMS Request Error:', err);
        res.status(500).json({ error: '인증번호 발송 처리 중 오류가 발생했습니다.' });
    }
});

// 회원가입 (Upstream Security + GCS + Stashed Logic)
app.post('/api/auth/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            userId, password, userName, phoneNo, userType, 
            firebaseIdToken, mktAgreeYn, signatureBase64, agreedTerms 
        } = req.body;

        // 아이디 및 연락처 중복 체크
        const [existing] = await connection.execute(
            'SELECT 1 FROM TB_USER WHERE USER_ID = ? OR HP_NO = ?', 
            [userId, phoneNo]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '이미 존재하는 아이디 혹은 휴대폰 번호입니다.' });
        }

        // [보안] 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. CUST_ID 채번 (10자리, 0 패딩)
        const custId = await getNextId('TB_USER', 'CUST_ID', 10);

        // 2. 전자 서명 처리 (GCS 업로드 및 TB_FILE_MASTER 등록)
        let signFileId = null;
        if (signatureBase64 && signatureBase64.startsWith('data:image')) {
            const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
            const fileName = `signatures/web_${fileId}.png`;
            const file = bucket.file(fileName);
            const buffer = Buffer.from(signatureBase64.split(',')[1], 'base64');
            
            await file.save(buffer, {
                metadata: { contentType: 'image/png' }
            });

            const gcsPath = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            signFileId = fileId;

            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID)
                VALUES (?, 'SIGNATURE', ?, ?, 'png', ?, ?)
            `;
            await connection.execute(fileQuery, [fileId, gcsPath, `${userId}_signature.png`, custId, custId]);
        }

        // 3. TB_USER 삽입 (CUST_ID 추가, USER_IMAGE 대신 SIGNATURE_FILE_ID 사용)
        const userQuery = `
            INSERT INTO TB_USER (
                CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT, SIGNATURE_FILE_ID
            ) VALUES (?, ?, ?, ?, ?, ?, 'NONE', 'Y', ?, NOW(), 'ACTIVE', ?)
        `;
        
        await connection.execute(userQuery, [
            custId,
            userId, 
            userId, // Web은 우선 ID와 동일
            hashedPassword, 
            userName, 
            phoneNo, 
            userType || 'TRAVELER',
            signFileId
        ]);

        // 3.5 TB_USER_CANCEL_MANAGE 초기화 (취소 건수 0으로 설정)
        const cancelManageQuery = `
            INSERT INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, 
                CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, 
                TRADE_RESTRICT_YN, REG_ID, MOD_ID
            ) VALUES (?, 0, 0, 0, 0, 'N', ?, ?)
        `;
        await connection.execute(cancelManageQuery, [custId, custId, custId]);

        // 4. 약관 동의 이력 (TB_USER_TERMS_HIST - 키값을 CUST_ID로 변경)
        if (agreedTerms && Array.isArray(agreedTerms)) {
            const histQuery = `
                INSERT INTO TB_USER_TERMS_HIST (
                    CUST_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, 
                    SIGN_FILE_ID, AGREE_DT
                ) VALUES (?, ?, ?, 'v1.0', 'Y', ?, NOW())
            `;
            let seq = 1;
            for (const termCode of agreedTerms) {
                await connection.execute(histQuery, [
                    custId, 
                    seq++,
                    termCode.toString(),
                    signFileId // null 가능
                ]);
            }
        }

        // 4. 마케팅 수신 동의 (필요 시 별도 컬럼 저장 혹은 이력)

        await connection.commit();
        res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('Registration Error:', err);
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다: ' + err.message });
    } finally {
        connection.release();
    }
});

// 로그인 (Upstream Crypto + Stashed JWT)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        console.log(`[Login] Attempt: ${userId}`);
        
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ? AND USER_STAT = "ACTIVE"', [userId]);
        
        if (rows.length === 0) {
            console.log(`[Login] Failed: User ${userId} not found`);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.PASSWORD);
        if (!match) {
            console.log(`[Login] Failed: Password mismatch for ${userId}`);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // JWT 발행 (CUST_ID 포함)
        const token = jwt.sign(
            { 
                custId: user.CUST_ID,
                userId: userId, 
                userType: user.USER_TYPE 
            }, 
            JWT_SECRET_KEY, 
            { expiresIn: '24h' }
        );

        console.log(`[Login] Success: ${userId} (${user.CUST_ID})`);
        res.json({ 
            success: true, 
            token, 
            user: { 
                custId: user.CUST_ID,
                userId: userId, 
                userName: user.USER_NM, 
                userType: user.USER_TYPE,
                hpNo: user.HP_NO
            } 
        });
    } catch (err) {
        console.error('[Login] Critical Error:', err);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});

// --- 5. 기사(Driver) 전용 API (Stashed Business Logic) ---

// 기사 등록 상태 확인
app.get('/api/driver/registration-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [driverDocs] = await pool.execute('SELECT COUNT(*) as count FROM TB_DRIVER_DOCS WHERE USER_UUID = ?', [userUuidBuf]);
        // 변경점: TB_DRIVER_BUS 가 아니라 TB_BUS_DRIVER_VEHICLE 테이블을 확인해야 함.
        const [busDocs] = await pool.execute('SELECT COUNT(*) as count FROM TB_BUS_DRIVER_VEHICLE WHERE USER_UUID = ?', [userUuidBuf]);

        res.json({ 
            success: true, 
            isDriverRegistered: driverDocs[0].count > 0,
            isBusRegistered: busDocs[0].count > 0
        });
    } catch (err) {
        res.status(500).json({ error: '상태 조회 오류' });
    }
});

// 기사 관련 기존 API는 appDriver 라우터로 통합/이전되었습니다.


// --- 견적 및 입찰 관련 API (Stashed Business Logic) ---

// 1. 견적 요청 등록 (Customer)
app.post('/api/app/customer/request-bus', authenticateToken, async (req, res) => {
    try {
        const { tripTitle, startAddr, endAddr, startDt, endDt, passCount, busType, etcContent } = req.body;
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const reqUuid = randomUUID();

        const query = `
            INSERT INTO TB_AUCTION_REQ (
                REQ_UUID, TRAVELER_UUID, TRIP_TITLE, START_ADDR, END_ADDR, START_DT, END_DT, PASSENGER_CNT, REQ_STAT
            ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, 'OPEN')
        `;
        await pool.execute(query, [
            reqUuid, userUuidBuf, tripTitle, startAddr, endAddr, startDt, endDt, passCount, 'OPEN'
        ]);

        res.status(201).json({ success: true, message: '견적 요청이 등록되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '요청 등록 실패' });
    }
});

// 2. 고객의 견적 요청 조회
app.get('/api/app/customer/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            `SELECT r.REQ_ID as reqUuid, r.TRIP_TITLE as tripTitle, r.START_ADDR as startAddr, r.END_ADDR as endAddr, 
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundAddr,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d') as startDt, r.DATA_STAT as reqStat,
                    (SELECT COUNT(*) FROM TB_BUS_RESERVATION b WHERE b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci) as bidCount
             FROM TB_AUCTION_REQ r
             JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
             WHERE u.USER_ID = ? ORDER BY r.REG_DT DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '조회 실패' });
    }
});

// 3. 기사: 참여 가능한 견적 목록
app.get('/api/driver/available-estimates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [driverInfo] = await pool.execute(
            `SELECT 
                v.SERVICE_CLASS,
                fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             JOIN TB_USER u ON v.CUST_ID = u.CUST_ID
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE u.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [userId]
        );
        
        let driverBusType = null;
        let driverBusImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800'; 
        
        if (driverInfo.length > 0) {
            driverBusType = driverInfo[0].SERVICE_CLASS;
            if (driverInfo[0].GCS_PATH) {
                driverBusImg = driverInfo[0].GCS_PATH;
            }
        }

        // 2. 이용 가능한 견적 조회
        if (!driverBusType) {
            return res.json({ success: true, data: [], message: '등록된 차량 정보가 없습니다.' });
        }

        let query = `
            SELECT 
                r.REQ_ID as id, 
                r.TRIP_TITLE as title, 
                r.START_ADDR as departure, 
                r.END_ADDR as destination, 
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate,
                COALESCE(r.PASSENGER_CNT, 0) as participants,
                rb.BUS_TYPE_CD as busTypeNm,
                COALESCE(rb.RES_BUS_AMT, r.REQ_AMT, 0) as price,
                COALESCE(u.USER_NM, '익명 고객님') as customerName,
                u.PROFILE_IMG_PATH as customerAvatar,
                '입찰중' as timeLeft,
                ? as image
            FROM TB_AUCTION_REQ r
            JOIN TB_AUCTION_REQ_BUS rb ON r.REQ_ID = rb.REQ_ID
            LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
            WHERE rb.BUS_TYPE_CD = ? 
            AND rb.DATA_STAT = 'AUCTION'
            AND NOT EXISTS (
                SELECT 1 FROM TB_BUS_RESERVATION b 
                WHERE b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci 
                  AND b.DRIVER_ID = ?
            )
            ORDER BY r.REG_DT DESC
        `;

        const [rows] = await pool.execute(query, [driverBusImg, driverBusType, custId]);
        
        res.json({ 
            success: true, 
            data: rows,
            debug: { driverBusType, count: rows.length } 
        });
    } catch (err) {
        console.error('Available estimates fetch error:', err);
        res.status(500).json({ error: '목록 조회 실패' });
    }
});

// 4. 기사: 유찰/입찰 실패 내역
app.get('/api/driver/failed-estimates', authenticateToken, async (req, res) => {
    try {
        const custId = req.user.custId;
        const [rows] = await pool.execute(
            `SELECT b.REQ_ID as resUuid, r.TRIP_TITLE as tripTitle, 
                    r.START_ADDR as startAddr, r.END_ADDR as endAddr, 
                    DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate, '유찰' as status
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
             WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'FAILED'
             ORDER BY b.REG_DT DESC`,
            [custId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '내역 조회 실패' });
    }
});

// 4-1. 기사: 승인 진행 리스트 (입찰 후 대기 중인 내역)
// [App 호환성] 앱에서 호출하는 경로(/api/driver/pending-approvals)와 웹/서버 경로(/api/driver/approval-list) 통합 관리
const getApprovalList = async (req, res) => {
    try {
        const custId = req.user.custId;
        
        const [rows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id, 
                r.TRIP_TITLE as title, 
                CONCAT(r.START_ADDR, ' → ', r.END_ADDR) as route,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as date,
                b.DRIVER_BIDDING_PRICE as price,
                COALESCE(db.SERVICE_CLASS, '차종 미정') as busTypeNm,
                '승인대기' as status
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
             LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
             WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'BIDDING'
             ORDER BY b.REG_DT DESC`,
            [custId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[Approval List Error]', err);
        res.status(500).json({ success: false, error: '승인 리스트 조회 실패' });
    }
};

app.get('/api/driver/approval-list', authenticateToken, getApprovalList);
app.get('/api/driver/pending-approvals', authenticateToken, getApprovalList);

// [추가] 기사: 입찰 상세 정보 조회 (입찰 수정 페이지용)
app.get('/api/driver/bid-detail/:id', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const custId = req.user.custId;
        
        const [rows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddr,
                DATE_FORMAT(r.START_DT, '%Y/%m/%d') as startDate,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as endDate,
                DATEDIFF(r.END_DT, r.START_DT) + 1 as travelDays,
                b.DRIVER_BIDDING_PRICE as price,
                b.DRIVER_BIDDING_PRICE as baseFare,
                0 as tollFee,
                0 as fuelFee,
                0 as roomBoardFee,
                0 as driverTip,
                '' as serviceMemo,
                db.SERVICE_CLASS as busTypeNm
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
             LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
             WHERE b.REQ_ID COLLATE utf8mb4_unicode_ci = ? AND b.DRIVER_ID = ?`,
            [reqId, custId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '입찰 정보를 찾을 수 없습니다.' });
        }

        const bidData = rows[0];

        // 경유지 정보 가져오기
        const [viaRows] = await pool.execute(
            `SELECT VIA_ADDR, VIA_TYPE 
             FROM TB_AUCTION_REQ_VIA 
             WHERE REQ_ID = ? 
             ORDER BY VIA_SEQ ASC`,
            [reqId]
        );

        const routeStops = {
            start: bidData.startAddr,
            startWaypoints: viaRows.filter(v => v.VIA_TYPE === 'START_WAY').map(v => v.VIA_ADDR),
            turnback: viaRows.filter(v => v.VIA_TYPE === 'ROUND_TRIP').map(v => v.VIA_ADDR)[0] || '',
            returnWaypoints: viaRows.filter(v => v.VIA_TYPE === 'END_WAY').map(v => v.VIA_ADDR),
            destination: bidData.endAddr
        };

        bidData.routeStops = routeStops;
        res.json({ success: true, data: bidData });
    } catch (err) {
        console.error('[Bid Detail Error]', err);
        res.status(500).json({ success: false, error: '입찰 상세 정보 조회 실패' });
    }
});


// [추가] 기사: 내 버스 목록 조회
app.get('/api/driver/my-buses', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            `SELECT BUS_ID as busUuid, VEHICLE_NO as busNo, MODEL_NM as busModel, SERVICE_CLASS as busType 
             FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?)`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '버스 목록 조회 실패' });
    }
});

// [APP] 기사: 견적 상세 정보 조회 (앱 전용 신규 API - MySQL 5.7+ 호환 보강)
app.get('/api/app/driver/estimate/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        console.log(`[Estimate Detail Request] Looking for ID: ${id}`);

        // 1. 견적 마스터 및 차량 타입 정보 조회
        const [rows] = await pool.execute(
            `SELECT 
                r.REQ_ID as HEX_ID,
                COALESCE(r.TRIP_TITLE, '제목 없음') as title, 
                COALESCE(r.START_ADDR, '정보 없음') as departure, 
                COALESCE(r.END_ADDR, '정보 없음') as destination, 
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDtText,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDtText,
                COALESCE(r.PASSENGER_CNT, 0) as passengerCount,
                '' as specialRequest,
                COALESCE(rb.BUS_TYPE_CD, '차종 미정') as busTypeNm,
                COALESCE(rb.RES_BUS_AMT, r.REQ_AMT, 0) as price,
                r.DATA_STAT as status
            FROM TB_AUCTION_REQ r
            LEFT JOIN TB_AUCTION_REQ_BUS rb ON r.REQ_ID = rb.REQ_ID
            WHERE r.REQ_ID = ?
            LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '견적 정보를 찾을 수 없습니다.' });
        }

        const estimateData = { ...rows[0], id: id };

        // 2. 경유지 정보 조회 (Route)
        const [viaRows] = await pool.execute(
            `SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
             FROM TB_AUCTION_REQ_VIA
             WHERE REQ_ID = ?
             ORDER BY VIA_SEQ ASC`,
            [id]
        );
        
        // 경로 구성
        const route = [];
        route.push({ type: 'START', addr: estimateData.departure, title: '출발지' });
        
        let hasRoundTrip = false;
        viaRows.forEach(v => {
            let title = '경유지';
            if (v.type === 'START_WAY') title = '가는길 경유지';
            else if (v.type === 'ROUND_TRIP') {
                title = '도착지(회차)';
                hasRoundTrip = true;
            }
            else if (v.type === 'END_WAY') title = '복귀길 경유지';
            
            route.push({ 
                type: v.type === 'ROUND_TRIP' ? 'ROUND' : 'WAY', 
                addr: v.addr, 
                title: title 
            });
        });
        
        route.push({ 
            type: 'END', 
            addr: hasRoundTrip ? estimateData.departure : estimateData.destination, 
            title: hasRoundTrip ? '복귀지' : '도착지' 
        });
        estimateData.route = route;

        // 3. 기사의 최신 차량 이미지 조회 (미리보기용 - 검증된 테이블 사용)
        const [driverImg] = await pool.execute(
            `SELECT fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             JOIN TB_USER u ON v.CUST_ID = u.CUST_ID
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE u.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [req.user.userId]
        );

        estimateData.image = (driverImg.length > 0 && driverImg[0].GCS_PATH) 
            ? driverImg[0].GCS_PATH 
            : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';

        res.json({ success: true, data: estimateData });
    } catch (err) {
        console.error('Estimate detail error:', err);
        res.status(500).json({ error: '상세 정보 조회 실패: ' + err.message });
    }
});

// [추가] 기사: 실시간 입찰 제안 제출 (TB_BUS_RESERVATION 사용)
app.post('/api/driver/bid', authenticateToken, async (req, res) => {
    try {
        let { reqId, busId, baseFare, tollFee, fuelFee, roomBoardFee, driverTip, serviceMemo } = req.body;
        
        if (!reqId || baseFare === undefined) {
            return res.status(400).json({ error: '필수 항목(기본요금 등)이 누락되었습니다.' });
        }

        const custId = req.user.custId;

        // 만약 busId가 제공되지 않았다면, 기사의 첫 번째 등록된 차량을 사용
        if (!busId) {
            const [busRows] = await pool.execute(
                `SELECT v.BUS_ID as busId FROM TB_BUS_DRIVER_VEHICLE v WHERE v.CUST_ID = ? LIMIT 1`,
                [custId]
            );
            if (busRows.length > 0) {
                busId = busRows[0].busId;
            } else {
                return res.status(400).json({ error: '등록된 차량이 없습니다. 차량 정보를 먼저 등록해주세요.' });
            }
        }
        
        // 총 입찰 금액 계산 (NaN 방지)
        const totalBidAmt = Number(baseFare || 0) + Number(tollFee || 0) + Number(fuelFee || 0) + Number(roomBoardFee || 0) + Number(driverTip || 0);
        
        if (isNaN(totalBidAmt)) {
            return res.status(400).json({ error: '금액 형식이 올바르지 않습니다.' });
        }

        // TB_BUS_RESERVATION 에 데이터 삽입
        const sql = `
            INSERT INTO TB_BUS_RESERVATION (
                REQ_ID, DRIVER_ID, BUS_ID, 
                DRIVER_BIDDING_PRICE, DATA_STAT, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, 'BIDDING', ?, ?)
        `;

        await pool.execute(sql, [
            reqId, custId, busId,
            totalBidAmt, userId, userId
        ]);

        res.status(201).json({ success: true, message: '입찰 제안이 성공적으로 제출되었습니다.' });
    } catch (err) {
        console.error('Bid Submit Error:', err);
        res.status(500).json({ 
            error: '입찰 등록 중 오류가 발생했습니다.',
            details: err.message // 디버깅용 상세 메시지 추가
        });
    }
});

// --- 고객 편의 API (reviews, inquiries, etc.) ---

// 1:1 문의 등록
app.post('/api/app/customer/inquiry', authenticateToken, async (req, res) => {
    try {
        const { category, title, content } = req.body;
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);

        const categoryMap = { '입찰 및 예약 문의': 'BID_RES', '결제 및 계약금 관련': 'PAY_REFUND', '취소 및 환불 정책': 'CANCEL_RULE', '서비스 제안 및 기타': 'SUGGESTION' };
        const dbCategory = categoryMap[category] || 'SUGGESTION';

        await pool.execute(
            'INSERT INTO TB_INQUIRY (USER_UUID, INQ_CATEGORY, TITLE, CONTENT, INQ_STAT, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, "WAITING", ?, ?)',
            [userUuidBuf, dbCategory, title, content, userId, userId]
        );
        res.json({ success: true, message: '문의가 등록되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: '등록 실패' });
    }
});

// 1:1 문의 내역
app.get('/api/app/customer/inquiries', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [rows] = await pool.execute(
            `SELECT INQ_ID as id, INQ_CATEGORY as category, TITLE as title, DATE_FORMAT(REG_DT, '%Y/%m/%d') as date, INQ_STAT as status 
             FROM TB_INQUIRY WHERE USER_UUID = ? ORDER BY REG_DT DESC`,
            [userUuidBuf]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '조회 실패' });
    }
});

// 1:1 문의 상세 조회
app.get('/api/app/customer/inquiry/:id', authenticateToken, async (req, res) => {
    try {
        const inqId = req.params.id;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        
        const [rows] = await pool.execute(
            `SELECT INQ_ID as id, INQ_CATEGORY as category, TITLE as title, CONTENT as content, DATE_FORMAT(REG_DT, '%Y/%m/%d') as date, INQ_STAT as status 
             FROM TB_INQUIRY WHERE INQ_ID = ? AND USER_UUID = ?`,
            [inqId, userUuidBuf]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '문의 내역을 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Inquiry Detail Error:', err);
        res.status(500).json({ success: false, error: '상세 조회 실패' });
    }
});

// 리뷰 제출
app.post('/api/submit-review', authenticateToken, async (req, res) => {
    try {
        const { resUuid, rating, comment } = req.body;
        const userId = req.user.userId;
        const custId = req.user.custId;

        console.log(`[SubmitReview] Request: resUuid=${resUuid}, userId=${userId}, custId=${custId}`);

        if (!resUuid || !custId) {
            console.error('[SubmitReview] Missing required info:', { resUuid, custId });
            return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
        }

        // 먼저 예약 정보에서 기사 ID 가져오기
        const [resRows] = await pool.execute('SELECT DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [resUuid]);
        
        if (resRows.length === 0) {
            console.error('[SubmitReview] Reservation not found for RES_ID:', resUuid);
            return res.status(404).json({ success: false, error: '예약 정보를 찾을 수 없습니다.' });
        }
        
        const driverId = resRows[0].DRIVER_ID;
        console.log(`[SubmitReview] Found driverId: ${driverId}`);

        // 다음 리뷰 시퀀스 계산
        const [seqRows] = await pool.execute('SELECT COALESCE(MAX(REVIEW_SEQ), 0) + 1 as nextSeq FROM TB_TRIP_REVIEW WHERE RES_ID = ?', [resUuid]);
        const nextSeq = seqRows[0].nextSeq;

        console.log(`[SubmitReview] Calculated nextSeq: ${nextSeq}`);

        await pool.execute(
            `INSERT INTO TB_TRIP_REVIEW (RES_ID, REVIEW_SEQ, WRITER_ID, DRIVER_ID, STAR_RATING, COMMENT_TEXT, REG_ID, MOD_ID) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [resUuid, nextSeq, custId, driverId, rating, comment, userId, userId]
        );

        console.log(`[SubmitReview] Success: Review saved for RES_ID ${resUuid}`);
        res.json({ success: true, message: '리뷰가 등록되었습니다.' });
    } catch (err) {
        console.error('[SubmitReview] Critical Error:', err);
        res.status(500).json({ success: false, error: '리뷰 등록 중 내부 오류가 발생했습니다.' });
    }
});

// [APP] 기사: 상단 프로필 정보 조회
app.get('/api/driver/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                u.USER_NM as name,
                u.HP_NO as phone,
                COALESCE(u.PROFILE_IMG_PATH, fm.GCS_PATH) as profileImage
             FROM TB_USER u
             LEFT JOIN TB_FILE_MASTER fm ON u.PROFILE_FILE_ID = fm.FILE_ID
             WHERE u.USER_ID = ?`,
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const userData = rows[0];
        res.json({ 
            success: true, 
            data: {
                user: {
                    name: userData.name,
                    userName: userData.name,
                    profileImg: userData.profileImage
                },
                driver: {
                    profileImg: userData.profileImage
                }
            } 
        });
    } catch (err) {
        console.error('Driver profile error:', err);
        res.status(500).json({ error: '프로필 조회 실패' });
    }
});

// 공통 코드 조회 API
app.get('/api/common/codes/:grpCd', async (req, res) => {
    try {
        const { grpCd } = req.params;
        const [rows] = await pool.execute(
            'SELECT DTL_CD as code, CD_NM_KO as name, CD_DESC as description FROM TB_COMMON_CODE WHERE GRP_CD = ? AND USE_YN = "Y" ORDER BY DISP_ORD ASC',
            [grpCd]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Common codes fetch error:', err);
        res.status(500).json({ error: '코드 조회 실패' });
    }
});

// --- 서버 시작 ---

// 404 핸들러 (JSON 실효성 보장 - HTML 에러 페이지 방지)
app.use((req, res) => {
    console.warn(`⚠️ 404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ 
        success: false, 
        error: '요청하신 경로를 찾을 수 없습니다.',
        path: req.path 
    });
});

// 글로벌 에러 핸들러 (Unexpected end of JSON input 방지)
app.use((err, req, res, next) => {
    console.error('🔥 [Global Error Handler]:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || '서버 내부 오류가 발생했습니다.'
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 busTaams API Server is running on port ${PORT}`);
    console.log(`📡 CORS allowed for: http://localhost:5173, http://127.0.0.1:5173, http://localhost:5174, http://127.0.0.1:5174`);
});
