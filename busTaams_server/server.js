const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { encrypt, decrypt } = require('./crypto');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------

// API 1-0: 아이디 중복 검사
app.get('/api/auth/check-id', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

        // [보안] 아이디(이메일)는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await pool.execute('SELECT USER_ID_ENC FROM TB_USER');
        const isDuplicate = rows.some(row => {
            try { return decrypt(row.USER_ID_ENC) === userId; } catch (e) { return false; }
        });
        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 아이디입니다.' });
        }
        return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
        console.error('Check ID error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// API 1-2: 전화번호 중복 검사
app.get('/api/auth/check-phone', async (req, res) => {
    try {
        const { phoneNo } = req.query;
        if (!phoneNo) return res.status(400).json({ error: 'phoneNo query parameter is required' });

        // [보안] 휴대폰 번호는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await pool.execute('SELECT HP_NO FROM TB_USER');
        const isDuplicate = rows.some(row => {
            try { return decrypt(row.HP_NO) === phoneNo; } catch (e) { return false; }
        });
        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 가입된 휴대폰 번호입니다.' });
        }
        return res.status(200).json({ isAvailable: true });
    } catch (error) {
        console.error('Check phone error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
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
    try {
        const {
            userId, password, userName, phoneNo, userType,
            firebaseIdToken, mktAgreeYn, signatureBase64, agreedTerms
        } = req.body;

        if (!userId || !password || !userName || !phoneNo || !signatureBase64 || !agreedTerms || !userType) {
            console.error('Registration Failed: Missing fields', {
                userId: !!userId, password: !!password, userName: !!userName, 
                phoneNo: !!phoneNo, signatureBase64: !!signatureBase64, 
                agreedTerms: !!agreedTerms, userType: !!userType
            });
            return res.status(400).json({ error: '필수 항목이 누락되었습니다. (ID, 비밀번호, 이름, 전화번호, 서명, 약관동의, 사용자타입)' });
        }

        // 1. [보안] 인증 토큰 검증 - (테스트 단계: 항상 'Y'로 처리)
        let smsAuthYn = 'Y';
        console.log('Test Mode: SMS Auth always bypassed with Y');

        // 2. [보안] 비밀번호 해싱 (bcrypt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. [스토리지] 서명 사진 적재 (GCS)
        const newUserUuid = randomUUID(); // 회원용 고정 UUID 생성
        const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const dateStr = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM format
        // [보안] 파일명에서도 이메일 누출 방지를 위해 UUID 사용
        const signFileUuid = randomUUID();
        const fileName = `${dateStr}/${signFileUuid}.png`;
        const file = bucket.file(`signatures/${fileName}`);
        
        try {
            await file.save(buffer, {
                metadata: { contentType: 'image/png' },
                resumable: false
            });
        } catch(gcsError) {
            console.error('GCS Upload Failed. Perhaps credentials are not configured?', gcsError.message);
            // In dev environment, we might want to proceed without crashing if GCS is not set up perfectly yet.
            // If in production, we MUST throw.
            if(process.env.NODE_ENV === 'production') throw gcsError;
        }
        
        const gcsUrl = `https://storage.googleapis.com/${bucketName}/signatures/${fileName}`;

        // 4. DB 트랜잭션 시작
        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // [DB 트랜잭션] TB_USER INSERT
            const encryptedUserId = encrypt(userId);
            const encryptedUserName = encrypt(userName);
            const encryptedPhoneNo = encrypt(phoneNo);

            // UserType Mapping
            let mappedUserType = 'TRAVELER';
            if (userType === 'CONSUMER') mappedUserType = 'TRAVELER';
            else if (userType === 'SALES') mappedUserType = 'PARTNER';
            else if (userType === 'DRIVER') mappedUserType = 'DRIVER';

            const userQuery = `
                INSERT INTO TB_USER (
                    USER_UUID, USER_ID_ENC, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                    SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT
                ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, 'NONE', ?, ?, NOW(), 'ACTIVE')
            `;
            const [userResult] = await connection.execute(userQuery, [
                newUserUuid, encryptedUserId, hashedPassword, encryptedUserName, encryptedPhoneNo,
                smsAuthYn, mappedUserType
            ]);

            // [DB 트랜잭션] TB_FILE_MASTER INSERT (서명 파일 정보 등록)
            // TB_USER_TERMS_HIST의 SIGN_FILE_UUID가 이 테이블을 참조함 (F.K)
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (
                    FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                    ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                ) VALUES (UUID_TO_BIN(?), 'SIGNATURE', ?, ?, ?, 'png', ?, NOW())
            `;
            await connection.execute(fileQuery, [
                signFileUuid, bucketName, fileName, 'signature.png', buffer.length
            ]);

            // [DB 트랜잭션] TB_USER_TERMS_HIST 다중 INSERT
            if (agreedTerms.length > 0) {
                const histQuery = `
                    INSERT INTO TB_USER_TERMS_HIST (
                        USER_UUID, TERMS_TYPE, TERMS_VER, AGREE_YN, SIGN_FILE_UUID, AGREE_DT
                    ) VALUES (UUID_TO_BIN(?), ?, 'v1.0', 'Y', UUID_TO_BIN(?), NOW())
                `;
                
                const termsMapping = {
                    1: 'SERVICE',
                    2: 'PRIVACY',
                    4: 'MARKETING'
                };

                for (const termId of agreedTerms) {
                    const type = termsMapping[termId];
                    if (type) {
                        try {
                            await connection.execute(histQuery, [newUserUuid, type, signFileUuid]);
                        } catch (histErr) {
                            console.error(`Terms Hist Insert Failed for ${type}:`, histErr.message);
                            // 히스토리 저장 실패가 전체 가입을 막게 할지 여부는 정책에 따라 다름. 
                            // 여기서는 트랜잭션이므로 에러를 던져 롤백하게 함.
                            throw histErr;
                        }
                    }
                }
            }

            await connection.commit();
            
            res.status(201).json({
                message: "회원가입이 성공적으로 완료되었습니다.",
                signFileUuid: signFileUuid 
            });

        } catch (dbError) {
            await connection.rollback();
            // GCS 업로드된 파일 롤백(삭제)
            file.delete().catch(e => console.error('GCS Rollback Delete Failed (Ignored):', e.message));
            throw dbError; // outer catch로 전달
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('회원가입 트랜잭션 에러:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: '이미 존재하는 사용자(아이디)입니다.' });
        }
        res.status(500).json({ error: '시스템 오류로 인해 처리에 실패했습니다.' });
    }
});
 
// 로그인 API (POST /api/users/login)
app.post('/api/users/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        // [보안] 아이디(이메일)는 암호화되어 있으므로 전체 조회 후 비교 (데이터가 많아지면 인덱스용 해시 컬럼 필요)
        const [rows] = await pool.execute('SELECT * FROM TB_USER');
        const user = rows.find(row => {
            try { return decrypt(row.USER_ID_ENC) === userId; } catch (e) { return false; }
        });

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        res.status(200).json({
            message: '로그인 성공',
            user: {
                userId: userId,
                userName: decrypt(user.USER_NM),
                userType: user.USER_TYPE
            }
        });

    } catch (error) {
        console.error('로그인 백엔드 통신 에러:', error);
        res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다.' });
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
            userId, // REG_ID
            userId  // MOD_ID
        ];

        await pool.execute(query, params);

        res.status(200).json({ 
            message: '기사님 프로필이 성공적으로 저장되었습니다.',
            profileImgUrl,
            licenseImgUrl
        });

    } catch (error) {
        console.error('기사 프로필 저장 에러:', error);
        res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' });
    }
});
 
// 서버 기동
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://127.0.0.1:${PORT}`);
});
