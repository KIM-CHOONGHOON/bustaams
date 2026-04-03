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
// const { runDriverVerificationsForProfileSetup } = require('./driverVerification');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

/**
 * 회원가입(`POST /api/auth/register`)·기사정보(`POST /api/driver/profile-setup`) 공통.
 * Admin 미설정: 검증 생략(로컬 개발). 설정됨: `verifyIdToken` 필수.
 */
async function verifyFirebasePhoneIdTokenIfRequired(idToken) {
    if (!firebaseAdminConfigured()) {
        return { ok: true };
    }
    if (!idToken || typeof idToken !== 'string') {
        return { ok: false, error: '휴대전화 인증을 완료해 주세요.' };
    }
    try {
        await admin.auth().verifyIdToken(idToken);
        return { ok: true };
    } catch (e) {
        console.error('Firebase ID token verification failed:', e.message);
        return { ok: false, error: '휴대전화 인증이 유효하지 않습니다. 다시 인증해 주세요.' };
    }
}

/** TB_DRIVER_INFO 테이블이 없으면 생성 (기사 프로필 API에서 INSERT 가능하도록) */
async function ensureDriverInfoTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_DRIVER_INFO (
            USER_UUID BINARY(16) NOT NULL,
            RRN_ENC VARCHAR(512) NOT NULL,
            LICENSE_TYPE VARCHAR(50) NULL,
            LICENSE_NO VARCHAR(100) NULL,
            LICENSE_SERIAL_NO VARCHAR(100) NULL COMMENT '면허 암호일련번호(진위검증용)',
            LICENSE_ISSUE_DT DATE NULL,
            LICENSE_EXPIRY_DT DATE NULL,
            QUAL_CERT_NO VARCHAR(100) NULL,
            QUAL_CERT_FILE_UUID BINARY(16) NULL,
            PROFILE_PHOTO_UUID BINARY(16) NULL,
            BIO_TEXT TEXT NULL,
            CREATE_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            UPDATE_DT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (USER_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** TB_FILE_MASTER — 프로필/자격증 파일 메타 저장용 (없으면 INSERT 실패) */
async function ensureTbFileMasterTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_FILE_MASTER (
            FILE_UUID BINARY(16) NOT NULL,
            FILE_CATEGORY VARCHAR(50) NOT NULL,
            GCS_BUCKET_NM VARCHAR(100) DEFAULT 'bustaams-secure-data',
            GCS_PATH VARCHAR(255) NOT NULL,
            ORG_FILE_NM VARCHAR(255) NULL,
            FILE_EXT VARCHAR(10) NULL,
            FILE_SIZE BIGINT NULL,
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (FILE_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** TB_DRIVER_INFO에 면허 암호일련번호 컬럼이 없으면 추가 (진위 검증 연동용) */
async function ensureDriverInfoLicenseSerialColumn(connection) {
    try {
        await connection.execute(
            `ALTER TABLE TB_DRIVER_INFO ADD COLUMN LICENSE_SERIAL_NO VARCHAR(100) NULL COMMENT '면허 암호일련번호(진위검증용)'`
        );
    } catch (e) {
        if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
}

/**
 * 회원가입·아이디 중복검사용 TB_USER — 로컬/신규 DB에 테이블이 없을 때 생성
 * (`POST /api/auth/register` INSERT 컬럼과 정합)
 */
async function ensureTbUserTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_USER (
            USER_UUID BINARY(16) NOT NULL,
            USER_ID_ENC VARCHAR(255) NOT NULL COMMENT '로그인 ID (AES 암호문)',
            PASSWORD VARCHAR(255) NOT NULL,
            USER_NM VARCHAR(255) NOT NULL,
            HP_NO VARCHAR(255) NOT NULL,
            SNS_TYPE VARCHAR(20) NOT NULL DEFAULT 'NONE',
            SMS_AUTH_YN CHAR(1) NOT NULL DEFAULT 'N',
            USER_TYPE VARCHAR(20) NOT NULL,
            JOIN_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            USER_STAT VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            PRIMARY KEY (USER_UUID),
            UNIQUE KEY UK_USER_ID (USER_ID_ENC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
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
async function fetchDriverInfoRow(userUuid) {
    try {
        const [rows] = await pool.execute(
            `SELECT LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, LICENSE_EXPIRY_DT, QUAL_CERT_NO
             FROM TB_DRIVER_INFO WHERE USER_UUID = UUID_TO_BIN(?)`,
            [userUuid]
        );
        return rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return null;
        throw e;
    }
}

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------

// API 1-0: 아이디 중복 검사
app.get('/api/auth/check-id', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

        connection = await pool.getConnection();
        await ensureTbUserTable(connection);

        // [보안] 아이디(이메일)는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await connection.execute('SELECT USER_ID_ENC FROM TB_USER');
        const isDuplicate = rows.some((row) => {
            try {
                return decrypt(row.USER_ID_ENC) === userId;
            } catch (e) {
                return false;
            }
        });

        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 아이디입니다.' });
        }
        return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
        console.error('Check ID error:', error.code || error.message, error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
        }
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            detail: process.env.NODE_ENV !== 'production' ? String(error.message) : undefined
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
        await ensureTbUserTable(connection);

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

        // 1. [보안] Firebase Phone 인증 ID 토큰 — Admin SDK 설정 시에만 검증 (기사 프로필 API와 동일 로직)
        const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(firebaseIdToken);
        if (!phoneVerify.ok) {
            return res.status(400).json({ error: phoneVerify.error });
        }
        const smsAuthYn = 'Y';

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
        const gcsPath = `signatures/${fileName}`;
        const file = bucket.file(gcsPath);
        
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
        await ensureTbUserTable(connection);
        await connection.beginTransaction();

        try {
            // [DB 트랜잭션] TB_USER INSERT
            const encryptedUserId = encrypt(userId);
            const encryptedUserName = encrypt(userName);
            const encryptedPhoneNo = encrypt(phoneNo);

            // UserType Mapping
            let mappedUserType = 'TRAVELER';
            if (userType === 'CONSUMER') mappedUserType = 'TRAVELER';
            else if (userType === 'SALES' || userType === 'SALESPERSON') mappedUserType = 'PARTNER';
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
                signFileUuid, bucketName, gcsPath, 'signature.png', buffer.length
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
                    3: 'MARKETING',
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
 
// 로그인 API (POST /api/auth/login 또는 /api/users/login - 팀원 호환성 유지용 별칭)
app.post(['/api/auth/login', '/api/users/login'], async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        // [보안] 아이디(이메일)는 암호화되어 있으므로, 전체 조회 시 BIN_TO_UUID 활용하여 조회
        const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as USER_UUID_STR, TB_USER.* FROM TB_USER');
        const user = rows.find((row) => {
            try {
                return decrypt(row.USER_ID_ENC) === userId;
            } catch (e) {
                return false;
            }
        });

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        let decryptedUserName = '';
        try { decryptedUserName = user.USER_NM ? decrypt(user.USER_NM) : ''; } catch(e) { decryptedUserName = user.USER_NM; }

        let decryptedPhoneNo = '';
        try { decryptedPhoneNo = user.HP_NO ? decrypt(user.HP_NO) : ''; } catch(e) { decryptedPhoneNo = user.HP_NO; }

        res.status(200).json({
            message: '로그인 성공',
            user: {
                userId: userId,
                userUuid: user.USER_UUID_STR || '',
                email: userId,
                userName: decryptedUserName,
                phoneNo: decryptedPhoneNo,
                phoneNumber: decryptedPhoneNo,
                userType: user.USER_TYPE
            }
        });

    } catch (error) {
        console.error('로그인 에러:', error ? error.stack : 'Unknown error');
        res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다.', details: error ? error.toString() : 'Unknown error' });
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
            const profileFileUuid = randomUUID();
            const licenseFileUuid = randomUUID();

            if (profileImgUrl) {
                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                    ) VALUES (UUID_TO_BIN(?), 'PROFILE_IMG', ?, ?, ?, 'png', 0, NOW())
                `;
                const profileGcsPath = profileImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [profileFileUuid, bucketName, profileGcsPath, 'profile.png']);
            }

            if (licenseImgUrl) {
                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                    ) VALUES (UUID_TO_BIN(?), 'DRIVER_LICENSE', ?, ?, ?, 'png', 0, NOW())
                `;
                const licenseGcsPath = licenseImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [licenseFileUuid, bucketName, licenseGcsPath, 'license.png']);
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
        const { userUuid } = req.query;
        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });

        const [uRows] = await pool.execute(
            `SELECT USER_NM, HP_NO FROM TB_USER WHERE USER_UUID = UUID_TO_BIN(?)`,
            [userUuid]
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
                        QUAL_CERT_NO, BIO_TEXT, PROFILE_PHOTO_UUID, QUAL_CERT_FILE_UUID
                 FROM TB_DRIVER_INFO WHERE USER_UUID = UUID_TO_BIN(?)`,
                [userUuid]
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
            hasProfilePhoto: !!(d.PROFILE_PHOTO_UUID && d.PROFILE_PHOTO_UUID.length),
            hasQualCertFile: !!(d.QUAL_CERT_FILE_UUID && d.QUAL_CERT_FILE_UUID.length)
        });
    } catch (error) {
        console.error('GET driver profile-setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 견적 요청 저장 (POST /api/auction/request)
app.post('/api/auction/request', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, tripTitle, startAddr, endAddr, startDt, endDt,
            passengerCnt, totalAmount, waypoints, vehicles
        } = req.body;

        if (!userUuid || !tripTitle || !startAddr || !endAddr || !startDt || !endDt) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const reqUuid = randomUUID();
            
            // 1. TB_AUCTION_REQ (Master) Insert
            const masterQuery = `
                INSERT INTO TB_AUCTION_REQ (
                    REQ_UUID, TRAVELER_UUID, TRIP_TITLE, START_ADDR, END_ADDR, 
                    START_DT, END_DT, PASSENGER_CNT, REQ_STAT, EXPIRE_DT, 
                    REQ_AMT, REG_DT, REG_ID
                ) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, 
                    ?, ?, ?, 'BIDDING', DATE_SUB(?, INTERVAL 1 DAY), 
                    ?, NOW(), ?
                )
            `;
            
            await connection.execute(masterQuery, [
                reqUuid, userUuid, tripTitle, startAddr, endAddr,
                startDt, endDt, passengerCnt || 0, startDt,
                totalAmount || 0, userUuid // REG_ID as userUuid for now
            ]);

            // 2. TB_AUCTION_REQ_BUS (Vehicles) Insert
            if (vehicles && vehicles.length > 0) {
                const busQuery = `
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_BUS_UUID, REQ_UUID, BUS_TYPE_CD, REQ_BUS_CNT, REG_DT, REG_ID
                    ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, NOW(), ?)
                `;
                for (const bus of vehicles) {
                    if (bus.qty > 0) {
                        const busBusUuid = randomUUID();
                        await connection.execute(busQuery, [
                            busBusUuid, reqUuid, bus.type, bus.qty, userUuid
                        ]);
                    }
                }
            }

            // 3. TB_AUCTION_REQ_VIA (Waypoints) Insert
            if (waypoints && waypoints.length > 0) {
                const viaQuery = `
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        VIA_UUID, REQ_UUID, VIA_ORD, VIA_ADDR, STOP_TIME_MIN, REG_DT, REG_ID
                    ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, NOW(), ?)
                `;
                for (let i = 0; i < waypoints.length; i++) {
                    const viaUnitUuid = randomUUID();
                    await connection.execute(viaQuery, [
                        viaUnitUuid, reqUuid, i + 1, waypoints[i].address, 0, userUuid
                    ]);
                }
            }

            await connection.commit();
            res.status(201).json({ message: '견적 요청이 성공적으로 등록되었습니다.', reqUuid });

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

// 최근 견적 요청 조회 (GET /api/auction/recent/:userUuid)
app.get('/api/auction/recent/:userUuid', async (req, res) => {
    try {
        const { userUuid } = req.params;
        if (!userUuid) {
            return res.status(400).json({ error: 'userUuid is required' });
        }

        const query = `
            SELECT 
                BIN_TO_UUID(REQ_UUID) as REQ_UUID_STR, 
                TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_STAT, REQ_AMT
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_UUID = UUID_TO_BIN(?) 
            ORDER BY REG_DT DESC 
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(query, [userUuid]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: '최근 요청이 없습니다.' });
        }

        const recent = rows[0];

        // 차량 정보도 가져오기
        const busQuery = `
            SELECT BUS_TYPE_CD, REQ_BUS_CNT 
            FROM TB_AUCTION_REQ_BUS 
            WHERE REQ_UUID = UUID_TO_BIN(?)
        `;
        const [buses] = await pool.execute(busQuery, [recent.REQ_UUID_STR]);
        recent.vehicles = buses;

        res.status(200).json(recent);

    } catch (error) {
        console.error('Fetch Recent Request Error:', error);
        res.status(500).json({ error: '최근 요청 조회 중 오류가 발생했습니다.' });
    }
});

// 사용자의 모든 견적 요청 목록 조회 (GET /api/auction/user/:userUuid)
app.get('/api/auction/user/:userUuid', async (req, res) => {
    try {
        const { userUuid } = req.params;
        if (!userUuid) {
            return res.status(400).json({ error: 'userUuid is required' });
        }

        const query = `
            SELECT 
                BIN_TO_UUID(r.REQ_UUID) as REQ_UUID_STR, 
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, 
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.REQ_STAT, r.REQ_AMT,
                b.BUS_TYPE_CD, b.REQ_BUS_CNT
            FROM TB_AUCTION_REQ r
            LEFT JOIN TB_AUCTION_REQ_BUS b ON r.REQ_UUID = b.REQ_UUID
            WHERE r.TRAVELER_UUID = UUID_TO_BIN(?) AND r.REQ_STAT = 'BIDDING'
            ORDER BY r.REG_DT DESC
        `;
        
        const [rows] = await pool.execute(query, [userUuid]);
        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch User Requests Error:', error);
        res.status(500).json({ error: '사용자 예약 내역 조회 중 오류가 발생했습니다.' });
    }
});

// API: 기사 프로필 설정 (Profile Setup)
app.post('/api/driver/profile-setup', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, rrn, licenseType, licenseNo, licenseIssueDt, licenseExpiryDt,
            licenseSerialNo,
            qualCertNo, bioText, profilePhotoBase64, qualCertBase64,
            phoneIdToken,
            driverName
        } = req.body;

        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });

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

        const existingDriverRow = await fetchDriverInfoRow(userUuid);

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

        connection = await pool.getConnection();

        /* DDL은 암시적 커밋이 있을 수 있어 트랜잭션 시작 전에 실행 */
        await ensureDriverInfoTable(connection);
        await ensureTbFileMasterTable(connection);
        await ensureDriverInfoLicenseSerialColumn(connection);

        await connection.beginTransaction();

        try {
            const encryptedRrn = encrypt(rrnNorm);
            let profilePhotoUuid = null;
            let qualCertUuid = null;

            const ym = new Date().toISOString().slice(0, 7);

            // 1. 프로필 사진 — ARCHITECTURE: gs://bustaams-secure-data/profiles/driver/{YYYY-MM}/
            if (profilePhotoBase64 && profilePhotoBase64.startsWith('data:image')) {
                profilePhotoUuid = randomUUID();
                const buffer = Buffer.from(profilePhotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const gcsPath = `profiles/driver/${ym}/${profilePhotoUuid}.png`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'DRIVER_PROFILE_PHOTO', ?, ?, 'profile.png', 'png', ?, NOW())
                `, [profilePhotoUuid, bucketName, gcsPath, buffer.length]);
            }

            // 2. 운송종사자 자격증 사본 — ARCHITECTURE: gs://bustaams-secure-data/certificates/bus_licenses/
            if (qualCertBase64 && qualCertBase64.startsWith('data:')) {
                qualCertUuid = randomUUID();
                const isPdf = qualCertBase64.includes('pdf');
                const ext = isPdf ? 'pdf' : 'png';
                const buffer = Buffer.from(qualCertBase64.replace(/^data:[\w\/]+;base64,/, ""), 'base64');
                const gcsPath = `certificates/bus_licenses/${ym}/${qualCertUuid}.${ext}`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: isPdf ? 'application/pdf' : 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'BUS_QUAL_CERT', ?, ?, ?, ?, ?, NOW())
                `, [qualCertUuid, bucketName, gcsPath, `qual_cert.${ext}`, ext, buffer.length]);
            }

            // 3. TB_DRIVER_INFO 저장 (Upsert)
            const driverQuery = `
                INSERT INTO TB_DRIVER_INFO (
                    USER_UUID, RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, 
                    LICENSE_EXPIRY_DT, QUAL_CERT_NO, QUAL_CERT_FILE_UUID, PROFILE_PHOTO_UUID, BIO_TEXT, UPDATE_DT
                ) VALUES (
                    UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, 
                    ${qualCertUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
                    ${profilePhotoUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
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
                    QUAL_CERT_FILE_UUID = IFNULL(VALUES(QUAL_CERT_FILE_UUID), QUAL_CERT_FILE_UUID),
                    PROFILE_PHOTO_UUID = IFNULL(VALUES(PROFILE_PHOTO_UUID), PROFILE_PHOTO_UUID),
                    BIO_TEXT = VALUES(BIO_TEXT),
                    UPDATE_DT = NOW()
            `;
            
            const params = [
                userUuid,
                encryptedRrn,
                licenseType,
                licenseNo,
                licenseSerialNo || null,
                licenseIssueDt,
                licenseExpiryDt,
                qualCertNo
            ];
            if (qualCertUuid) params.push(qualCertUuid);
            if (profilePhotoUuid) params.push(profilePhotoUuid);
            params.push(bioText);

            await connection.execute(driverQuery, params);

            await connection.commit();
            res.status(200).json({ message: "기사 프로필 설정이 완료되었습니다." });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// CustomerDashboard API
app.get('/api/customer/active-request', async (req, res) => {
    const { uuid } = req.query;
    try {
        const [rows] = await pool.execute(`SELECT * FROM TB_BUS_REQUEST WHERE TRAVELER_UUID = UUID_TO_BIN(?) AND REQUEST_STATUS = 'OPEN' ORDER BY CREATE_DT DESC LIMIT 1`, [uuid]);
        if (rows.length === 0) return res.json(null);
        const r = rows[0];
        res.json({ id: r.REQUEST_UUID, route: `${r.DEPARTURE_LOC} → ${r.DESTINATION_LOC}`, subTitle: '대형 전세버스 패키지', startDt: '2024-10-24', description: `대형 · ${r.PASSENGER_CNT}명`, status: r.REQUEST_STATUS });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API: 버스 정보 등록 (Bus Information Setup)
app.post('/api/driver/bus', async (req, res) => {
    try {
        const {
            userUuid, vehicleNo, modelNm, manufactureYear, mileage,
            serviceClass, amenities, lastInspectDt, insuranceExpDt
        } = req.body;

        if (!userUuid || !vehicleNo) {
            return res.status(400).json({ error: 'userUuid and vehicleNo are required' });
        }

        // 테이블이 없을 경우 자동 생성 (TB_DRIVER_BUS)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS TB_DRIVER_BUS (
                BUS_UUID BINARY(16) NOT NULL PRIMARY KEY,
                USER_UUID BINARY(16) NOT NULL,
                VEHICLE_NO VARCHAR(20) NOT NULL UNIQUE,
                MODEL_NM VARCHAR(100) NOT NULL,
                MANUFACTURE_YEAR VARCHAR(10),
                MILEAGE INT DEFAULT 0,
                SERVICE_CLASS VARCHAR(50) NOT NULL,
                AMENITIES JSON,
                LAST_INSPECT_DT DATE,
                INSURANCE_EXP_DT DATE,
                BIZ_REG_FILE_UUID BINARY(16),
                TRANS_LIC_FILE_UUID BINARY(16),
                INS_CERT_FILE_UUID BINARY(16),
                REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.execute(createTableQuery);

        const busUuid = randomUUID();
        const insertQuery = `
            INSERT INTO TB_DRIVER_BUS (
                BUS_UUID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, 
                MILEAGE, SERVICE_CLASS, AMENITIES, LAST_INSPECT_DT, INSURANCE_EXP_DT
            ) VALUES (
                UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?
            )
        `;

        await pool.execute(insertQuery, [
            busUuid, userUuid, vehicleNo, modelNm, manufactureYear, 
            mileage || 0, serviceClass, JSON.stringify(amenities || {}),
            lastInspectDt || null, insuranceExpDt || null
        ]);

        res.status(201).json({ message: "차량 등록이 완료되었습니다.", busUuid });
    } catch (error) {
        console.error('Bus Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 기사 견적 리스트 조회 (Quotation Requests)
app.get('/api/driver/quotation-requests', async (req, res) => {
    try {
        const { uuid } = req.query;

        // 실제로는 TB_BUS_REQUEST 와 TB_BID를 조회해야 하나, 
        // 요구사항에 명시된 화면(QuotationRequests.html)의 텍스트와 구성을 그대로 유지하기 위한 더미 데이터 반환
        const dummyData = {
            summary: {
                title: "서울 ↔ 부산 45인승 대형버스 (왕복)",
                subTitle: "현재 요청 정보",
                notice: "선택하신 일정에 대해 총 8명의 파트너가 제안을 보냈습니다.",
                timeLeft: "04:22:15"
            },
            bids: [
                {
                    id: 1,
                    driverName: "정재훈 기사님",
                    busType: "2023년형 현대 유니버스 노블",
                    badge: "최신형",
                    rating: "4.9",
                    reviews: 128,
                    price: 1250000,
                    experience: "무사고 15년",
                    amenities: ["wifi", "usb", "verified"],
                    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDRVQEXsRneczMakBAxBKkLsynR4mCslaVZHJbUltjHB_Dvd52ACzBAVg5htOpNwka_60jObCjc_L5362k5MEbBKcbeq2m69Ou5KcUC0glkSk-ZND8y11b9Ih--vldR8Uv6f3ClXuobXbnDFml9ZKhKqWtQL5Kp0EA0nGb8oiMl1ve2tLWXkGB_DON_9DDjh1CcD5niqxnFLEzFnItTFQBmNkGGJXZJNK-RunQB6BnP_g84HWmR_6a8sk55Jp9HDWSZkjFVe5YUBAE"
                },
                {
                    id: 2,
                    driverName: "이영수 기사님",
                    busType: "2021년형 기아 그랜버드",
                    badge: "베스트 파트너",
                    rating: "4.8",
                    reviews: 84,
                    price: 1180000,
                    experience: "무사고 8년",
                    amenities: ["usb", "kitchen", "verified"],
                    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwKoOIShv-xi1ZiGzRoXzb9WxLDsn02wE5Xz7o6Cv7IDJJ_ogGe329guficHv3hgWuS5i6cWLscHWwWEJiAWi1zE1kwYD5ev55mVwJIiAgXtmAv461bphlEltLtR_b1_8Lw5UM31a0A0HZBG-JkYncBpuuW6gGzXHYVhskQ31_Rd50YpRuSGrOP5bhSeTvSpoXlVXpT8VOOZaRqH9C-_cjfTys-mNyF0vr4s5cGaY-wOo8IwIcKK-nvKH3KGKDPUiMwQR4E3ht4as"
                },
                {
                    id: 3,
                    driverName: "박강석 기사님",
                    busType: "2019년형 현대 뉴 프리미엄",
                    badge: null,
                    rating: "4.7",
                    reviews: 215,
                    price: 1050000,
                    experience: "무사고 20년",
                    amenities: ["verified"],
                    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfOmboO3y1eKoa4uKGjwHRU081liT_0pfp73FB-YCgbtLe8EBKh6CrlNI11JmCzHnaRobiV5TBxYEjue_Et2XODk3nRc922QAdvwB9UJjewJHpWhm4SZQM1Mmr0ihJkP_lcQWUTAYoJ7oluq6JzZZz8u-bdKwhDt2DbNz3DyFgHftTr6HelRkGmXbXNT7GAUQBWSLtqy_1nEYYtZRadxo_EnceuBouGiffP6xbJUsesPopXX_x3sZ0YoQJqpe6B4AW1MqdBESIzjg"
                }
            ]
        };

        res.status(200).json(dummyData);
    } catch (error) {
        console.error('Quotation Requests error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;

(async function startServer() {
    try {
        const connection = await pool.getConnection();
        try {
            await ensureTbUserTable(connection);
            console.log('✅ TB_USER 테이블 확인·생성 완료');
        } finally {
            connection.release();
        }
    } catch (e) {
        console.error('⚠️ TB_USER 부트스트랩 실패 (DB 연결·권한 확인):', e.message);
    }

    app.listen(PORT, () => {
        console.log(`🚀 busTaams REST API Server is running beautifully on http://localhost:${PORT}`);
    });
})();
