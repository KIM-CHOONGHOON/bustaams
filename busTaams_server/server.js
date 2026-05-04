const express = require('express');
console.log('📦 server.js 로딩 중...');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('./crypto');

/**
 * 가변 길이 0-패딩 숫자 ID 생성기
 * @param {number|string} currentMax 순자값 또는 문자열
 * @param {number} length 패딩 길이 (기본 10)
 * @returns {string} 패딩된 다음 ID
 */
function generateNextNumericId(currentMax, length = 10) {
    const nextVal = (parseInt(currentMax || 0, 10)) + 1;
    return String(nextVal).padStart(length, '0');
}
// const { runDriverVerificationsForProfileSetup } = require('./driverVerification');
const fs = require('fs');
const createLiveChatBusDriverRouter = require('./routes/liveChatBusDriver');
const createLiveChatTravelerRouter = require('./routes/liveChatTraveler');
const createUserDeviceTokenRouter = require('./routes/userDeviceToken');
const { 
    buildPostLoginUserDto, 
    fetchCancelManageForUser, 
    fetchSubscriptionForDriver 
} = require('./lib/loginPayload');

const app = express();

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 8080;

// Global request logger - Enhanced for better visibility
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url, body, query } = req;
    
    // 요청 시점 로그
    console.log(`\n🚀 [REQ] ${method} ${url}`);
    if (query && Object.keys(query).length) console.log(`   🔍 Query:`, JSON.stringify(query));
    if (body && Object.keys(body).length) {
        const safeBody = { ...body };
        if (safeBody.password) safeBody.password = '********'; // 비밀번호는 마스킹
        console.log(`   📦 Body:`, JSON.stringify(safeBody));
    }

    // 응답 완료 시점 로그
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${statusColor} [RES] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
});

// 1. Firebase Admin SDK Initialization
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH))) {
    try {
        const serviceAccount = require(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to load Firebase Service Account Key:', e.message);
        try { admin.initializeApp(); } catch(err) {} 
    }
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set or file does not exist in .env. Real SMS verification will be bypassed in development mode.');
    // To prevent total crashes, try initialize with default credentials
    try { admin.initializeApp(); } catch(e) {}
}

// 2. Google Cloud Storage Initialization
// Uses GOOGLE_APPLICATION_CREDENTIALS from environment variables automatically if present
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

/** Firebase 서비스 계정이 있으면 true — 이 경우에만 클라이언트 Firebase ID 토큰 검증을 강제 */
function firebaseAdminConfigured() {
    return !!(process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)));
}

/** `verify-sms` 성공 번호 — 회원가입 시 Firebase 토큰 없이 매칭 (아래 `smsCodeStore`와 함께 유지) */
const smsVerifiedPhoneStore = new Map();
const SMS_VERIFIED_TTL_MS = 15 * 60 * 1000;

/**
 * 회원가입(`POST /api/auth/register`)·기사정보(`POST /api/driver/profile-setup`) 공통.
 * Admin 미설정: 검증 생략(로컬 개발). 설정됨: Firebase `idToken` 또는 SMS 서버 인증 완료 번호.
 */
async function verifyFirebasePhoneIdTokenIfRequired(idToken, options = {}) {
    if (!firebaseAdminConfigured()) {
        return { ok: true };
    }
    const { smsVerifiedPhone } = options;
    if (idToken && typeof idToken === 'string') {
        try {
            await admin.auth().verifyIdToken(idToken);
            return { ok: true };
        } catch (e) {
            console.error('Firebase ID token verification failed:', e.message);
            return { ok: false, error: '휴대전화 인증이 유효하지 않습니다. 다시 인증해 주세요.' };
        }
    }
    if (smsVerifiedPhone && smsVerifiedPhoneStore.has(smsVerifiedPhone)) {
        const entry = smsVerifiedPhoneStore.get(smsVerifiedPhone);
        if (entry && Date.now() <= entry.expiresAt) {
            return { ok: true };
        }
        smsVerifiedPhoneStore.delete(smsVerifiedPhone);
    }
    return { ok: false, error: '휴대전화 인증을 완료해 주세요.' };
}






function formatDateYmd(v) {
    if (v == null || v === undefined || v === '') return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 진위 검증 생략 비교용 — TB_DRIVER_INFO 기존 행 */
async function fetchDriverInfoRow(custId) {
    try {
        const [rows] = await pool.execute(
            `SELECT LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, LICENSE_EXPIRY_DT,
                    QUAL_CERT_NO, QUAL_CERT_VERIFY_STATUS
             FROM TB_DRIVER_INFO WHERE USER_ID = ?`,
            [custId]
        );
        return rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return null;
        throw e;
    }
}


async function seedBusTypeCodesIfEmpty(connection) {
    const [rows] = await connection.execute(
        `SELECT COUNT(*) AS c FROM TB_COMMON_CODE WHERE GRP_CD = 'BUS_TYPE'`
    );
    if (rows[0].c > 0) return;
    const seeds = [
        ['BUS_TYPE', 'PREMIUM_GOLD', '프리미엄 골드', '21석 최상급 프라이빗 독립 시트', 'Y', 1],
        ['BUS_TYPE', 'PRESTIGE', '우등 버스', '28석 넓은 레그룸 전용 시트', 'Y', 2],
        ['BUS_TYPE', 'NORMAL', '일반 버스', '45석 표준 시트', 'Y', 3],
        ['BUS_TYPE', 'NIGHT_PREMIUM', '심야 우등', '야간 특화 시트', 'Y', 4],
        ['BUS_TYPE', 'V_VIP', 'V-VIP', '16석 리무진', 'Y', 5]
    ];
    for (const s of seeds) {
        await connection.execute(
            `INSERT IGNORE INTO TB_COMMON_CODE (GRP_CD, DTL_CD, CD_NM_KO, CD_DESC, USE_YN, DISP_ORD) VALUES (?, ?, ?, ?, ?, ?)`,
            s
        );
    }
}



function parseDataUrlPayload(dataUrl, fileNameHint = 'file') {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) return null;
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    let ext = 'bin';
    if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    const safe = String(fileNameHint || 'file').replace(/[^a-zA-Z0-9._-가-힣]/g, '_');
    return { buffer: buf, ext, mime, orgName: safe };
}

async function insertBusFileAndHist(connection, {
    busId, fileId, category, gcsPath, buffer, orgFileNm, fileExt, fileSize, contentType
}) {
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(buffer, { metadata: { contentType: contentType || 'application/octet-stream' }, resumable: false });
    await connection.execute(
        `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [fileId, category, bucketName, gcsPath, orgFileNm, fileExt, fileSize]
    );
    const histId = generateNextNumericId('0', 10); // 10자리 숫자
    await connection.execute(
        `INSERT INTO TB_BUS_DRIVER_VEHICLE_FILE_HIST (HIST_ID, BUS_ID, FILE_ID, FILE_CATEGORY, REG_DT)
         VALUES (?, ?, ?, ?, NOW())`,
        [histId, busId, fileId, category]
    );
}


async function fetchBusRowForUser(connection, custId) {
    const [rows] = await connection.execute(
        `SELECT BUS_ID AS busId, CUST_ID AS custId,
                VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS,
                DATE_FORMAT(LAST_INSPECT_DT, '%Y-%m-%d') AS lastInspectDt,
                DATE_FORMAT(INSURANCE_EXP_DT, '%Y-%m-%d') AS insuranceExpDt,
                BIZ_REG_FILE_ID AS bizRegId,
                TRANS_LIC_FILE_ID AS transLicId,
                INS_CERT_FILE_ID AS insCertId,
                VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ? LIMIT 1`,
        [custId]
    );
    return rows[0] || null;
}

async function fileMetaById(connection, fileId) {
    if (!fileId) return null;
    const [rows] = await connection.execute(
        `SELECT FILE_ID AS fileId, ORG_FILE_NM, FILE_EXT, FILE_SIZE
         FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
        [fileId]
    );
    return rows[0] || null;
}

/** 기사 소유 차량에 연결된 파일만 스트리밍 허용 */
/** TB_DRIVER_DOCS 소유 확인 */
async function canAccessQualCertFile(connection, custId, fileId) {
    if (!custId || !fileId) return false;
    const [rows] = await connection.execute(
        `SELECT 1 FROM TB_DRIVER_DOCS
         WHERE CUST_ID = ? AND FILE_ID = ? LIMIT 1`,
        [custId, fileId]
    );
    return rows.length > 0;
}

async function canAccessBusFile(connection, custId, fileId) {
    const [buses] = await connection.execute(
        `SELECT BUS_ID, BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID, VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?`,
        [custId]
    );
    for (const b of buses) {
        if (b.BIZ_REG_FILE_ID === fileId || b.TRANS_LIC_FILE_ID === fileId || b.INS_CERT_FILE_ID === fileId) return true;
        let photos = b.VEHICLE_PHOTOS_JSON;
        if (typeof photos === 'string') {
            try { photos = JSON.parse(photos); } catch (e) { photos = []; }
        }
        if (Array.isArray(photos) && photos.some((p) => String(p) === String(fileId))) return true;
    }
    const [hist] = await connection.execute(
        `SELECT 1 FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h
         INNER JOIN TB_BUS_DRIVER_VEHICLE b ON b.BUS_ID = h.BUS_ID AND b.CUST_ID = ?
         WHERE h.FILE_ID = ? LIMIT 1`,
        [custId, fileId]
    );
    return hist.length > 0;
}

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------

// API 1-0: 아이디 중복 검사
app.get('/api/auth/check-id', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query; // 사용자가 입력한 아이디
        if (!userId) return res.status(400).json({ error: 'userId(Login ID) query parameter is required' });

        connection = await pool.getConnection();
        
        // USER_ID 컬럼에서 중복 체크
        const [rows] = await connection.execute('SELECT USER_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        
        if (rows.length > 0) {
            return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 아이디입니다.' });
        }
        return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
        console.error('❌ [ID_CHECK_ERROR]', error);
        res.status(500).json({
            error: '아이디 중복 확인 중 서버 오류가 발생했습니다.',
            detail: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// API 1-2: 전화번호 중복 검사
app.get('/api/auth/check-phone', async (req, res) => {
    let connection;
    try {
        const { phoneNo } = req.query;
        if (!phoneNo) return res.status(400).json({ error: 'phoneNo query parameter is required' });

        connection = await pool.getConnection();
        
        // [보안] 휴대폰 번호는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await connection.execute('SELECT HP_NO FROM TB_USER');
        const isDuplicate = rows.some((row) => {
            try {
                return decrypt(row.HP_NO) === phoneNo;
            } catch (e) {
                return false;
            }
        });
        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 가입된 휴대폰 번호입니다.' });
        }
        return res.status(200).json({ isAvailable: true });
    } catch (error) {
        console.error('Check phone error:', error.code || error.message, error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ isAvailable: true });
        }
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            detail: process.env.NODE_ENV !== 'production' ? String(error.message) : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// ── SMS 인증 코드 인메모리 저장소 (개발용, 실운영시 Redis 권장) ──────────────
const smsCodeStore = new Map(); // key: phoneNumber, value: { code, expiresAt }

// API 1-3: SMS 인증번호 전송
app.post('/api/auth/send-sms', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });
        const cleaned = phoneNumber.replace(/-/g, '');
        if (!/^01[016789]\d{7,8}$/.test(cleaned)) {
            return res.status(400).json({ error: '올바른 휴대폰 번호 형식이 아닙니다.' });
        }

        // 개발 모드: 고정 인증번호 123456 사용
        const code = '123456';
        const expiresAt = Date.now() + 3 * 60 * 1000; // 3분
        smsCodeStore.set(cleaned, { code, expiresAt });

        console.log(`[SMS] 인증번호 발송 (개발모드): ${cleaned} → ${code}`);

        // TODO: 실 운영시 Firebase Admin SMS 또는 외부 SMS API 연동
        // const message = { text: `[busTaams] 인증번호: ${code}`, phone: `+82${cleaned.slice(1)}` };

        return res.status(200).json({ message: `인증번호가 전송되었습니다. (개발모드: ${code})` });

    } catch (error) {
        console.error('SMS 전송 에러:', error.message);
        res.status(500).json({ error: 'SMS 전송 중 오류가 발생했습니다.' });
    }
});

// API 1-4: SMS 인증번호 확인
app.post('/api/auth/verify-sms', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) return res.status(400).json({ error: '휴대폰 번호와 인증번호를 입력해주세요.' });
        const cleaned = phoneNumber.replace(/-/g, '');

        const stored = smsCodeStore.get(cleaned);
        if (!stored) return res.status(400).json({ verified: false, error: '인증번호를 먼저 요청해주세요.' });
        if (Date.now() > stored.expiresAt) {
            smsCodeStore.delete(cleaned);
            return res.status(400).json({ verified: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
        }
        if (stored.code !== code.trim()) {
            return res.status(400).json({ verified: false, error: '인증번호가 일치하지 않습니다.' });
        }

        smsCodeStore.delete(cleaned); // 사용 후 삭제
        smsVerifiedPhoneStore.set(cleaned, { expiresAt: Date.now() + SMS_VERIFIED_TTL_MS });
        console.log(`[SMS] 인증 성공: ${cleaned}`);
        return res.status(200).json({ verified: true, message: '휴대폰 인증이 완료되었습니다.' });

    } catch (error) {
        console.error('SMS 인증 에러:', error.message);
        res.status(500).json({ error: 'SMS 인증 중 오류가 발생했습니다.' });
    }
});


// API 2: 최신 약관 목록 조회
app.get('/api/terms/active', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_TERMS_MASTER ORDER BY TERMS_ID ASC');
        if (rows.length > 0) {
            res.status(200).json({ status: 200, data: rows });
        } else {
            // DB에 데이터가 없어서 반환하는 Fallback Dummy Data (개발용)
            res.status(200).json({
                status: 200,
                data: [
                    { termsId: 1, type: "SVC", title: "통합이용약관", isRequired: "Y" },
                    { termsId: 2, type: "PRIVACY", title: "개인정보 처리방침", isRequired: "Y" },
                    { termsId: 3, type: "LOCATION", title: "위치정보 이용약관", isRequired: "Y" },
                    { termsId: 4, type: "MKT", title: "마케팅 정보 수신 동의서", isRequired: "N" },
                    { termsId: 5, type: "DRIVER", title: "파트너(기사님) 입점 계약서", isRequired: "Y" }
                ]
            });
        }
    } catch (error) {
        console.error('Terms fetch error (Will return dummy data for dev):', error.message);
        res.status(200).json({
            status: 200,
            data: [
                { termsId: 1, type: "SVC", title: "통합이용약관", isRequired: "Y" },
                { termsId: 2, type: "PRIVACY", title: "개인정보 처리방침", isRequired: "Y" },
                { termsId: 3, type: "LOCATION", title: "위치정보 이용약관", isRequired: "Y" },
                { termsId: 4, type: "MKT", title: "마케팅 정보 수신 동의서", isRequired: "N" },
                { termsId: 5, type: "DRIVER", title: "파트너(기사님) 입점 계약서", isRequired: "Y" }
            ]
        });
    }
});

// API 3: 회원 가입 및 서명 최종 전송 (Transaction)
app.post('/api/auth/register', async (req, res) => {
    let connection;
    let uploadedFiles = []; // 롤백을 위한 업로드 파일 목록
    try {
        const {
            userId, email, password, userName, phoneNo, userType,
            firebaseIdToken, mktAgreeYn, signatureBase64, agreedTerms,
            recomCode
        } = req.body;

        if (!userId || !password || !userName || !phoneNo || !signatureBase64 || !agreedTerms || !userType) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        // 1. [보안] 휴대폰 인증 확인
        const cleanedPhoneForVerify = String(phoneNo).replace(/-/g, '');
        const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(firebaseIdToken, {
            smsVerifiedPhone: cleanedPhoneForVerify,
        });
        if (!phoneVerify.ok) {
            return res.status(400).json({ error: phoneVerify.error });
        }
        const smsAuthYn = 'Y';

        // 2. 비밀번호 해싱
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. DB 트랜잭션 준비
        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 3-1. [ID 생성] 10자리 숫자 ID (CUST_ID)
            const [maxUserRows] = await connection.execute('SELECT MAX(CUST_ID) as maxId FROM TB_USER');
            const nextCustId = generateNextNumericId(maxUserRows[0].maxId || '0', 10);

            // 3-2. [ID 생성] 20자리 숫자 ID (FILE_ID for Signature)
            const [maxFileRows] = await connection.execute("SELECT MAX(FILE_ID) as maxFileId FROM TB_FILE_MASTER WHERE FILE_ID REGEXP '^[0-9]+$'");
            const nextFileId = generateNextNumericId(maxFileRows[0].maxFileId || '0', 20);

            // UserType Mapping
            let mappedUserType = 'TRAVELER';
            if (userType === 'CONSUMER' || userType === 'TRAVELER') mappedUserType = 'TRAVELER';
            else if (userType === 'SALES' || userType === 'SALESPERSON' || userType === 'PARTNER') mappedUserType = 'PARTNER';
            else if (userType === 'DRIVER') mappedUserType = 'DRIVER';

            // [DB] TB_USER INSERT
            const userQuery = `
                INSERT INTO TB_USER (
                    CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                    SMS_AUTH_YN, USER_TYPE, RECOM_CODE, SIGNATURE_FILE_ID,
                    JOIN_DT, USER_STAT, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, 'NONE', 'Y', ?, ?, ?, NOW(), 'ACTIVE', NOW(), ?)
            `;
            await connection.execute(userQuery, [
                nextCustId, 
                userId, 
                email, 
                hashedPassword, 
                userName, 
                phoneNo,
                mappedUserType, 
                mappedUserType === 'DRIVER' ? recomCode : null,
                nextFileId,
                nextCustId
            ]);

            // 4. 전자 서명 이미지 처리 (GCS & TB_FILE_MASTER)
            const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileNameWithoutExt = nextFileId; // 파일ID명을 파일명으로 사용
            const fileExt = 'png';
            const fileName = `${fileNameWithoutExt}.${fileExt}`;
            const gcsPathForDB = `https://storage.googleapis.com/${bucketName}/signatures/${nextFileId}`;
            const actualGcsPath = `signatures/${fileName}`;
            const gcsFile = bucket.file(actualGcsPath);
            
            // GCS 업로드
            await gcsFile.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
            uploadedFiles.push(gcsFile);

            // [DB] TB_FILE_MASTER INSERT
            await connection.execute(`
                INSERT INTO TB_FILE_MASTER (
                    FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                    ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, 'SIGNATURE', ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
            `, [nextFileId, bucketName, gcsPathForDB, fileNameWithoutExt, fileExt, buffer.length, nextCustId, nextCustId]);

            // 5. 약관 동의 이력 저장 (TB_USER_TERMS_HIST)
            const termsMapping = {
                1: 'SERVICE',
                2: 'PRIVACY',
                3: 'MARKETING',
                4: mappedUserType === 'DRIVER' ? 'DRIVER_SERVICE' : 
                   mappedUserType === 'PARTNER' ? 'PARTNER_CONTRACT' : 'TRAVELER_SERVICE'
            };

            let termSeq = 1;
            for (const termId of agreedTerms) {
                const termsType = termsMapping[termId];
                if (!termsType) continue;

                // 마케팅 동의일 경우 관련 플래그들을 'Y'로 설정
                const isMarketing = (termsType === 'MARKETING');
                const mktVal = isMarketing ? 'Y' : 'N';

                await connection.execute(`
                    INSERT INTO TB_USER_TERMS_HIST (
                        CUST_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, 
                        AGREE_YN, MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN,
                        SIGN_FILE_ID, AGREE_DT
                    ) VALUES (?, ?, ?, '1.0', 'Y', ?, ?, ?, ?, ?, NOW())
                `, [nextCustId, termSeq++, termsType, mktVal, mktVal, mktVal, mktVal, nextFileId]);
            }

            await connection.commit();
            smsVerifiedPhoneStore.delete(cleanedPhoneForVerify);

            // [알림톡] 발송
            try {
                await sendAlimTalkAndLog({
                    receiverId: nextCustId,
                    receiverPhone: phoneNo,
                    category: 'JOIN',
                    content: `[busTaams] ${userName}님, 회원가입을 감사드립니다. 고품격 버스 여행의 시작, busTaams와 함께하세요!`
                });
            } catch (alimError) {
                console.error('AlimTalk Error (Ignored):', alimError.message);
            }

            res.status(201).json({ message: "회원가입 완료", userId, custId: nextCustId });

        } catch (dbError) {
            console.error('❌ [REGISTER_DB_ERROR]', dbError);
            if (connection) await connection.rollback();
            
            // 업로드된 파일들 롤백
            for (const f of uploadedFiles) {
                f.delete().catch(() => {});
            }

            res.status(500).json({ 
                error: '데이터베이스 저장 중 오류가 발생했습니다.', 
                detail: dbError.message 
            });
        } finally {
            if (connection) connection.release();
        }

    } catch (error) {
        console.error('❌ [REGISTER_SYSTEM_ERROR]', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: '이미 존재하는 사용자입니다.' });
        }
        res.status(500).json({ error: '시스템 오류가 발생했습니다.' });
    }
});
 
// 로그인 API (POST /api/auth/login 또는 /api/users/login - 팀원 호환성 유지용 별칭)
app.post(['/api/auth/login', '/api/users/login'], async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        // USER_ID(평문)로 사용자 조회
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // [신규] 취소 관리 및 구독 정보 조회 (CUST_ID 기반)
        const custId = user.CUST_ID;
        const [cancelRow, subscriptionRow] = await Promise.all([
            fetchCancelManageForUser(pool, user),
            user.USER_TYPE === 'DRIVER' ? fetchSubscriptionForDriver(pool, custId) : Promise.resolve(null)
        ]);

        // [신규] DTO 생성 (복호화 및 구조화된 데이터 포함)
        const userDto = buildPostLoginUserDto({
            user,
            cancelRow,
            subscriptionRow
        });

        res.status(200).json({
            message: '로그인 성공',
            user: userDto
        });

    } catch (error) {
        console.error('로그인 에러:', error ? error.stack : 'Unknown error');
        res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다.', details: error ? error.toString() : 'Unknown error' });
    }
});

// 사용자 통합 정보 수정 API (이메일, 휴대폰, 비밀번호)
app.put('/api/user/profile', async (req, res) => {
    try {
        const { custId, email, phoneNo, currentPassword, newPassword } = req.body;
        console.log(`\n[STEP 1] Update Request Received: CUST_ID=${custId}`);

        if (!custId || !currentPassword) {
            console.log('[STEP 2] Validation Failed: Missing custId or currentPassword');
            return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
        }

        // 1. 사용자 확인
        console.log('[STEP 3] Fetching user from DB...');
        let [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ?', [custId]);
        if (userRows.length === 0) {
            console.log('[STEP 3-ALT] Trying USER_ID search...');
            [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [custId]);
        }
        
        if (userRows.length === 0) {
            console.log('[STEP 4] User Not Found');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = userRows[0];
        console.log(`[STEP 5] Comparing Password for ${user.USER_NM}...`);
        const isMatch = await bcrypt.compare(currentPassword, user.PASSWORD);
        if (!isMatch && currentPassword !== user.PASSWORD) {
            console.log('[STEP 6] Password Mismatch');
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        // 2. 동적 쿼리 생성
        console.log('[STEP 7] Building Dynamic Query...');
        const updateParts = [];
        const params = [];

        if (email !== undefined) { updateParts.push('EMAIL = ?'); params.push(email); }
        if (phoneNo !== undefined) { updateParts.push('HP_NO = ?'); params.push(phoneNo); }

        if (newPassword && String(newPassword).trim() !== '') {
            console.log('[STEP 8] Hashing New Password...');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateParts.push('PASSWORD = ?');
            params.push(hashedPassword);
        }

        updateParts.push('MOD_DT = NOW()');
        updateParts.push('MOD_ID = ?');
        params.push(custId || user.CUST_ID);

        const query = `UPDATE TB_USER SET ${updateParts.join(', ')} WHERE CUST_ID = ?`;
        params.push(user.CUST_ID);

        console.log('[STEP 9] Executing Update Query...');
        const [result] = await pool.execute(query, params);
        console.log(`[STEP 10] Update Success: affectedRows=${result.affectedRows}`);

        res.status(200).json({ message: '성공적으로 처리되었습니다.' });
    } catch (error) {
        const errorDetail = `
[${new Date().toISOString()}] Update Profile Error:
Message: ${error.message}
Stack: ${error.stack}
Payload: ${JSON.stringify(req.body)}
--------------------------------------------------
`;
        fs.appendFileSync(path.join(__dirname, 'server_error.log'), errorDetail);
        console.error('[DEBUG] Update Profile Error (logged to file):', error.message);
        res.status(500).json({ error: '정보 업데이트 중 서버 오류가 발생했습니다.', details: error.message });
    }
});

// 비밀번호 변경 API
app.put('/api/user/password', async (req, res) => {
    try {
        const { custId, currentPassword, newPassword, confirmPassword } = req.body;
        if (!custId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: '필수 비밀번호 정보가 누락되었습니다.' });
        }

        // 1. 현재 사용자 조회 (현재 비밀번호 가져오기)
        const [rows] = await pool.execute('SELECT PASSWORD FROM TB_USER WHERE CUST_ID = ?', [custId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];

        // 2. 현재 비밀번호 검증 (최우선 순위)
        const isMatch = await bcrypt.compare(currentPassword, user.PASSWORD);
        if (!isMatch) {
            return res.status(401).json({ error: '현재 비밀번호가 정확하지 않습니다.' });
        }

        // 3. 새 비밀번호 일치 여부 (현재 비밀번호가 맞을 경우에만 체크)
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: '새 비밀번호와 확인 비밀번호가 서로 일치하지 않습니다.' });
        }

        // 3. 새 비밀번호 해싱 및 업데이트
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = 'UPDATE TB_USER SET PASSWORD = ? WHERE CUST_ID = ?';
        await pool.execute(updateQuery, [hashedPassword, custId]);

        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ error: '비밀번호 변경 중 서버 오류가 발생했습니다.' });
    }
});

// 기사님 프로필 저장/수정 API (POST /api/driver/profile)
app.post('/api/driver/profile', async (req, res) => {
    try {
        const {
            userId, licenseNo, profileImgBase64, licenseImgBase64,
            accidentFreeDoc, membershipType, bioDesc
        } = req.body;

        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }

        let profileImgUrl = '';
        let licenseImgUrl = '';

        // 1. 프로필 이미지 업로드 (Base64 -> GCS)
        if (profileImgBase64 && profileImgBase64.startsWith('data:image')) {
            const base64Data = profileImgBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `profile/${userId}_${Date.now()}.png`;
            const file = bucket.file(`certificates/${fileName}`);
            await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
            profileImgUrl = `https://storage.googleapis.com/${bucketName}/certificates/${fileName}`;
        }

        // 2. 면허증 이미지 업로드 (Base64 -> GCS)
        if (licenseImgBase64 && licenseImgBase64.startsWith('data:image')) {
            const base64Data = licenseImgBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `bus_licenses/${userId}_${Date.now()}.png`;
            const file = bucket.file(`certificates/${fileName}`);
            await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
            licenseImgUrl = `https://storage.googleapis.com/${bucketName}/certificates/${fileName}`;
        }

        // 3. DB 작업 (Transaction)
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
            let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';

            if (profileImgUrl) {
                const profileFileId = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = profileFileId;

                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID
                    ) VALUES (?, 'PROFILE_IMG', ?, ?, ?, 'png', 0, NOW(), ?)
                `;
                const profileGcsPath = profileImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [profileFileId, bucketName, profileGcsPath, 'profile.png', userId]); // 여기서 userId는 프론트엔드에서 넘어온 CUST_ID임
            }

            if (licenseImgUrl) {
                const licenseFileId = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = licenseFileId;

                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID
                    ) VALUES (?, 'DRIVER_LICENSE', ?, ?, ?, 'png', 0, NOW(), ?)
                `;
                const licenseGcsPath = licenseImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [licenseFileId, bucketName, licenseGcsPath, 'license.png', userId]);
            }

            const query = `
                INSERT INTO TB_DRIVER_DETAIL (
                    USER_ID, LICENSE_NO, CERT_PHOTO_URL, ACCIDENT_FREE_DOC,
                    MEMBERSHIP_TYPE, BIO_DESC, PROFILE_IMG_URL, REG_ID, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    LICENSE_NO = VALUES(LICENSE_NO),
                    CERT_PHOTO_URL = IF(VALUES(CERT_PHOTO_URL) != '', VALUES(CERT_PHOTO_URL), CERT_PHOTO_URL),
                    ACCIDENT_FREE_DOC = VALUES(ACCIDENT_FREE_DOC),
                    MEMBERSHIP_TYPE = VALUES(MEMBERSHIP_TYPE),
                    BIO_DESC = VALUES(BIO_DESC),
                    PROFILE_IMG_URL = IF(VALUES(PROFILE_IMG_URL) != '', VALUES(PROFILE_IMG_URL), PROFILE_IMG_URL),
                    MOD_ID = VALUES(MOD_ID)
            `;

            const params = [
                userId, 
                licenseNo || '', 
                licenseImgUrl, 
                accidentFreeDoc || '',
                membershipType || 'NORMAL', 
                bioDesc || '', 
                profileImgUrl,
                userId, // REG_ID (여기서 userId는 프론트엔드에서 넘어온 CUST_ID)
                userId  // MOD_ID
            ];

            await connection.execute(query, params);
            await connection.commit();

            res.status(200).json({ 
                message: '기사님 프로필이 성공적으로 저장되었습니다.',
                profileImgUrl,
                licenseImgUrl
            });
        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('기사 프로필 저장 에러:', error);
        res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' });
    }
});
 
// API: 기사 프로필 조회 (폼 채우기)
app.get('/api/driver/profile-setup', async (req, res) => {
    try {
        const { custId } = req.query;
        if (!custId) return res.status(400).json({ error: 'custId is required' });

        const [uRows] = await pool.execute(
            `SELECT USER_NM, HP_NO FROM TB_USER WHERE CUST_ID = ?`,
            [custId]
        );
        if (!uRows.length) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });

        const u = uRows[0];
        let userName = '';
        let phoneNo = '';
        try {
            userName = u.USER_NM ? decrypt(u.USER_NM) : '';
        } catch (_) {
            userName = '';
        }
        try {
            phoneNo = u.HP_NO ? decrypt(u.HP_NO) : '';
        } catch (_) {
            phoneNo = '';
        }

        let dRows;
        try {
            const [dr] = await pool.execute(
                `SELECT RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, LICENSE_EXPIRY_DT,
                        QUAL_CERT_NO, BIO_TEXT,
                        IFNULL(QUAL_CERT_VERIFY_STATUS, 'UNVERIFIED') AS QUAL_CERT_VERIFY_STATUS,
                        QUAL_CERT_VERIFY_DT,
                        PROFILE_PHOTO_ID,
                        QUAL_CERT_FILE_ID
                 FROM TB_DRIVER_INFO WHERE USER_ID = ?`,
                [custId]
            );
            dRows = dr;
        } catch (e) {
            if (e.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ exists: false, userName, phoneNo });
            }
            throw e;
        }

        if (!dRows.length) {
            return res.json({ exists: false, userName, phoneNo });
        }

        const d = dRows[0];
        let rrnFront = '';
        let rrnBack = '';
        try {
            const plain = d.RRN_ENC ? decrypt(d.RRN_ENC) : '';
            const parts = String(plain).trim().split('-');
            if (parts.length >= 2 && parts[0].length === 6) {
                rrnFront = parts[0];
                rrnBack = String(parts[1]).charAt(0) || '';
            }
        } catch (_) {
            /* ignore */
        }

        return res.json({
            exists: true,
            userName,
            phoneNo,
            rrnFront,
            rrnBack,
            licenseType: d.LICENSE_TYPE || '',
            licenseNo: d.LICENSE_NO || '',
            licenseSerialNo: d.LICENSE_SERIAL_NO || '',
            licenseIssueDt: formatDateYmd(d.LICENSE_ISSUE_DT),
            licenseExpiryDt: formatDateYmd(d.LICENSE_EXPIRY_DT),
            qualCertNo: d.QUAL_CERT_NO || '',
            bioText: d.BIO_TEXT || '',
            hasProfilePhoto: !!d.PROFILE_PHOTO_ID,
            profilePhotoId: d.PROFILE_PHOTO_ID || null,
            hasQualCertFile: !!d.QUAL_CERT_FILE_ID,
            qualCertFileId: d.QUAL_CERT_FILE_ID || null,
            qualCertVerifyStatus: d.QUAL_CERT_VERIFY_STATUS || 'UNVERIFIED',
            qualCertVerifyDt: d.QUAL_CERT_VERIFY_DT
                ? new Date(d.QUAL_CERT_VERIFY_DT).toISOString()
                : null
        });
    } catch (error) {
        console.error('GET driver profile-setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

/** GCS 파일 ID를 통한 이미지 데이터 확인 */
app.get('/api/driver/profile-photo', async (req, res) => {
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });

        const [rows] = await pool.execute(
            `SELECT PROFILE_PHOTO_ID FROM TB_DRIVER_INFO
             WHERE USER_ID = ? AND PROFILE_PHOTO_ID = ?`,
            [custId, fileId]
        );
        if (!rows.length) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [fRows] = await pool.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (!fRows.length) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = fRows[0];

        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || 'png').toLowerCase();
        const ctMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const ct = ctMap[ext] || 'image/png';

        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'profile')}`);
        res.setHeader('Cache-Control', 'private, max-age=300');
        gcsFile.createReadStream()
            .on('error', (err) => { console.error('GCS profile-photo stream:', err); if (!res.headersSent) res.status(500).end(); })
            .pipe(res);
    } catch (error) {
        console.error('GET driver profile-photo error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 견적 요청 저장 (POST /api/auction/request)
app.post('/api/auction/request', async (req, res) => {
    let connection;
    try {
        const {
            custId, userId, tripTitle, startAddr, endAddr, startDt, endDt,
            passengerCnt, totalAmount, waypoints, vehicles
        } = req.body;

        console.log('--- BUS REGISTRATION START ---');
        console.log('REQ_BODY:', JSON.stringify(req.body, null, 2));

        if (!custId || !tripTitle || !startAddr || !endAddr || !startDt || !endDt) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Helper to trim address to City/District
            const trimAddress = (addr) => {
                if (!addr || typeof addr !== 'string') return '';
                return addr.trim().split(/\s+/).slice(0, 2).join(' ');
            };

            const [maxReqRows] = await connection.execute('SELECT MAX(REQ_ID) as maxId FROM TB_AUCTION_REQ');
            const reqId = generateNextNumericId(maxReqRows[0].maxId);
            
            const secureRegId = String(custId || 'unknown').substring(0, 10);
            
            // 1. TB_AUCTION_REQ (Master) Insert
            // END_ADDR should be the Destination (ROUND_TRIP) in waypoints
            const destWp = waypoints && waypoints.find(wp => wp.type === 'ROUND_TRIP');
            const targetEndAddr = destWp ? (destWp.address || destWp.addr) : endAddr;

            const masterQuery = `
                INSERT INTO TB_AUCTION_REQ (
                    REQ_ID, TRAVELER_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                    START_DT, END_DT, PASSENGER_CNT, DATA_STAT, EXPIRE_DT, 
                    REQ_AMT, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (
                    ?, ?, ?, ?, ?, 
                    ?, ?, ?, 'AUCTION', DATE_SUB(?, INTERVAL 1 DAY), 
                    ?, NOW(), ?, NOW(), ?
                )
            `;
            
            await connection.execute(masterQuery, [
                reqId, 
                custId, 
                tripTitle, 
                trimAddress(startAddr), 
                trimAddress(targetEndAddr),
                startDt, 
                endDt, 
                passengerCnt || 0, 
                startDt,
                totalAmount || 0, 
                secureRegId,
                secureRegId // MOD_ID
            ]);

            // 2. TB_AUCTION_REQ_BUS (Vehicles) Insert
            if (vehicles && vehicles.length > 0) {
                const busQuery = `
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, 
                        FUEL_COST, TOLLS_AMT, RES_BUS_AMT,
                        RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                        REG_DT, REG_ID, MOD_DT, MOD_ID, DATA_STAT
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, 'AUCTION')
                `;
                
                let busSeq = 1;
                for (const bus of vehicles) {
                    const qty = bus.qty || 0;
                    const finalPrice = Number(bus.price) || 0;
                    const fuelCost = Number(bus.fuelCost) || 0;
                    const tollsAmt = 0; // 향후 자동계산 로직 추가 가능

                    for (let i = 0; i < qty; i++) {
                        const totalFee = Math.floor(finalPrice * 0.066);
                        const refundFee = Math.floor(finalPrice * 0.055);
                        const attributionFee = totalFee - refundFee;

                        await connection.execute(busQuery, [
                            reqId, 
                            busSeq++, 
                            bus.type, 
                            fuelCost,
                            tollsAmt,
                            finalPrice,
                            totalFee, 
                            refundFee, 
                            attributionFee, 
                            secureRegId,
                            secureRegId
                        ]);
                    }
                }
            }

            // 3. TB_AUCTION_REQ_VIA (Unified Path) Insert
            const viaQuery = `
                INSERT INTO TB_AUCTION_REQ_VIA (
                    REQ_ID, VIA_SEQ, VIA_ADDR, VIA_TYPE, STOP_TIME_MIN, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
            `;
            
            let viaSeq = 1;
            let currentOrd = 1;
            if (waypoints && waypoints.length > 0) {
                for (let i = 0; i < waypoints.length; i++) {
                    const wp = waypoints[i];
                    
                    let forcedType = wp.type || 'START_WAY';
                    if (currentOrd === 1) forcedType = 'START_NODE';
                    else if (forcedType === 'START_NODE') forcedType = 'START_WAY';

                    const addr = wp.address || wp.addr;
                    
                    console.log(`[VIA_INSERT] Ord: ${currentOrd}, Type: ${forcedType}, Addr: ${addr}`);

                    await connection.execute(viaQuery, [
                        reqId, 
                        viaSeq++, 
                        addr, 
                        forcedType, 
                        wp.stopTime || 0, 
                        secureRegId,
                        secureRegId // MOD_ID
                    ]);
                    currentOrd++;
                }
            }

            await connection.commit();
            res.status(201).json({ message: '견적 요청이 성공적으로 등록되었습니다.', reqId });

            // [비동기] 해당 종류의 버스를 소유한 모든 기사님께 알림톡 발송 및 로그 기록
            (async () => {
                try {
                // 1. 등록한 고객의 성함 조회
                const [uRows] = await pool.execute('SELECT USER_NM FROM TB_USER WHERE CUST_ID = ?', [custId]);
                let userName = '고객님';
                if (uRows.length > 0) {
                    userName = uRows[0].USER_NM;
                }

                    // 2. 해당 차종을 보유한 기사님들의 연락처 정보 조회
                    const busTypes = vehicles.filter(v => v.qty > 0).map(v => v.type);
                    if (busTypes.length === 0) return;

                    const [drivers] = await pool.query(`
                        SELECT DISTINCT u.USER_ID as driverId, u.HP_NO 
                        FROM TB_USER u
                        INNER JOIN TB_BUS_DRIVER_VEHICLE v ON u.USER_ID = v.USER_ID COLLATE utf8mb4_unicode_ci
                        WHERE v.SERVICE_CLASS IN (?) AND u.USER_TYPE = 'DRIVER' AND u.USER_STAT = 'ACTIVE'
                    `, [busTypes]);

                    // 3. 각 기사님께 알림톡 발송 및 이력 저장
                    for (const driver of drivers) {
                        const alimContent = `[busTaams] 신규 견적 요청 알림\n\n` +
                                            `■ 여정명: ${tripTitle}\n` +
                                            `■ 출발지: ${startAddr}\n` +
                                            `■ 도착지: ${targetEndAddr}\n` +
                                            `■ 요청차량: ${busTypes.join(', ')}\n\n` +
                                            `해당 차량의 새로운 견적 요청이 등록되었습니다. 지금 앱에서 확인 후 바로 입찰에 참여해 보세요!`;
                        
                        await sendAlimTalkAndLog({
                            reqId,
                            receiverId: driver.driverId,
                            receiverPhone: driver.HP_NO,
                            content: alimContent,
                            category: 'REQ_REG'
                        });
                    }
                } catch (alimErr) {
                    console.error('Background AlimTalk sending error:', alimErr);
                }
            })();

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Auction Request Error:', error);
        res.status(500).json({ error: '견적 요청 저장 중 오류가 발생했습니다.' });
    }
});

// 최근 견적 요청 조회 (GET /api/auction/recent/:custId)
app.get('/api/auction/recent/:custId', async (req, res) => {
    try {
        const { custId } = req.params;
        if (!custId) {
            return res.status(400).json({ error: 'custId is required' });
        }

        const query = `
            SELECT 
                REQ_ID, 
                TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, DATA_STAT, REQ_AMT
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_ID = ? 
            ORDER BY REG_DT DESC 
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(query, [custId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: '최근 요청이 없습니다.' });
        }

        const recent = rows[0];

        // 차량 정보 가져오기
        const busQuery = `
            SELECT BUS_TYPE_CD
            FROM TB_AUCTION_REQ_BUS 
            WHERE REQ_ID = ?
        `;
        const [buses] = await pool.execute(busQuery, [recent.REQ_ID]);
        recent.vehicles = buses;

        // 경유지 정보 가져오기
        const viaQuery = `
            SELECT VIA_ADDR as address, VIA_SEQ 
            FROM TB_AUCTION_REQ_VIA 
            WHERE REQ_ID = ? 
            ORDER BY VIA_SEQ ASC
        `;
        const [vias] = await pool.execute(viaQuery, [recent.REQ_ID]);
        recent.waypoints = vias;

        res.status(200).json(recent);

    } catch (error) {
        console.error('Fetch Recent Request Error:', error);
        res.status(500).json({ error: '최근 요청 조회 중 오류가 발생했습니다.' });
    }
});

// 사용자의 모든 견적 요청 목록 조회 (GET /api/auction/user/:custId)
app.get('/api/auction/user/:custId', async (req, res) => {
    try {
        const { custId } = req.params;
        if (!custId) {
            return res.status(400).json({ error: 'custId is required' });
        }

        const query = `
            SELECT 
                r.REQ_ID, 
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, 
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REQ_AMT,
                (SELECT GROUP_CONCAT(CONCAT(BUS_TYPE_CD, ':', CAST(COALESCE(RES_BUS_AMT, RES_FEE_TOTAL_AMT, 0) AS CHAR))) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM')) as ALL_BUS_TYPES,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM')) as TOTAL_BUS_CNT,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY' ORDER BY VIA_SEQ ASC LIMIT 1) as VIA_START_ADDR,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' ORDER BY VIA_SEQ ASC LIMIT 1) as VIA_END_ADDR
            FROM TB_AUCTION_REQ r
            WHERE r.TRAVELER_ID = ? 
              AND r.DATA_STAT NOT IN ('DONE', 'TRAVELER_CANCEL')
              AND r.START_DT > NOW()
              AND EXISTS (
                  SELECT 1 FROM TB_AUCTION_REQ_BUS 
                  WHERE REQ_ID = r.REQ_ID 
                    AND DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM')
              )
            ORDER BY r.REG_DT DESC
        `;
        
        const [rows] = await pool.execute(query, [custId]);
        
        // 각 예약 건의 경유지 정보 추가
        for (let row of rows) {
            const viaQuery = `
                SELECT VIA_ADDR as address, VIA_SEQ 
                FROM TB_AUCTION_REQ_VIA 
                WHERE REQ_ID = ? 
                ORDER BY VIA_SEQ ASC
            `;
            const [vias] = await pool.execute(viaQuery, [row.REQ_ID]);
            row.waypoints = vias;
        }

        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch User Requests Error:', error);
        res.status(500).json({ error: '사용자 예약 내역 조회 중 오류가 발생했습니다.' });
    }
});

// 특정 예약 요청에 속한 버스 목록 조회 (있는 그대로)
app.get('/api/auction/req-buses/:reqId', async (req, res) => {
    try {
        const { reqId } = req.params;
        const [rows] = await pool.execute(
            `SELECT 
                BUS_TYPE_CD, 
                RES_BUS_AMT as UNIT_REQ_AMT, 
                DATA_STAT as BUS_STAT 
             FROM TB_AUCTION_REQ_BUS 
             WHERE REQ_ID = ? AND DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM')`,
            [reqId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Fetch Req Buses Error:', error);
        res.status(500).json({ error: '버스 목록 조회 중 오류가 발생했습니다.' });
    }
});

// 사용자의 확정된 예약 목록 조회 (GET /api/auction/confirmed/:custId)
app.get('/api/auction/confirmed/:custId', async (req, res) => {
    let connection;
    try {
        const { custId } = req.params;
        if (!custId) return res.status(400).json({ error: 'custId is required' });

        connection = await pool.getConnection();
        
        // 사용자의 '확정된' 예약 목록 조회 (TB_AUCTION_REQ 기반, DATA_STAT = 'CONFIRM')
        // REQ_STAT이 'CONFIRM'인 경우만 도출 (요구사항 0)
        const masterQuery = `
            SELECT 
                r.REQ_ID, 
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, 
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REQ_AMT
            FROM TB_AUCTION_REQ r
            WHERE r.TRAVELER_ID = ?
              AND r.DATA_STAT = 'CONFIRM'
              AND r.START_DT >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            ORDER BY r.REG_DT DESC
        `;
        
        const [masters] = await connection.execute(masterQuery, [custId]);
        
        // 2. 각 여정별로 포함된 모든 확정 차량 상세 정보 가져오기
        for (let master of masters) {
            const busQuery = `
                SELECT 
                    ab.REQ_ID,
                    ab.REQ_BUS_SEQ,
                    v.SERVICE_CLASS as BUS_TYPE_CD, 
                    v.MODEL_NM as BUS_MODEL,
                    v.VEHICLE_NO as BUS_NO,
                    res.DRIVER_BIDDING_PRICE as FINAL_AMT,
                    res.DATA_STAT as RES_STAT,
                    u.USER_NM as DRIVER_NAME,
                    u.HP_NO as DRIVER_PHONE
                FROM TB_AUCTION_REQ_BUS ab
                LEFT JOIN TB_BUS_RESERVATION res ON ab.REQ_ID = res.REQ_ID 
                    AND LPAD(ab.REQ_BUS_SEQ, 10, '0') = res.REQ_BUS_SEQ
                    AND res.DATA_STAT IN ('CONFIRM', 'TRAVELER_CANCEL')
                LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON res.BUS_ID = v.BUS_ID
                LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
                WHERE ab.REQ_ID = ?
            `;
            const [buses] = await connection.execute(busQuery, [master.REQ_ID]);
            
            // 드라이버 이름 복호화 처리
            const processedBuses = buses.map(bus => {
                let name = bus.DRIVER_NAME || '정보 없음';
                try { if (name.includes(':')) name = decrypt(name); } catch(e) {}
                return { ...bus, DRIVER_NAME: name };
            });

            master.vehicles = processedBuses;

            // 경유지 정보도 함께 가져오기
            const viaQuery = `
                SELECT VIA_ADDR as address, VIA_SEQ 
                FROM TB_AUCTION_REQ_VIA 
                WHERE REQ_ID = ? 
                ORDER BY VIA_SEQ ASC
            `;
            const [vias] = await connection.execute(viaQuery, [master.REQ_ID]);
            master.waypoints = vias;
        }

        res.status(200).json(masters);

    } catch (error) {
        console.error('Fetch Confirmed Requests Error:', error);
        res.status(500).json({ error: '확정 예약 내역 조회 중 오류가 발생했습니다.' });
    }
});

// POST /api/auction/cancel-bus
app.post('/api/auction/cancel-bus', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq } = req.body;
        if (!reqId || !reqBusSeq) return res.status(400).json({ error: 'reqId and reqBusSeq are required' });

        connection = await pool.getConnection();
        
        // 1. TB_BUS_RESERVATION 테이블의 상태만 'TRAVELER_CANCEL'로 변경
        // REQ_ID와 REQ_BUS_SEQ(Sequence)를 통해 해당 차량과 매칭되는 확정된 입찰 건을 찾아 업데이트합니다.
        const [result] = await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_DT = NOW()
            WHERE REQ_ID = ?
              AND REQ_BUS_SEQ = LPAD(?, 10, '0')
              AND DATA_STAT = 'CONFIRM' 
        `, [reqId, reqBusSeq]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '해당 차량의 확정된 예약 정보를 찾을 수 없거나 이미 취소되었습니다.' });
        }

        // 2. TB_AUCTION_REQ_BUS 상태도 변경 (개별 차량 취소 반영)
        await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [reqId, reqBusSeq]);

        // 3. TB_USER_CANCEL_HIST 이력 삽입 (부분 취소)
        const [uRows] = await connection.execute('SELECT TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        if (uRows.length > 0) {
            const custId = uRows[0].TRAVELER_ID;
            const [maxHistRows] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [custId]);
            const nextHistSeq = (maxHistRows[0].maxSeq || 0) + 1;
            
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_HIST (
                    CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, 
                    CANCEL_REASON_TEXT, REG_DT, MOD_DT
                ) VALUES (?, ?, 'TRAVELER_CANCEL_REASON', 'PARTIAL_CANCEL', ?, NOW(), NOW())
            `, [custId, nextHistSeq, `차량 개별 취소 (SEQ: ${reqBusSeq})`]);

            // 4. TB_USER_CANCEL_MANAGE 카운트 업데이트 (부분 취소 카운트)
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_MANAGE (
                    CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, REG_DT, MOD_DT
                ) VALUES (?, 1, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    CANCEL_CNT = CANCEL_CNT + 1,
                    CANCEL_TRAVELER_PARTIAL_BUS_CNT = CANCEL_TRAVELER_PARTIAL_BUS_CNT + 1,
                    MOD_DT = NOW()
            `, [custId]);
        }

        await connection.commit();
        res.status(200).json({ message: '해당 차량의 예약이 취소되었습니다.' });

    } catch (error) {
        console.error('Cancel Bus Error:', error);
        res.status(500).json({ error: '차량 취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 복합 예약 취소 (사유 입력 + 파일 업로드 + 이력 관리)
// POST /api/auction/complex-cancel
app.post('/api/auction/complex-cancel', async (req, res) => {
    let connection;
    try {
        // 유연한 파라미터 수신을 위해 여러 키 확인
        const { reasonCode, reasonText, fileData, fileName } = req.body;
        const reqId = req.body.reqId || req.body.REQ_ID;
        const custId = req.body.custId || req.body.travelerId || req.body.TRAVELER_ID;
        
        console.log('[DEBUG] Complex Cancel Request Body:', { reqId, custId, reasonCode });

        if (!reqId || !custId) {
            return res.status(400).json({ 
                error: 'reqId and custId are required', 
                received: { reqId, custId } 
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 파일 처리 (GCS 업로드 및 TB_FILE_MASTER 등록)
        let fileId = null;
        if (fileData) {
            const parsed = parseDataUrlPayload(fileData, fileName);
            if (parsed) {
                // 새로운 FILE_ID 생성
                const [maxRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
                fileId = generateNextNumericId(maxRows[0].maxId || '0', 20);
                
                const gcsPath = `cancel_docs/${custId}/${fileId}_${parsed.orgName}.${parsed.ext}`;
                const gcsFile = bucket.file(gcsPath);
                
                // GCS에 파일 저장
                await gcsFile.save(parsed.buffer, { 
                    metadata: { contentType: parsed.mime }, 
                    resumable: false 
                });

                // TB_FILE_MASTER 기록
                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (?, 'CANCEL_DOC', ?, ?, ?, ?, ?, NOW())
                `, [fileId, bucketName, gcsPath, parsed.orgName, parsed.ext, parsed.buffer.length]);
            }
        }

        // 2. TB_AUCTION_REQ 상태 확인 및 변경
        const [statusRows] = await connection.execute(
            'SELECT DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (statusRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '취소할 여정 요청을 찾을 수 없습니다.' });
        }

        const currentStatus = statusRows[0].DATA_STAT;
        if (!['AUCTION', 'BIDDING'].includes(currentStatus)) {
            await connection.rollback();
            return res.status(400).json({ 
                error: `현재 상태(${currentStatus})에서는 전체 취소가 불가능합니다. (경매 중 또는 응찰 중인 경우만 가능)` 
            });
        }

        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        // 3. 연결된 모든 입찰 건(TB_BUS_RESERVATION) 및 차량 상세(TB_AUCTION_REQ_BUS) 상태 변경
        await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        // 4. TB_USER_CANCEL_HIST 이력 삽입
        const [maxHistRows] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [custId]);
        const nextHistSeq = (maxHistRows[0].maxSeq || 0) + 1;
        
        await connection.execute(`
            INSERT INTO TB_USER_CANCEL_HIST (
                CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, 
                CANCEL_REASON_TEXT, REASON_DOC_FILE_NM, REG_DT, MOD_DT
            ) VALUES (?, ?, 'TRAVELER_CANCEL_REASON', ?, ?, ?, NOW(), NOW())
        `, [custId, nextHistSeq, reasonCode, reasonText || '', fileId]); // FILE_ID를 파일명 컬럼에 저장 (참조용)

        // 5. TB_USER_CANCEL_MANAGE 카운트 업데이트 (Upsert)
        await connection.execute(`
            INSERT INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_ALL_CNT, REG_DT, MOD_DT
            ) VALUES (?, 1, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                CANCEL_CNT = CANCEL_CNT + 1,
                CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                MOD_DT = NOW()
        `, [custId]);

        await connection.commit();
        res.status(200).json({ success: true, message: '예약 취소가 성공적으로 처리되었습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Complex Cancel Error:', error);
        res.status(500).json({ error: '취소 처리 중 시스템 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 예약 확정 처리 (지금 예약하기)
// POST /api/auction/confirm

// 버스 변경 API (POST /api/auction/bus-change)

// 버스 재등록 API (변경 후 새로운 버스 추가)
app.post('/api/auction/re-register-bus', async (req, res) => {
    let connection;
    try {
        const { reqId, vehicles, custId } = req.body;
        
        if (!reqId || !vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
            return res.status(400).json({ error: 'reqId and vehicles array are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 기존 버스 상태 확인 및 요청 존재 여부 체크
        const [reqRows] = await connection.execute(
            'SELECT DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (reqRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '해당 예약 요청을 찾을 수 없습니다.' });
        }

        // 2. 새로운 버스들 등록 (TB_AUCTION_REQ_BUS)
        for (const bus of vehicles) {
            // 시퀀스 번호 따기 (현재 최대값 + 1)
            const [seqRows] = await connection.execute(
                'SELECT IFNULL(MAX(REQ_BUS_SEQ), 0) + 1 as nextSeq FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
                [reqId]
            );
            const nextSeq = seqRows[0].nextSeq;

            await connection.execute(
                `INSERT INTO TB_AUCTION_REQ_BUS 
                (REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT, RES_BUS_AMT, REG_ID, MOD_ID) 
                VALUES (?, ?, ?, 'AUCTION', ?, ?, ?)`,
                [reqId, nextSeq, bus.type, bus.price, secureModId, secureModId]
            );
        }

        // 3. 새로운 버스들의 총 금액 합산
        const totalNewAmt = vehicles.reduce((sum, v) => sum + (Number(v.price) * (Number(v.qty) || 1)), 0);

        // 4. TB_AUCTION_REQ 상태 복구 및 금액 합산
        const [reRegUpdate] = await connection.execute(
            "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', REQ_AMT = REQ_AMT + ?, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
            [totalNewAmt, secureModId, reqId]
        );
        console.log(`[DEBUG] Master recovery (re-register): affectedRows=${reRegUpdate.affectedRows}, addedAmt=${totalNewAmt}`);

        await connection.commit();
        res.status(200).json({ message: '버스가 성공적으로 재등록되었습니다. 이제 다시 입찰을 받으실 수 있습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Re-registration Error:', error);
        res.status(500).json({ error: '버스 재등록 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/auction/bus-change', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, custId } = req.body;
        
        if (!reqId || !reqBusSeq) {
            return res.status(400).json({ error: 'reqId and reqBusSeq are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 활성 버스 대수 확인 (취소되지 않은 버스)
        const [activeBuses] = await connection.execute(
            'SELECT REQ_BUS_SEQ, RES_BUS_AMT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'TRAVELER_CANCEL\', \'BUS_CANCEL\') FOR UPDATE',
            [reqId]
        );

        if (activeBuses.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '활성화된 버스 요청을 찾을 수 없습니다.' });
        }

        // 취소하려는 버스 찾기
        const busToCancel = activeBuses.find(b => b.REQ_BUS_SEQ === Number(reqBusSeq));
        if (!busToCancel) {
            await connection.rollback();
            return res.status(404).json({ error: '취소할 버스 정보를 찾을 수 없거나 이미 취소되었습니다.' });
        }

        const oldBusAmt = busToCancel.RES_BUS_AMT || 0;
        const remainingCount = activeBuses.length;

        // 2. TB_AUCTION_REQ 업데이트 (금액 차감 및 조건부 상태 변경)
        let masterStatusUpdate = '';
        if (remainingCount === 1) {
            masterStatusUpdate = ', DATA_STAT = \'TRAVELER_CANCEL\'';
        }

        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET BUS_CHANG_CNT = BUS_CHANG_CNT + 1, REQ_AMT = REQ_AMT - ?, MOD_ID = ?, MOD_DT = NOW() ${masterStatusUpdate} WHERE REQ_ID = ?`,
            [oldBusAmt, secureModId, reqId]
        );

        // 3. TB_AUCTION_REQ_BUS 업데이트 (상태를 TRAVELER_CANCEL로 변경)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?',
            [secureModId, reqId, reqBusSeq]
        );
        
        // 4. 연관된 확정 예약(TB_BUS_RESERVATION)이 있다면 함께 취소 처리
        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = \'CONFIRM\'',
            [reqId, reqBusSeq]
        );

        await connection.commit();
        res.status(200).json({ 
            message: '버스 변경 요청이 성공적으로 처리되었습니다.'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Change Error:', error);
        res.status(500).json({ error: '버스 변경 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/auction/bus-cancel', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, custId } = req.body;
        
        if (!reqId || !reqBusSeq) {
            return res.status(400).json({ error: 'reqId and reqBusSeq are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 마스터 정보 조회 (기사 변경 횟수 확인)
        const [masterRows] = await connection.execute(
            'SELECT BUS_CHANG_CNT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (masterRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '해당 여정 요청을 찾을 수 없습니다.' });
        }

        const master = masterRows[0];
        if (master.BUS_CHANG_CNT > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '기사 변경은 이미 1회 수행되었습니다. 더 이상 변경할 수 없습니다.' });
        }

        // 2. TB_AUCTION_REQ 업데이트 (상태를 AUCTION으로 되돌리고 횟수 증가, 금액 유지)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ SET DATA_STAT = \'AUCTION\', BUS_CHANG_CNT = BUS_CHANG_CNT + 1, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?',
            [secureModId, reqId]
        );

        // 3. TB_AUCTION_REQ_BUS 업데이트 (재응찰을 위해 상태를 AUCTION으로 변경)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'AUCTION\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?',
            [secureModId, reqId, reqBusSeq]
        );

        // 4. TB_BUS_RESERVATION 무효화 (기존 확정 데이터를 BUS_CHANGE로 변경)
        // 무효화 하기 전에 기사 정보를 가져와서 알림 발송 준비
        const [driverInfoRows] = await connection.execute(
            `SELECT r.DRIVER_ID, d.DRIVER_HP, d.DRIVER_NM 
             FROM TB_BUS_RESERVATION r
             JOIN TB_DRIVER_INFO d ON r.DRIVER_ID = d.DRIVER_ID
             WHERE r.REQ_ID = ? AND r.REQ_BUS_SEQ = ? AND r.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL')`,
            [reqId, String(reqBusSeq)]
        );

        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'BUS_CHANGE\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT NOT IN (\'BUS_CHANGE\', \'TRAVELER_CANCEL\')',
            [reqId, String(reqBusSeq)]
        );

        await connection.commit();

        // 5. 알림톡 발송 (트랜잭션 완료 후 비동기 처리)
        if (driverInfoRows.length > 0) {
            const driver = driverInfoRows[0];
            try {
                await sendAlimTalkAndLog({
                    reqId: reqId,
                    receiverId: driver.DRIVER_ID,
                    receiverPhone: driver.DRIVER_HP,
                    content: `[busTaams] 예약 취소 안내\n\n기사님, 예약된 여정(요청번호: ${reqId})이 고객님의 요청으로 취소되었습니다.`,
                    category: 'DRIVER_CHANGE_NOTICE'
                });
                console.log(`[ALIMTALK] Driver Change notification sent to ${driver.DRIVER_NM}(${driver.DRIVER_HP})`);
            } catch (alimError) {
                console.error('[ALIMTALK ERROR] Failed to send driver change notice:', alimError.message);
            }
        }
        res.status(200).json({ message: '기사 변경 요청이 완료되었습니다. 다시 경매가 진행됩니다.' });


    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Cancel Error:', error);
        res.status(500).json({ error: '버스 취소 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/auction/confirm', async (req, res) => {
    let connection;
    try {
        const { reqId, driverId, bidSeq } = req.body;
        if (!reqId || !driverId) {
            return res.status(400).json({ error: 'reqId and driverId are required' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 기사의 버스 정보 가져오기 (차량 타입 확인용)
        const busRow = await fetchBusRowForUser(connection, driverId);
        const busType = busRow ? busRow.SERVICE_CLASS : null;

        // 2. 해당 요청(reqId)에서 해당 차종에 맞는 비어있는 슬롯(REQ_BUS_SEQ) 찾기
        // (이미 확정된 차량은 제외하고 남은 슬롯 중 하나 선택)
        const [slots] = await connection.execute(`
            SELECT ab.REQ_BUS_SEQ
            FROM TB_AUCTION_REQ_BUS ab
            LEFT JOIN TB_BUS_RESERVATION res ON ab.REQ_ID = res.REQ_ID 
                AND LPAD(ab.REQ_BUS_SEQ, 10, '0') = res.REQ_BUS_SEQ
                AND res.DATA_STAT = 'CONFIRM'
            WHERE ab.REQ_ID = ? 
              AND (ab.BUS_TYPE_CD = ? OR ? IS NULL)
              AND res.RES_ID IS NULL
            LIMIT 1
        `, [reqId, busType, busType]);

        const targetBusSeq = slots.length > 0 ? slots[0].REQ_BUS_SEQ : null;

        // 3. 해당 기사의 특정 입찰(bidSeq)을 'CONFIRM'으로 변경하고 슬롯(REQ_BUS_SEQ) 할당
        const [resUpdate] = await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'CONFIRM',
                REQ_BUS_SEQ = LPAD(?, 10, '0'),
                MOD_DT = NOW()
            WHERE REQ_ID = ? 
              AND DRIVER_ID = ?
              AND BID_SEQ = ?
        `, [targetBusSeq, reqId, driverId, bidSeq || 1]);

        if (resUpdate.affectedRows === 0) {
            throw new Error('해당 입찰 정보를 찾을 수 없거나 이미 처리되었습니다.');
        }

        // 4. 상위 요청서 및 차량 상세 상태를 'CONFIRM'으로 변경
        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET DATA_STAT = 'CONFIRM',
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [reqId]);

        if (targetBusSeq) {
            await connection.execute(`
                UPDATE TB_AUCTION_REQ_BUS
                SET DATA_STAT = 'CONFIRM',
                    MOD_DT = NOW()
                WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
            `, [reqId, targetBusSeq]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: '예약이 확정되었습니다.', assignedBusSeq: targetBusSeq });


    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Confirm Reservation Error:', error);
        res.status(500).json({ error: error.message || '예약 확정 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 특정 경매 요청에 대한 견적 목록 조회 (최신 입찰 선별 로직 포함)
// GET /api/auction/bids/:reqId
app.get('/api/auction/bids/:reqId', async (req, res) => {
    let connection;
    try {
        const { reqId } = req.params;
        if (!reqId) return res.status(400).json({ error: 'reqId is required' });

        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                res.RES_ID,
                res.REQ_ID,
                res.DRIVER_ID,
                res.BUS_ID,
                res.DRIVER_BIDDING_PRICE,
                res.DATA_STAT as RES_STAT,
                u.USER_NM as driverName,
                di.BIO_DESC as driverBio,
                u.USER_STAT as verifyStatus,
                v.MODEL_NM as busModel,
                v.SERVICE_CLASS as busClass,
                v.VEHICLE_NO as busNo,
                v.MANUFACTURE_YEAR as manufactureYear,
                v.AMENITIES as amenitiesList,
                v.HAS_ADAS as hasAdas
            FROM TB_BUS_RESERVATION res
            LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_DRIVER_DETAIL di ON res.DRIVER_ID = di.USER_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON res.BUS_ID = v.BUS_ID
            WHERE res.REQ_ID = ?
            ORDER BY res.REG_DT DESC
        `;

        const [rows] = await connection.execute(query, [reqId]);
        
        const sanitizedRows = rows.map(row => {
            let name = row.driverName || '이름 정보 없음';
            try {
                // 암호화된 경우 복호화 시도
                if (name.includes(':')) {
                    name = decrypt(name);
                }
            } catch (e) { /* ignore */ }

            return {
                ...row,
                driverName: name,
                bidId: row.RES_ID,
                driverId: row.DRIVER_ID,
                bidPrice: row.DRIVER_BIDDING_PRICE,
                busModel: row.busModel || '정보 미등록',
                busClass: row.busClass || 'STANDARD',
                manufactureYear: row.manufactureYear || '-'
            };
        });

        res.status(200).json(sanitizedRows);

    } catch (error) {
        console.error('CRITICAL BIDS ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 내 여정 기록 조회 (완료 및 취소 내역 포함)
// GET /api/auction/history/:custId
app.get('/api/auction/history/:custId', async (req, res) => {
    let connection;
    try {
        const { custId } = req.params;
        if (!custId) return res.status(400).json({ error: 'custId is required' });

        connection = await pool.getConnection();
        
        console.log(`[DEBUG] Fetching history for custId: [${custId}]`);
        
        const query = `
            SELECT 
                r.REQ_ID, 
                ab.REQ_BUS_SEQ,
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.TRAVELER_ID,
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT,
                ab.BUS_TYPE_CD,
                ab.RES_BUS_AMT as UNIT_REQ_AMT,
                ab.DATA_STAT as BUS_STAT,
                (
                    SELECT res.DATA_STAT 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND res.REQ_BUS_SEQ = LPAD(ab.REQ_BUS_SEQ, 10, '0')
                    LIMIT 1
                ) as RES_STAT,
                (
                    SELECT res.DRIVER_BIDDING_PRICE 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND res.REQ_BUS_SEQ = LPAD(ab.REQ_BUS_SEQ, 10, '0')
                      AND res.DATA_STAT IN ('CONFIRM', 'COMPLETED')
                    LIMIT 1
                ) as FINAL_CONFIRM_AMT
            FROM TB_AUCTION_REQ r
            INNER JOIN TB_AUCTION_REQ_BUS ab ON r.REQ_ID = ab.REQ_ID
            WHERE r.TRAVELER_ID = ?
              AND r.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE')
              AND ab.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL', 'BUS_CANCEL')
            ORDER BY r.REG_DT DESC, ab.REQ_BUS_SEQ ASC
        `;

        const [rows] = await connection.execute(query, [custId]);
        console.log(`[DEBUG] History rows found: ${rows.length}`);
        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch Trip History Error:', error);
        res.status(500).json({ error: '여정 기록 조회 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 특정 입찰(견적) 정보 상세 조회 (6개 테이블 조인)
// GET /api/auction/bid-detail/:bidId
app.get('/api/auction/bid-detail/:bidId', async (req, res) => {
    let connection;
    try {
        const { bidId } = req.params;
        if (!bidId) return res.status(400).json({ error: 'bidId is required' });

        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                res.RES_ID as bidId,
                res.DRIVER_BIDDING_PRICE as bidPrice,
                res.DRIVER_ID as driverId,
                u.USER_NM as driverName,
                di.BIO_DESC as driverBio,
                u.PROFILE_FILE_ID as driverProfilePhotoId,
                v.MODEL_NM as busModel,
                v.SERVICE_CLASS as busClass,
                v.VEHICLE_NO as busNo,
                v.VEHICLE_PHOTOS_JSON as busPhotos
            FROM TB_BUS_RESERVATION res
            JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_DRIVER_DETAIL di ON res.DRIVER_ID = di.USER_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON res.BUS_ID = v.BUS_ID
            WHERE res.RES_ID = ?
        `;

        const [rows] = await connection.execute(query, [bidId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '견적 정보를 찾을 수 없습니다.' });
        }

        const row = rows[0];
        try {
            row.driverName = decrypt(row.driverName);
        } catch (e) { /* ignore */ }

        res.status(200).json(row);

    } catch (error) {
        console.error('Get Bid Detail Error:', error);
        res.status(500).json({ error: '견적 상세 조회 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 기사 프로필 설정 (Profile Setup)
app.post('/api/driver/profile-setup', async (req, res) => {
    let connection;
    try {
        const {
            custId, rrn, licenseType, licenseNo, licenseIssueDt, licenseExpiryDt,
            licenseSerialNo,
            qualCertNo, bioText, profilePhotoBase64, qualCertBase64,
            phoneIdToken,
            driverName
        } = req.body;

        if (!custId) return res.status(400).json({ error: 'custId is required' });

        const rrnNorm = (rrn || '').trim();
        if (!/^\d{6}-\d{1}$/.test(rrnNorm)) {
            return res.status(400).json({
                error: '주민등록번호는 앞 6자리와 뒤 1자리만 입력해 주세요. (예: 900101-1)'
            });
        }

        const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(phoneIdToken);
        if (!phoneVerify.ok) {
            return res.status(400).json({ error: phoneVerify.error });
        }

        const existingDriverRow = await fetchDriverInfoRow(custId);

        const extVerify = await runDriverVerificationsForProfileSetup({
            driverName: (driverName || '').trim(),
            rrn: rrnNorm,
            licenseNo,
            licenseSerialNo,
            qualCertNo,
            licenseType,
            licenseIssueDt,
            licenseExpiryDt,
            existingRow: existingDriverRow
        });
        if (!extVerify.ok) {
            return res.status(400).json({
                error: extVerify.message || '면허·자격 진위 확인에 실패했습니다.',
                detail: extVerify.detail
            });
        }

        // 자격번호 검증 상태 계산
        // tsOn=false(비활성) → SKIPPED, tsOn+unchanged → 기존 DB 값 유지, tsOn+신규/변경 검증 통과 → VERIFIED
        const tsOn = extVerify.results?.qual?.tsVerifyEnabled ?? false;
        const skipTs = extVerify.results?.qual?.skipped && extVerify.results?.qual?.reason === 'unchanged_from_db';
        let qualCertVerifyStatus;
        if (!tsOn) {
            qualCertVerifyStatus = 'SKIPPED';
        } else if (skipTs) {
            // 자격번호 변경 없음 — 기존 상태 유지 (없으면 VERIFIED로 간주: 이미 통과된 이력)
            qualCertVerifyStatus = existingDriverRow?.QUAL_CERT_VERIFY_STATUS || 'VERIFIED';
        } else {
            // TS API 실제 검증 통과
            qualCertVerifyStatus = 'VERIFIED';
        }
        const qualCertVerifyDt = qualCertVerifyStatus === 'VERIFIED' ? new Date() : null;

        connection = await pool.getConnection();

        /* DDL은 암시적 커밋이 있을 수 있어 트랜잭션 시작 전에 실행 */
        await ensureDriverInfoTable(connection);
        await ensureTbFileMasterTable(connection);
        await ensureDriverInfoLicenseSerialColumn(connection);
        await ensureDriverInfoQualVerifyColumns(connection);

        await connection.beginTransaction();

        try {
            const encryptedRrn = encrypt(rrnNorm);
            let profilePhotoId = null;
            let qualCertId = null;

            const ym = new Date().toISOString().slice(0, 7);

            // 1. 프로필 사진 — ARCHITECTURE: gs://bustaams-secure-data/profiles/driver/{YYYY-MM}/
            if (profilePhotoBase64 && profilePhotoBase64.startsWith('data:image')) {
                profilePhotoId = generateNextNumericId('0', 20);
                const buffer = Buffer.from(profilePhotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const gcsPath = `profiles/driver/${ym}/${profilePhotoId}.png`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (?, 'DRIVER_PROFILE_PHOTO', ?, ?, 'profile.png', 'png', ?, NOW())
                `, [profilePhotoId, bucketName, gcsPath, buffer.length]);
            }

            // 2. 운송종사자 자격증 사본 — ARCHITECTURE: gs://bustaams-secure-data/certificates/bus_licenses/
            if (qualCertBase64 && qualCertBase64.startsWith('data:')) {
                qualCertId = generateNextNumericId('0', 20);
                const isPdf = qualCertBase64.includes('pdf');
                const ext = isPdf ? 'pdf' : 'png';
                const buffer = Buffer.from(qualCertBase64.replace(/^data:[\w\/]+;base64,/, ""), 'base64');
                const gcsPath = `certificates/bus_licenses/${ym}/${qualCertId}.${ext}`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: isPdf ? 'application/pdf' : 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (?, 'BUS_QUAL_CERT', ?, ?, ?, ?, ?, NOW())
                `, [qualCertId, bucketName, gcsPath, `qual_cert.${ext}`, ext, buffer.length]);
            }

            // 3. TB_DRIVER_INFO 저장 (Upsert)
            const driverQuery = `
                INSERT INTO TB_DRIVER_INFO (
                    USER_ID, RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, 
                    LICENSE_EXPIRY_DT, QUAL_CERT_NO, QUAL_CERT_VERIFY_STATUS, QUAL_CERT_VERIFY_DT,
                    QUAL_CERT_FILE_ID, PROFILE_PHOTO_ID, BIO_TEXT, UPDATE_DT
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ${qualCertId ? '?' : 'NULL'}, 
                    ${profilePhotoId ? '?' : 'NULL'}, 
                    ?, NOW()
                )
                ON DUPLICATE KEY UPDATE 
                    RRN_ENC = VALUES(RRN_ENC),
                    LICENSE_TYPE = VALUES(LICENSE_TYPE),
                    LICENSE_NO = VALUES(LICENSE_NO),
                    LICENSE_SERIAL_NO = VALUES(LICENSE_SERIAL_NO),
                    LICENSE_ISSUE_DT = VALUES(LICENSE_ISSUE_DT),
                    LICENSE_EXPIRY_DT = VALUES(LICENSE_EXPIRY_DT),
                    QUAL_CERT_NO = VALUES(QUAL_CERT_NO),
                    QUAL_CERT_VERIFY_STATUS = VALUES(QUAL_CERT_VERIFY_STATUS),
                    QUAL_CERT_VERIFY_DT = IFNULL(VALUES(QUAL_CERT_VERIFY_DT), QUAL_CERT_VERIFY_DT),
                    QUAL_CERT_FILE_ID = IFNULL(VALUES(QUAL_CERT_FILE_ID), QUAL_CERT_FILE_ID),
                    PROFILE_PHOTO_ID = IFNULL(VALUES(PROFILE_PHOTO_ID), PROFILE_PHOTO_ID),
                    BIO_TEXT = VALUES(BIO_TEXT),
                    UPDATE_DT = NOW()
            `;
            
            const params = [
                custId,
                encryptedRrn,
                licenseType,
                licenseNo,
                licenseSerialNo || null,
                licenseIssueDt,
                licenseExpiryDt,
                qualCertNo,
                qualCertVerifyStatus,
                qualCertVerifyDt
            ];
            if (qualCertId) params.push(qualCertId);
            if (profilePhotoId) params.push(profilePhotoId);
            params.push(bioText);

            await connection.execute(driverQuery, params);

            // 방금 저장된 QUAL_CERT_FILE_ID 조회 (문서 보기 버튼용)
            const [savedRows] = await connection.execute(
                `SELECT QUAL_CERT_FILE_ID FROM TB_DRIVER_INFO WHERE USER_ID = ?`,
                [custId]
            );
            const savedQualCertFileId = savedRows[0]?.QUAL_CERT_FILE_ID || null;

            await connection.commit();
            res.status(200).json({
                message: "기사 프로필 설정이 완료되었습니다.",
                qualCertVerifyStatus,
                qualCertFileId: savedQualCertFileId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 공통코드 (버스 종류 등)
app.get('/api/common-codes', async (req, res) => {
    let connection;
    try {
        const { grpCd } = req.query;
        if (!grpCd) return res.status(400).json({ error: 'grpCd is required' });
        connection = await pool.getConnection();
        await ensureTbCommonCodeTable(connection);
        await seedBusTypeCodesIfEmpty(connection);
        const [rows] = await connection.execute(
            `SELECT DTL_CD AS dtlCd, CD_NM_KO AS cdNmKo, CD_FNUM AS cdFnum
             FROM TB_COMMON_CODE WHERE GRP_CD = ? AND USE_YN = 'Y' ORDER BY DISP_ORD ASC, DTL_CD ASC`,
            [grpCd]
        );
        res.json({ items: rows });
    } catch (e) {
        console.error('common-codes:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ─── 자격증 사본 파일 API (소유 기사 전용) ──────────────────────────────────────

/**
 * GET /api/driver/qual-cert/meta?custId=&fileId=
 * CommonView doc mode용 자격증 사본 메타 조회 (TB_DRIVER_DOCS 소유 확인)
 */
app.get('/api/driver/qual-cert/meta', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT FILE_ID AS fileId,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일 메타를 찾을 수 없습니다.' });
        const row = rows[0];
        const sizeBytes = Number(row.fileSizeBytes) || 0;
        const fileSizeLabel = sizeBytes >= 1048576
            ? `${(sizeBytes / 1048576).toFixed(1)}MB`
            : sizeBytes >= 1024
              ? `${(sizeBytes / 1024).toFixed(0)}KB`
              : `${sizeBytes}B`;
        res.json({
            fileId: row.fileId,
            fileCategory: row.fileCategory,
            orgFileNm: row.orgFileNm,
            fileExt: row.fileExt,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel: row.regDtLabel,
        });
    } catch (e) {
        console.error('qual-cert/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/driver/qual-cert/file?custId=&fileId=
 * 자격증 사본 파일 스트리밍 (TB_DRIVER_DOCS 소유 확인)
 */
app.get('/api/driver/qual-cert/file', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';
        else if (ext === 'gif') ct = 'image/gif';
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'file')}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (qual-cert):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('qual-cert/file:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/driver/qual-cert/download?custId=&fileId=
 * 자격증 사본 파일 다운로드 (Content-Disposition: attachment)
 */
app.get('/api/driver/qual-cert/download', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const safeNm = `${ORG_FILE_NM || 'qual_cert'}.${FILE_EXT || 'file'}`;
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeNm)}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS download (qual-cert):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('qual-cert/download:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/** CommonView — 문서 뷰어 샘플 메타(JSON). 일반 모드용 */
app.get('/api/common-view/document', async (req, res) => {
    try {
        res.json({
            commonViewDocumentId: 'cv-doc-2024-contract-09',
            fileName: '2024_운행_계약서.pdf',
            fileType: 'PDF',
            fileSizeBytes: 1258291,
            fileSizeLabel: '1.2MB',
            authorName: '운영지원팀 김태영',
            createdAtLabel: '2024년 05월 12일',
            securityLevel: '대외비 (Internal Use)',
            reportNo: '2024-CONTRACT-09',
            totalPages: 12,
        });
    } catch (e) {
        console.error('common-view/document:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * CommonView — 기사 서류 파일 메타 조회 (소유 기사 전용)
 * GET /api/common-view/bus-document/meta?custId=&fileId=
 */
app.get('/api/common-view/bus-document/meta', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT FILE_ID AS fileId,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일 메타를 찾을 수 없습니다.' });
        const row = rows[0];
        const sizeBytes = Number(row.fileSizeBytes) || 0;
        const fileSizeLabel = sizeBytes >= 1048576
            ? `${(sizeBytes / 1048576).toFixed(1)}MB`
            : sizeBytes >= 1024
              ? `${(sizeBytes / 1024).toFixed(0)}KB`
              : `${sizeBytes}B`;
        res.json({
            fileId: row.fileId,
            fileCategory: row.fileCategory,
            orgFileNm: row.orgFileNm,
            fileExt: row.fileExt,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel: row.regDtLabel,
        });
    } catch (e) {
        console.error('common-view/bus-document/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * CommonView — 기사 서류 파일 다운로드 (소유 기사 전용)
 * GET /api/common-view/bus-document/download?custId=&fileId=
 * Content-Disposition: attachment — 파일명: ORG_FILE_NM.FILE_EXT
 */
app.get('/api/common-view/bus-document/download', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf')                     ct = 'application/pdf';
        else if (ext === 'png')                ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp')               ct = 'image/webp';

        const downloadName = `${ORG_FILE_NM || 'file'}.${ext}`;
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (download):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('common-view/bus-document/download:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// 기사 소유 차량 조회 (모달 기본값)
app.get('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const { custId } = req.query;
        if (!custId) return res.status(400).json({ error: 'custId is required' });
        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row) return res.json({ bus: null });

        const amenities = typeof row.AMENITIES === 'string' ? JSON.parse(row.AMENITIES || '{}') : (row.AMENITIES || {});
        let photoFileIds = row.VEHICLE_PHOTOS_JSON;
        if (typeof photoFileIds === 'string') {
            try { photoFileIds = JSON.parse(photoFileIds); } catch (e) { photoFileIds = []; }
        }
        if (!Array.isArray(photoFileIds)) photoFileIds = [];

        const bizRegFile = await fileMetaById(connection, row.bizRegId);
        const transLicFile = await fileMetaById(connection, row.transLicId);
        const insCertFile = await fileMetaById(connection, row.insCertId);

        res.json({
            bus: {
                busId: row.busId,
                vehicleNo: row.VEHICLE_NO,
                modelNm: row.MODEL_NM,
                manufactureYear: row.MANUFACTURE_YEAR,
                mileage: row.MILEAGE,
                serviceClass: row.SERVICE_CLASS,
                amenities,
                hasAdas: row.HAS_ADAS === 'Y',
                lastInspectDt: row.lastInspectDt || '',
                insuranceExpDt: row.insuranceExpDt || '',
                bizRegFile: bizRegFile ? { fileId: bizRegFile.fileId, orgFileNm: bizRegFile.ORG_FILE_NM, fileExt: bizRegFile.FILE_EXT } : null,
                transLicFile: transLicFile ? { fileId: transLicFile.fileId, orgFileNm: transLicFile.ORG_FILE_NM, fileExt: transLicFile.FILE_EXT } : null,
                insCertFile: insCertFile ? { fileId: insCertFile.fileId, orgFileNm: insCertFile.ORG_FILE_NM, fileExt: insCertFile.FILE_EXT } : null,
                vehiclePhotoFileIds: photoFileIds
            }
        });
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return res.json({ bus: null });
        console.error('GET driver/bus:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// 차량·서류 파일 스트리밍 (소유 기사)
app.get('/api/driver/bus-documents/file', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';

        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'file')}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read:', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('bus-documents/file:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// CustomerDashboard API
app.get('/api/customer/active-request', async (req, res) => {
    const { custId } = req.query;
    if (!custId) return res.status(400).json({ error: 'custId is required' });
    try {
        const [rows] = await pool.execute(
            `SELECT REQ_ID, TRIP_TITLE, START_ADDR, END_ADDR, PASSENGER_CNT, DATA_STAT, START_DT
             FROM TB_AUCTION_REQ
             WHERE TRAVELER_ID = ? AND DATA_STAT = 'AUCTION'
             ORDER BY REG_DT DESC LIMIT 1`,
            [custId]
        );
        if (rows.length === 0) return res.json(null);
        const r = rows[0];
        res.json({
            id: r.REQ_ID,
            route: `${r.START_ADDR} → ${r.END_ADDR}`,
            subTitle: r.TRIP_TITLE,
            startDt: formatDateYmd(r.START_DT),
            description: `대형 · ${r.PASSENGER_CNT}명`,
            status: r.DATA_STAT
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API: 버스 정보 등록 (신규)
app.post('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const {
            custId, vehicleNo, modelNm, manufactureYear, mileage,
            serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt,
            businessLicenseBase64, businessLicenseFileName,
            transportationLicenseBase64, transportationLicenseFileName,
            insurancePolicyBase64, insurancePolicyFileName,
            vehiclePhotos
        } = req.body;

        if (!custId || !vehicleNo) {
            return res.status(400).json({ error: 'custId and vehicleNo are required' });
        }
        if (!serviceClass) {
            return res.status(400).json({ error: 'serviceClass is required' });
        }

        connection = await pool.getConnection();

        const existing = await fetchBusRowForUser(connection, custId);
        if (existing) {
            return res.status(409).json({ error: '이미 등록된 차량이 있습니다. 수정 화면에서 변경해 주세요.' });
        }

        // [ID 생성] 최신 BUS_ID 가져오기
        const [maxRows] = await connection.execute('SELECT MAX(BUS_ID) as maxId FROM TB_BUS_DRIVER_VEHICLE');
        const busId = generateNextNumericId(maxRows[0].maxId || '0', 10);

        const ym = new Date().toISOString().slice(0, 7);
        const adasYn = hasAdas === true || hasAdas === 'Y' ? 'Y' : 'N';
        const amenObj = { ...(amenities || {}), adas: adasYn === 'Y' };

        await connection.beginTransaction();
        try {
            await connection.execute(
                `INSERT INTO TB_BUS_DRIVER_VEHICLE (
                    BUS_ID, CUST_ID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR,
                    MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS, LAST_INSPECT_DT, INSURANCE_EXP_DT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    busId, custId, vehicleNo, modelNm || '', manufactureYear || '',
                    Number(mileage) || 0, serviceClass, JSON.stringify(amenObj), adasYn,
                    lastInspectDt || null, insuranceExpDt || null
                ]
            );

            const fileIds = {};
            const docMap = [
                { key: 'biz', field: businessLicenseBase64, name: businessLicenseFileName, cat: 'Business_License', col: 'BIZ_REG_FILE_ID' },
                { key: 'trans', field: transportationLicenseBase64, name: transportationLicenseFileName, cat: 'Transportation_Business_License', col: 'TRANS_LIC_FILE_ID' },
                { key: 'ins', field: insurancePolicyBase64, name: insurancePolicyFileName, cat: 'Insurance_Policy', col: 'INS_CERT_FILE_ID' }
            ];

            // 최신 FILE_ID 시드
            const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
            let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';

            for (const d of docMap) {
                if (!d.field || typeof d.field !== 'string') continue;
                const parsed = parseDataUrlPayload(d.field, d.name || 'doc');
                if (!parsed) continue;
                
                const fid = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = fid;
                
                const gcsPath = `vehicle_docs/${ym}/${fid}.${parsed.ext}`;
                await insertBusFileAndHist(connection, {
                    busId: busId,
                    fileId: fid,
                    category: d.cat,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm: parsed.orgName || `doc.${parsed.ext}`,
                    fileExt: parsed.ext,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime
                });
                fileIds[d.key] = fid;
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET ${d.col} = ? WHERE BUS_ID = ?`,
                    [fid, busId]
                );
            }

            const photoIdList = [];
            if (Array.isArray(vehiclePhotos) && vehiclePhotos.length > 0) {
                const slice = vehiclePhotos.slice(0, 8);
                for (const ph of slice) {
                    const raw = ph.base64 || ph.dataUrl;
                    const nm = ph.fileName || ph.name || 'photo';
                    if (!raw) continue;
                    const parsed = parseDataUrlPayload(typeof raw === 'string' && raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`, nm);
                    if (!parsed) continue;
                    
                    const fid = generateNextNumericId(currentMaxFileId, 20);
                    currentMaxFileId = fid;
                    
                    const gcsPath = `vehicle_docs/${ym}/bus_photo_${fid}.${parsed.ext}`;
                    await insertBusFileAndHist(connection, {
                        busId: busId,
                        fileId: fid,
                        category: 'BUS_PHOTO',
                        gcsPath,
                        buffer: parsed.buffer,
                        orgFileNm: parsed.orgName || `photo.${parsed.ext}`,
                        fileExt: parsed.ext,
                        fileSize: parsed.buffer.length,
                        contentType: parsed.mime
                    });
                    photoIdList.push(fid);
                }
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = ?`,
                    [JSON.stringify(photoIdList), busId]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: '차량 등록이 완료되었습니다.',
                busId: busId,
                fileIds: Object.keys(fileIds).length ? fileIds : undefined,
                vehiclePhotoFileIds: photoIdList.length ? photoIdList : undefined
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Bus Setup error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 버스 서류 정보 조회
app.get('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const { custId } = req.query;
        if (!custId) return res.status(400).json({ error: 'custId is required' });
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        const row = await fetchBusRowForUser(connection, custId);
        if (!row) return res.json({ bus: null });

        const amenities = typeof row.AMENITIES === 'string' ? JSON.parse(row.AMENITIES || '{}') : (row.AMENITIES || {});
        let photoIds = row.VEHICLE_PHOTOS_JSON;
        if (typeof photoIds === 'string') {
            try { photoIds = JSON.parse(photoIds); } catch (e) { photoIds = []; }
        }
        if (!Array.isArray(photoIds)) photoIds = [];

        res.json({
            bus: {
                busId: row.busId,
                vehicleNo: row.VEHICLE_NO,
                modelNm: row.MODEL_NM,
                manufactureYear: row.MANUFACTURE_YEAR,
                mileage: row.MILEAGE,
                serviceClass: row.SERVICE_CLASS,
                amenities,
                hasAdas: row.HAS_ADAS === 'Y',
                lastInspectDt: row.lastInspectDt || '',
                insuranceExpDt: row.insuranceExpDt || '',
                bizRegFileId: row.bizRegId,
                transLicFileId: row.transLicId,
                insCertFileId: row.insCertId,
                vehiclePhotoFileIds: photoIds
            }
        });
    } catch (e) {
        console.error('GET driver/bus:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});


// API: 차량 사진 목록 교체
app.patch('/api/driver/bus/photos', async (req, res) => {
    let connection;
    try {
        const { custId, busId, vehiclePhotos } = req.body;
        if (!custId || !busId) return res.status(400).json({ error: 'custId and busId are required' });
        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row || row.busId !== busId) return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });

        const ym = new Date().toISOString().slice(0, 7);
        const outList = [];
        await connection.beginTransaction();
        try {
            for (const ph of (vehiclePhotos || []).slice(0, 8)) {
                if (ph.fileId && !ph.base64) { outList.push(ph.fileId); continue; }
                const parsed = parseDataUrlPayload(ph.base64 || ph.dataUrl, ph.fileName || 'photo');
                if (!parsed) continue;
                const fid = generateNextNumericId('0', 10);
                await insertBusFileAndHist(connection, {
                    busId, fileId: fid, category: 'BUS_PHOTO', gcsPath: `bus_photos/${ym}/${fid}.${parsed.ext}`,
                    buffer: parsed.buffer, orgFileNm: parsed.orgName, fileExt: parsed.ext,
                    fileSize: parsed.buffer.length, contentType: parsed.mime
                });
                outList.push(fid);
            }
            await connection.execute(`UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = ?`, [JSON.stringify(outList), busId]);
            await connection.commit();
            res.json({ message: '차량 사진이 갱신되었습니다.', vehiclePhotoFileIds: outList });
        } catch (err) { await connection.rollback(); throw err; }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { if (connection) connection.release(); }
});

// ─── [AESTHETIC POLISH] Auction Bid PUT / Cancel APIs ────────────────────────

app.put('/api/traveler-quote-request-details/bid', async (req, res) => {
    let connection;
    try {
        const { reqId, custId, bidPrice } = req.body;
        const bidPriceNum = Number(bidPrice);
        if (!bidPriceNum || isNaN(bidPriceNum)) return res.status(400).json({ error: '올바른 입찰 가격을 입력해 주세요.' });

        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT RES_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ? ORDER BY BID_SEQ DESC LIMIT 1`,
            [reqId, custId]
        );
        const currentBid = rows[0];
        const resStat = currentBid ? currentBid.DATA_STAT : null;

        if (currentBid && resStat !== 'CANCELLATION_OF_BID') {
            if (resStat !== 'BIDDING' && resStat !== 'REQ') {
                return res.status(409).json({ error: `현재 상태(${resStat})에서는 입찰가를 수정할 수 없습니다.`, resStat });
            }
            await connection.execute(`UPDATE TB_BUS_RESERVATION SET DRIVER_BIDDING_PRICE = ?, MOD_DT = NOW() WHERE RES_ID = ?`, [bidPriceNum, currentBid.RES_ID]);
            res.json({ success: true, message: '입찰가가 수정되었습니다.' });
        } else {
            const [[{ maxSeq }]] = await connection.execute(`SELECT COALESCE(MAX(BID_SEQ), 0) AS maxSeq FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ?`, [reqId, custId]);
            const newResId = generateNextNumericId('0', 10);
            const busRow = await fetchBusRowForUser(connection, custId);
            await connection.execute(
                `INSERT INTO TB_BUS_RESERVATION (RES_ID, REQ_ID, DRIVER_ID, BUS_ID, BID_SEQ, DRIVER_BIDDING_PRICE, DATA_STAT, REG_DT, MOD_DT)
                 VALUES (?, ?, ?, ?, ?, ?, 'BIDDING', NOW(), NOW())`,
                [newResId, reqId, custId, busRow ? busRow.busId : null, Number(maxSeq) + 1, bidPriceNum]
            );
            res.json({ success: true, message: '입찰이 등록되었습니다.', resId: newResId });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { if (connection) connection.release(); }
});

app.put('/api/traveler-quote-request-details/bid-cancel', async (req, res) => {
    let connection;
    try {
        const { reqId, custId } = req.body;
        connection = await pool.getConnection();
        const [rows] = await connection.execute(`SELECT RES_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ? ORDER BY BID_SEQ DESC LIMIT 1`, [reqId, custId]);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: '입찰 정보를 찾을 수 없습니다.' });
        if (row.DATA_STAT !== 'BIDDING' && row.DATA_STAT !== 'REQ') return res.status(409).json({ error: `현재 상태(${row.DATA_STAT})에서는 취소할 수 없습니다.` });
        await connection.execute(`UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CANCELLATION_OF_BID', MOD_DT = NOW() WHERE RES_ID = ?`, [row.RES_ID]);
        res.json({ success: true, message: '입찰이 취소되었습니다.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { if (connection) connection.release(); }
});


/**
 * 기사 메인 대시보드 요약
 */
app.get('/api/driver/dashboard', async (req, res) => {
    const { custId } = req.query;
    if (!custId) return res.status(400).json({ error: 'custId가 필요합니다.' });
    let connection;
    try {
        connection = await pool.getConnection();
        const [[prevSum]] = await connection.execute(
            `SELECT COALESCE(SUM(DRIVER_BIDDING_PRICE), 0) AS total FROM TB_BUS_RESERVATION
              WHERE DRIVER_ID = ? AND DATA_STAT = 'DONE'
                AND MOD_DT >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                AND MOD_DT < DATE_FORMAT(CURDATE(), '%Y-%m-01')`, [custId]
        );
        const [[currSum]] = await connection.execute(
            `SELECT COALESCE(SUM(DRIVER_BIDDING_PRICE), 0) AS total FROM TB_BUS_RESERVATION
              WHERE DRIVER_ID = ? AND DATA_STAT = 'DONE'
                AND MOD_DT >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND DATE(MOD_DT) <= CURDATE()`, [custId]
        );
        const [[agg]] = await connection.execute(
            `SELECT COALESCE(SUM(CASE WHEN DATA_STAT IN ('REQ', 'BIDDING') THEN 1 ELSE 0 END), 0) AS bidCount,
                    COALESCE(SUM(CASE WHEN DATA_STAT IN ('REQ', 'BIDDING') THEN DRIVER_BIDDING_PRICE ELSE 0 END), 0) AS bidAmountSum,
                    COALESCE(SUM(CASE WHEN DATA_STAT = 'CONFIRM' THEN 1 ELSE 0 END), 0) AS confirmCount,
                    COALESCE(SUM(CASE WHEN DATA_STAT = 'CONFIRM' THEN DRIVER_BIDDING_PRICE ELSE 0 END), 0) AS confirmAmountSum
               FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ?`, [custId]
        );

        const now = new Date();
        res.json({
            year: now.getFullYear(), month: now.getMonth() + 1,
            currentMonthTotal: Number(currSum.total), previousMonthTotal: Number(prevSum.total),
            diffFromPrevious: Number(currSum.total) - Number(prevSum.total),
            bidCount: Number(agg.bidCount), bidAmountSum: Number(agg.bidAmountSum),
            confirmCount: Number(agg.confirmCount), confirmAmountSum: Number(agg.confirmAmountSum)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { if (connection) connection.release(); }
});



/**
 * 여행자 견적 목록 (역경매)
 * GET /api/list-of-traveler-quotations?driverId=
 */
app.get('/api/list-of-traveler-quotations', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { driverId } = req.query;

        const sameDayBlock = driverId
            ? ` AND NOT EXISTS (
                SELECT 1
                  FROM TB_BUS_RESERVATION res
                  INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res.REQ_ID
                 WHERE res.DRIVER_ID = ?
                   AND res.RES_STAT = 'CONFIRM'
                   AND DATE(ar.START_DT) = DATE(r.START_DT)
                   AND ar.REQ_ID <> r.REQ_ID
              )`
            : '';

        const params = driverId ? [driverId] : [];

        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                         AS reqId,
                r.TRIP_TITLE                     AS tripTitle,
                r.START_ADDR                     AS startAddr,
                r.END_ADDR                       AS endAddr,
                r.START_DT                       AS startDt,
                r.END_DT                         AS endDt,
                r.PASSENGER_CNT                  AS passengerCnt,
                r.DATA_STAT                      AS reqStat,
                COALESCE(r.REQ_AMT, 0)           AS estTotalServicePrice,
                r.EXPIRE_DT                      AS expireDt,
                r.REG_DT                         AS regDt,
                (SELECT GROUP_CONCAT(BUS_TYPE_CD) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) as busType,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) as busCnt,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID) as waypointCount
             FROM TB_AUCTION_REQ r
             WHERE r.DATA_STAT = 'BIDDING'
               AND DATE(r.START_DT) > CURDATE()
             ${sameDayBlock}
             ORDER BY r.REG_DT DESC`,
            params
        );

        res.status(200).json({ total: rows.length, items: rows });
    } catch (error) {
        console.error('list-of-traveler-quotations:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
/**
 * 실시간 입찰 기회 (운전기사 대시보드 AuctionList)
 * GET /api/auction-list?driverId=
 */
app.get('/api/auction-list', async (req, res) => {
    const { driverId } = req.query;
    if (!driverId) {
        return res.status(400).json({ error: 'driverId가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                         AS reqId,
                r.TRIP_TITLE                     AS tripTitle,
                r.START_ADDR                     AS startAddr,
                r.END_ADDR                       AS endAddr,
                r.START_DT                       AS startDt,
                r.END_DT                         AS endDt,
                r.PASSENGER_CNT                  AS passengerCnt,
                r.DATA_STAT                      AS reqStat,
                COALESCE(r.REQ_AMT, 0)           AS reqAmt,
                r.EXPIRE_DT                      AS expireDt,
                r.REG_DT                         AS regDt,
                (SELECT BUS_TYPE_CD FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID LIMIT 1) AS busType,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) AS busCnt,
                (SELECT res.RES_STAT
                   FROM TB_BUS_RESERVATION res
                  WHERE res.REQ_ID = r.REQ_ID
                    AND res.DRIVER_ID = ?
                  ORDER BY res.REG_DT DESC
                  LIMIT 1
                )                                AS myBidStat
             FROM TB_AUCTION_REQ r
             WHERE r.DATA_STAT = 'BIDDING'
               AND DATE(r.START_DT) > CURDATE()
               AND NOT EXISTS (
                    SELECT 1
                      FROM TB_BUS_RESERVATION res2
                      INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res2.REQ_ID
                     WHERE res2.DRIVER_ID = ?
                       AND res2.RES_STAT = 'CONFIRM'
                       AND DATE(ar.START_DT) = DATE(r.START_DT)
                       AND ar.REQ_ID <> r.REQ_ID
                   )
             ORDER BY r.REG_DT DESC`,
            [driverId, driverId]
        );
        res.status(200).json({ total: rows.length, items: rows });
    } catch (error) {
        console.error('auction-list:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});






/**
 * 여행자 견적 요청 상세 조회
 * GET /api/traveler-quote-request-details?reqId=&driverId=
 * - TB_AUCTION_REQ (마스터) + TB_AUCTION_REQ_BUS (차량) + TB_AUCTION_REQ_VIA (경유지) 조회
 * - TB_BUS_RESERVATION — 기사 입찰가 / 상태 / 회차 별도 조회
 * - 데이터 없을 경우 개발용 더미 데이터 반환
 */
app.get('/api/traveler-quote-request-details', async (req, res) => {
    let connection;
    try {
        const { reqId, custId } = req.query;
        if (!reqId) return res.status(400).json({ error: 'reqId가 필요합니다.' });

        connection = await pool.getConnection();

        // 1. TB_AUCTION_REQ 마스터 조회
        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                     AS reqId,
                r.TRAVELER_ID                AS travelerId,
                r.TRIP_TITLE                 AS tripTitle,
                r.START_ADDR                 AS startAddr,
                r.END_ADDR                   AS endAddr,
                r.START_DT                   AS startDt,
                r.END_DT                     AS endDt,
                r.PASSENGER_CNT              AS passengerCnt,
                r.DATA_STAT                  AS reqStat,
                COALESCE(r.REQ_AMT, 0)       AS estTotalServicePrice,
                r.EXPIRE_DT                  AS expireDt,
                r.REG_DT                     AS regDt
             FROM TB_AUCTION_REQ r
             WHERE r.REQ_ID = ?`,
            [reqId]
        );

        // 2. TB_BUS_RESERVATION 별도 조회 (최신 회차 레코드 + 이전 취소 입찰가)
        let resId = null, driverBiddingPrice = 0, resStat = 'REQ', prevBidPrice = 0, bidSeq = 0;
        if (custId) {
            // 최신 입찰 레코드 (BID_SEQ DESC LIMIT 1)
            const [resRows] = await connection.execute(
                `SELECT RES_ID                            AS resId,
                        COALESCE(DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
                        COALESCE(DATA_STAT, 'REQ')        AS resStat,
                        COALESCE(BID_SEQ, 1)              AS bidSeq
                   FROM TB_BUS_RESERVATION
                  WHERE REQ_ID = ? AND DRIVER_ID = ?
                  ORDER BY BID_SEQ DESC LIMIT 1`,
                [reqId, custId]
            );
            if (resRows.length > 0) {
                resId              = resRows[0].resId;
                driverBiddingPrice = Number(resRows[0].driverBiddingPrice) || 0;
                resStat            = resRows[0].resStat || 'REQ';
                bidSeq             = Number(resRows[0].bidSeq) || 1;
            }
            // 이전 취소 입찰가 (CANCELLATION_OF_BID 중 BID_SEQ 최대)
            const [prevRows] = await connection.execute(
                `SELECT COALESCE(DRIVER_BIDDING_PRICE, 0) AS prevBidPrice
                   FROM TB_BUS_RESERVATION
                  WHERE REQ_ID = ? AND DRIVER_ID = ?
                    AND DATA_STAT = 'CANCELLATION_OF_BID'
                  ORDER BY BID_SEQ DESC LIMIT 1`,
                [reqId, custId]
            );
            if (prevRows.length > 0) prevBidPrice = Number(prevRows[0].prevBidPrice) || 0;
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: '견적 요청 정보를 찾을 수 없습니다.' });
        }

        const master = rows[0];

        // 3. TB_AUCTION_REQ_BUS 차량 정보 조회
        const [busRows] = await connection.execute(
            `SELECT BUS_TYPE_CD AS busType, COUNT(*) AS busCnt
               FROM TB_AUCTION_REQ_BUS
              WHERE REQ_ID = ?
              GROUP BY BUS_TYPE_CD`,
            [reqId]
        );
        const busInfo = busRows.length > 0 ? busRows[0] : { busType: null, busCnt: 1 };

        // 4. TB_AUCTION_REQ_VIA 경유지 조회
        const [viaRows] = await connection.execute(
            `SELECT
                VIA_SEQ       AS sortOrder,
                VIA_ADDR      AS waypointAddr,
                STOP_TIME_MIN AS stopTimeMin
             FROM TB_AUCTION_REQ_VIA
             WHERE REQ_ID = ?
             ORDER BY VIA_SEQ`,
            [reqId]
        );

        // 5. 가격 가이드
        const priceGuide = { avgBid: null };

        res.status(200).json({
            ...master,
            busType:  busInfo.busType,
            busCnt:   busInfo.busCnt,
            resId,
            driverBiddingPrice,
            resStat,
            bidSeq,
            prevBidPrice,
            waypoints: viaRows,
            priceGuide,
        });
    } catch (error) {
        console.error('traveler-quote-request-details:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 입찰가 수정 / 신규 등록
 * PUT /api/traveler-quote-request-details/bid
 * Body: { resId?, reqId?, driverId?, bidPrice }
 * - resId 또는 (reqId + driverId) 중 하나 필수
 * - DRIVER_BIDDING_PRICE 갱신 허용
 */
const RES_STAT_LABEL = { CONFIRM: '확정', DONE: '완료', TRAVELER_CANCEL: '여행자 취소', DRIVER_CANCEL: '버스기사 취소' };

app.use('/api/live-chat-bus-driver', createLiveChatBusDriverRouter(pool));
app.use('/api/live-chat-traveler', createLiveChatTravelerRouter(pool));
app.use('/api/user/device-token', createUserDeviceTokenRouter(pool));

(async function startServer() {
    console.log('\n==================================================');
    console.log('🚀 busTaams 서버 초기화 시작...');
    console.log('📅 시점:', new Date().toLocaleString());
    console.log('==================================================\n');

    let connection;
    try {
        console.log('📡 [1/3] 데이터베이스 연결 시도 중...');
        connection = await pool.getConnection();
        console.log('✅ [1/3] DB 연결 성공!');
        // DDL 권한 제한으로 인해 테이블 생성/관리 로직 제거됨
    } catch (e) {
        console.error('⚠️ DB 연결 확인 실패:', e.message);
    } finally {
        if (connection) connection.release();
    }

// API: 공통 코드 조회
app.get('/api/common/codes/:grpCd', async (req, res) => {
    try {
        const { grpCd } = req.params;
        const [rows] = await pool.execute(`
            SELECT GRP_CD, DTL_CD, CD_NM_KO AS DTL_NM, CD_DESC, DISP_ORD AS SORT_SEQ 
            FROM TB_COMMON_CODE 
            WHERE GRP_CD = ? 
            AND USE_YN = 'Y' 
            ORDER BY DISP_ORD ASC
        `, [grpCd]);
        res.json(rows);
    } catch (error) {
        console.error('Fetch Codes Error:', error);
        res.status(500).json({ error: '코드 조회 중 오류가 발생했습니다.' });
    }
});

    app.listen(PORT, () => {
        console.log(`🚀 busTaams REST API Server is running beautifully on http://localhost:${PORT}`);
    });
})();

/**
 * [공통] 카카오 알림톡 발송 및 이력 저장 유틸리티
 * @param {string} reqId 견적 요청 ID (선택사항)
 * @param {string} receiverId 수신자 ID
 * @param {string} receiverPhone 수신 휴대폰 번호
 * @param {string} content 메시지 내용
 * @param {string} category 발송 상황 구분 (REQ_REG, CONFIRM, JOIN 등)
 */
async function sendAlimTalkAndLog({ reqId, receiverId, receiverPhone, content, category }) {
    let connection;
    try {
        console.log(`[ALIMTALK SENDING] To: ${receiverPhone}, Category: ${category}`);
        console.log(`[CONTENT] \n${content}`);

        /**
         * [TODO] 실제 카카오 알림톡 발송 업체 API 호출부 (솔라피, 알리고 등)
         * 예시 (SOLAPI 기준):
         * const { SolapiMessageService } = require('solapi-sdk');
         * const messageService = new SolapiMessageService('YOUR_API_KEY', 'YOUR_API_SECRET');
         * await messageService.sendOne({
         *   to: receiverPhone,
         *   from: '01012345678', // 발신번호 (발신번호 등록 필수)
         *   text: content,
         *   kakaoOptions: {
         *     pfId: 'YOUR_PF_ID', // 플러스친구 ID
         *     templateId: 'YOUR_TEMPLATE_ID' // 템플릿 ID
         *   }
         * });
         */
        const sendStat = 'SUCCESS'; 

        connection = await pool.getConnection();

        // [ID 생성] 최신 16자리 숫자 ID 생성 (문자 포함된 ID 제외하고 숫자 규격만 필터링)
        const [[{ maxLogId }]] = await connection.execute("SELECT MAX(LOG_ID) AS maxLogId FROM TB_SMS_LOG WHERE LOG_ID REGEXP '^[0-9]+$'");
        const logId = generateNextNumericId(maxLogId || '0', 16);

        const query = `
            INSERT INTO TB_SMS_LOG (
                LOG_ID, REQ_ID, RECEIVER_ID, RECEIVER_PHONE, 
                MSG_CONTENT, MSG_TYPE, SEND_STAT, SEND_CATEGORY, REG_DT
            ) VALUES (
                ?, ?, ?, ?, ?, 'ALIMTALK', ?, ?, NOW()
            )
        `;

        const params = [
            logId, 
            reqId || null, 
            receiverId, 
            receiverPhone, 
            content, 
            sendStat, 
            category
        ];

        await connection.execute(query, params);
        console.log(`[ALIMTALK LOG SAVED] LogID: ${logId}`);

    } catch (err) {
        console.error('AlimTalk Send or Log Error:', err);
    } finally {
        if (connection) connection.release();
    }
}
