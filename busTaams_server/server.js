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

        // [보안] 아이디(이메일)는 암호화되어 있으므로 전체 조회 후 비교
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

        const decryptedUserName = user.USER_NM ? decrypt(user.USER_NM) : '';
        const decryptedPhoneNo = user.HP_NO ? decrypt(user.HP_NO) : '';

        res.status(200).json({
            message: '로그인 성공',
            user: {
                userId: userId,
                email: userId,
                userName: decryptedUserName,
                phoneNo: decryptedPhoneNo,
                phoneNumber: decryptedPhoneNo,
                userType: user.USER_TYPE
            }
        });

    } catch (error) {
        console.error('로그인 에러:', error.message);
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
 
// 서버 기동
// API: 기사 프로필 설정 (Profile Setup)
app.post('/api/driver/profile-setup', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, rrn, licenseType, licenseNo, licenseIssueDt, licenseExpiryDt,
            qualCertNo, bioText, profilePhotoBase64, qualCertBase64
        } = req.body;

        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const encryptedRrn = encrypt(rrn || '');
            let profilePhotoUuid = null;
            let qualCertUuid = null;

            // 1. 프로필 사진 업로드
            if (profilePhotoBase64 && profilePhotoBase64.startsWith('data:image')) {
                profilePhotoUuid = randomUUID();
                const buffer = Buffer.from(profilePhotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const fileName = `profiles/${new Date().toISOString().slice(0, 7).replace('-', '')}/${profilePhotoUuid}.png`;
                const file = bucket.file(fileName);
                await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'BUS_PHOTO', ?, ?, 'profile.png', 'png', ?, NOW())
                `, [profilePhotoUuid, bucketName, fileName, buffer.length]);
            }

            // 2. 자격증 사본 업로드
            if (qualCertBase64 && qualCertBase64.startsWith('data:')) {
                qualCertUuid = randomUUID();
                const isPdf = qualCertBase64.includes('pdf');
                const ext = isPdf ? 'pdf' : 'png';
                const buffer = Buffer.from(qualCertBase64.replace(/^data:[\w\/]+;base64,/, ""), 'base64');
                const fileName = `certificates/${new Date().toISOString().slice(0, 7).replace('-', '')}/${qualCertUuid}.${ext}`;
                const file = bucket.file(fileName);
                await file.save(buffer, { metadata: { contentType: isPdf ? 'application/pdf' : 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'LICENSE', ?, ?, 'cert.${ext}', ?, ?, NOW())
                `, [qualCertUuid, bucketName, fileName, ext, buffer.length]);
            }

            // 3. TB_DRIVER_INFO 저장 (Upsert)
            const driverQuery = `
                INSERT INTO TB_DRIVER_INFO (
                    USER_UUID, RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_ISSUE_DT, 
                    LICENSE_EXPIRY_DT, QUAL_CERT_NO, QUAL_CERT_FILE_UUID, PROFILE_PHOTO_UUID, BIO_TEXT, UPDATE_DT
                ) VALUES (
                    UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, 
                    ${qualCertUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
                    ${profilePhotoUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
                    ?, NOW()
                )
                ON DUPLICATE KEY UPDATE 
                    RRN_ENC = VALUES(RRN_ENC),
                    LICENSE_TYPE = VALUES(LICENSE_TYPE),
                    LICENSE_NO = VALUES(LICENSE_NO),
                    LICENSE_ISSUE_DT = VALUES(LICENSE_ISSUE_DT),
                    LICENSE_EXPIRY_DT = VALUES(LICENSE_EXPIRY_DT),
                    QUAL_CERT_NO = VALUES(QUAL_CERT_NO),
                    BIO_TEXT = VALUES(BIO_TEXT),
                    UPDATE_DT = NOW()
            `;
            
            const params = [userUuid, encryptedRrn, licenseType, licenseNo, licenseIssueDt, licenseExpiryDt, qualCertNo];
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
app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://localhost:${PORT}`);
});
