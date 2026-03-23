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

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Firebase Admin SDK Initialization
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env. Real SMS verification will be bypassed in development mode.');
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

// API 1: 이메일 중복 검사
app.get('/api/auth/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Email query parameter is required' });

        // [보안] 이메일은 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await pool.execute('SELECT USER_ID FROM TB_USER');
        const isDuplicate = rows.some(row => {
            try { return decrypt(row.USER_ID) === email; } catch (e) { return false; }
        });
        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 이메일입니다.' });
        }
        return res.status(200).json({ isAvailable: true });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// API 1-2: 전화번호 중복 검사
app.get('/api/auth/check-phone', async (req, res) => {
    try {
        const { phoneNo } = req.query;
        if (!phoneNo) return res.status(400).json({ error: 'phoneNo query parameter is required' });

        // [보안] 전화번호는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await pool.execute('SELECT PHONE_NO FROM TB_USER');
        const isDuplicate = rows.some(row => {
            try { return decrypt(row.PHONE_NO) === phoneNo; } catch (e) { return false; }
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

        if (!userId || !password || !userName || !phoneNo || !signatureBase64 || !agreedTerms) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        // 1. [보안] 인증 토큰 검증
        let authVerifyYn = 'N';
        if (process.env.NODE_ENV === 'production' && firebaseIdToken) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
                // decodedToken.phone_number matches req.body.phoneNo validation can be added here
                authVerifyYn = 'Y';
            } catch (error) {
                console.error('Firebase Auth Verification Failed:', error);
                return res.status(401).json({ error: '휴대폰 본인 인증 검증에 실패했습니다.' });
            }
        } else {
            // 개발 환경이거나 .env로 통과 허용된 경우
            console.log('Skipping real firebase token verify in non-prod or token absent dev-mode.');
            authVerifyYn = 'Y';
        }

        // 2. [보안] 비밀번호 해싱 (bcrypt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. [스토리지] 서명 사진 적재 (GCS)
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
            // [보안] 개인정보 3개 컬럼(이메일, 이름, 전화번호)을 AES-256-GCM으로 암호화 후 저장
            const encryptedUserId = encrypt(userId);
            const encryptedUserName = encrypt(userName);
            const encryptedPhoneNo = encrypt(phoneNo);

            const userQuery = `
                INSERT INTO TB_USER (
                    USER_ID, PASSWORD, USER_NM, PHONE_NO, SNS_TYPE, 
                    AUTH_VERIFY_YN, MKT_AGREE_YN, USER_TYPE
                ) VALUES (?, ?, ?, ?, 'NONE', ?, ?, ?)
            `;
            await connection.execute(userQuery, [
                encryptedUserId, hashedPassword, encryptedUserName, encryptedPhoneNo,
                authVerifyYn, mktAgreeYn || 'N', userType || 'CONSUMER'
            ]);

            // [DB 트랜잭션] TB_USER_TERMS_HIST 다중 INSERT
            if (agreedTerms.length > 0) {
                const histQuery = `
                    INSERT INTO TB_USER_TERMS_HIST (
                        USER_ID, TERMS_ID, SIGN_FILE_UUID, AGREE_YN, CLIENT_IP
                    ) VALUES ?
                `;
                const histValues = agreedTerms.map(termId => [
                    encryptedUserId, // [수정] 평문 userId -> 암호화된 ID 적용
                    termId,
                    signFileUuid, 
                    'Y',
                    req.ip || '127.0.0.1'
                ]);
                
                await connection.query(histQuery, [histValues]);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://127.0.0.1:${PORT}`);
});
