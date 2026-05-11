const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { encrypt, decrypt } = require('../crypto');
const { 
    buildPostLoginUserDto, 
    fetchCancelManageForUser, 
    fetchSubscriptionForDriver 
} = require('../lib/loginPayload');
const { 
    generateNextNumericId, 
    verifyFirebasePhoneIdTokenIfRequired,
    sendAlimTalkAndLog
} = require('../lib/bt_common_utils');

/**
 * BusTaams 인증 관련 API (로그인, 회원가입, SMS 인증)
 * @param {object} pool DB 연결 풀
 * @param {object} admin Firebase Admin 객체
 * @param {Map} smsVerifiedPhoneStore 인증 완료 번호 저장소
 * @param {object} bucket GCS 버킷 객체
 * @param {string} bucketName GCS 버킷 이름
 * @returns {express.Router}
 */
function createAuthRouter(pool, admin, smsVerifiedPhoneStore, bucket, bucketName) {
    const router = express.Router();
    const smsCodeStore = new Map(); // key: phoneNumber, value: { code, expiresAt }
    const SMS_CODE_TTL = 3 * 60 * 1000; // 3분
    const SMS_VERIFIED_TTL_MS = 15 * 60 * 1000;

    // [GET] ID 중복 체크
    router.get('/check-id', async (req, res) => {
        let connection;
        try {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });
            connection = await pool.getConnection();
            const [rows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
            
            if (rows.length > 0) {
                return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 아이디입니다.' });
            }
            return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [GET] 전화번호 중복 체크
    router.get('/check-phone', async (req, res) => {
        let connection;
        try {
            const { phoneNo } = req.query;
            if (!phoneNo) return res.status(400).json({ error: 'phoneNo가 필요합니다.' });
            connection = await pool.getConnection();
            
            // 보안상 전체 스캔 후 복호화 비교 (기존 로직 유지)
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
        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [POST] SMS 인증번호 요청
    router.post('/send-sms', async (req, res) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: '전화번호가 필요합니다.' });
        const cleaned = phoneNumber.replace(/-/g, '');
        
        const code = '123456'; // 개발용 고정 코드
        smsCodeStore.set(cleaned, { code, expiresAt: Date.now() + SMS_CODE_TTL });
        console.log(`[SMS AUTH] Phone: ${cleaned}, Code: ${code} (Expires in 3m)`);
        
        res.json({ success: true, message: `인증번호가 발송되었습니다. (개발모드: ${code})` });
    });

    // [POST] SMS 인증번호 확인
    router.post('/verify-sms', async (req, res) => {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) return res.status(400).json({ error: '전화번호와 인증코드가 필요합니다.' });
        const cleaned = phoneNumber.replace(/-/g, '');

        const entry = smsCodeStore.get(cleaned);
        if (!entry || entry.code !== code.trim() || Date.now() > entry.expiresAt) {
            return res.status(400).json({ verified: false, error: '인증번호가 일치하지 않거나 만료되었습니다.' });
        }

        smsCodeStore.delete(cleaned);
        smsVerifiedPhoneStore.set(cleaned, { expiresAt: Date.now() + SMS_VERIFIED_TTL_MS });
        res.json({ verified: true, message: '휴대폰 인증이 완료되었습니다.' });
    });

    // [POST] 회원가입 (Original Logic Restored)
    router.post('/register', async (req, res) => {
        let connection;
        let uploadedFiles = []; 
        try {
            const {
                userId, email, password, userName, phoneNo, userType,
                firebaseIdToken, mktAgreeYn, signatureBase64, photoBase64, photoName, agreedTerms,
                recomCode
            } = req.body;

            if (!userId || !password || !userName || !phoneNo || !signatureBase64 || !agreedTerms || !userType) {
                return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
            }

            // 1. 휴대전화 인증 확인
            const cleanedPhoneForVerify = String(phoneNo).replace(/-/g, '');
            const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(admin, smsVerifiedPhoneStore, firebaseIdToken, {
                smsVerifiedPhone: cleanedPhoneForVerify,
            });
            if (!phoneVerify.ok) {
                return res.status(400).json({ error: phoneVerify.error });
            }

            // 2. 비밀번호 해싱
            const hashedPassword = await bcrypt.hash(password, 10);

            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 3. ID 생성 및 데이터 매핑
            const [maxUserRows] = await connection.execute('SELECT MAX(CUST_ID) as maxId FROM TB_USER');
            const nextCustId = generateNextNumericId(maxUserRows[0].maxId || '0', 10);

            const [maxFileRows] = await connection.execute("SELECT MAX(FILE_ID) as maxFileId FROM TB_FILE_MASTER WHERE FILE_ID REGEXP '^[0-9]+$'");
            const baseFileId = maxFileRows[0].maxFileId || '0';
            const nextFileId = generateNextNumericId(baseFileId, 20);
            const nextProfileFileId = generateNextNumericId(nextFileId, 20);

            let mappedUserType = 'TRAVELER';
            if (userType === 'CONSUMER' || userType === 'TRAVELER') mappedUserType = 'TRAVELER';
            else if (userType === 'SALES' || userType === 'SALESPERSON' || userType === 'PARTNER') mappedUserType = 'PARTNER';
            else if (userType === 'DRIVER') mappedUserType = 'DRIVER';

            // [DB] TB_USER INSERT
            const userQuery = `
                INSERT INTO TB_USER (
                    CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                    SMS_AUTH_YN, USER_TYPE, RECOM_CODE, SIGNATURE_FILE_ID, PROFILE_FILE_ID,
                    JOIN_DT, USER_STAT, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, 'NONE', 'Y', ?, ?, ?, ?, NOW(), 'ACTIVE', NOW(), ?)
            `;

            await connection.execute(userQuery, [
                nextCustId, userId, email, hashedPassword, userName, phoneNo,
                mappedUserType, mappedUserType === 'DRIVER' ? recomCode : null,
                nextFileId, (mappedUserType === 'DRIVER' && photoBase64) ? nextProfileFileId : null,
                nextCustId
            ]);

            // [DB] TB_USER_CANCEL_MANAGE
            await connection.execute(`
                INSERT IGNORE INTO TB_USER_CANCEL_MANAGE (
                    CUST_ID, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, 
                    CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, 
                    TRADE_RESTRICT_YN, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, 0, 0, 0, 0, 'N', NOW(), ?, NOW(), ?)
            `, [nextCustId, nextCustId, nextCustId]);

            // 4. 전자 서명 처리 (GCS)
            const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/png;base64,/, ""), 'base64');
            const sigFileName = `${nextFileId}.png`;
            const sigGcsPath = `signatures/${sigFileName}`;
            const sigGcsFile = bucket.file(sigGcsPath);
            await sigGcsFile.save(sigBuffer, { metadata: { contentType: 'image/png' }, resumable: false });
            uploadedFiles.push(sigGcsFile);

            await connection.execute(`
                INSERT INTO TB_FILE_MASTER (
                    FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                    ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, 'SIGNATURE', ?, ?, ?, 'png', ?, NOW(), ?, NOW(), ?)
            `, [nextFileId, bucketName, `https://storage.googleapis.com/${bucketName}/${sigGcsPath}`, nextFileId, sigBuffer.length, nextCustId, nextCustId]);

            // 4-1. 프로필 사진 처리 (기사 전용)
            if (mappedUserType === 'DRIVER' && photoBase64) {
                const photoExt = photoBase64.match(/data:image\/(\w+);base64/)?.[1] || 'png';
                const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const photoFileName = `${nextProfileFileId}.${photoExt}`;
                const photoGcsPath = `profiles/${photoFileName}`;
                const photoGcsFile = bucket.file(photoGcsPath);
                await photoGcsFile.save(photoBuffer, { metadata: { contentType: `image/${photoExt}` }, resumable: false });
                uploadedFiles.push(photoGcsFile);

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (?, 'PROFILE', ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                `, [nextProfileFileId, bucketName, `https://storage.googleapis.com/${bucketName}/${photoGcsPath}`, photoName || photoFileName, photoExt, photoBuffer.length, nextCustId, nextCustId]);
            }

            // 5. 약관 동의 이력
            const termsMapping = { 1: 'SERVICE', 2: 'PRIVACY', 3: 'MARKETING', 4: mappedUserType === 'DRIVER' ? 'DRIVER_SERVICE' : 'TRAVELER_SERVICE' };
            let termSeq = 1;
            for (const termId of agreedTerms) {
                const termsType = termsMapping[termId];
                if (!termsType) continue;
                const mktVal = (termsType === 'MARKETING') ? 'Y' : 'N';
                await connection.execute(`
                    INSERT INTO TB_USER_TERMS_HIST (CUST_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN, SIGN_FILE_ID, AGREE_DT)
                    VALUES (?, ?, ?, '1.0', 'Y', ?, ?, ?, ?, ?, NOW())
                `, [nextCustId, termSeq++, termsType, mktVal, mktVal, mktVal, mktVal, nextFileId]);
            }

            await connection.commit();
            smsVerifiedPhoneStore.delete(cleanedPhoneForVerify);

            // 알림톡 발송
            sendAlimTalkAndLog(pool, {
                receiverId: nextCustId,
                receiverPhone: phoneNo,
                category: 'JOIN',
                content: `[busTaams] ${userName}님, 회원가입을 감사드립니다.`
            }).catch(e => console.error('AlimTalk Error:', e.message));

            res.status(201).json({ message: "회원가입 완료", userId, custId: nextCustId });

        } catch (e) {
            if (connection) await connection.rollback();
            for (const f of uploadedFiles) f.delete().catch(() => {});
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [POST] 로그인
    router.post(['/login', '/login-legacy'], async (req, res) => {
        let connection;
        try {
            const { userId, password } = req.body;
            if (!userId || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });

            connection = await pool.getConnection();
            const [rows] = await connection.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [userId]);
            const user = rows[0];

            if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

            const match = await bcrypt.compare(password, user.PASSWORD);
            if (!match) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

            const [cancelRow, subscriptionRow] = await Promise.all([
                fetchCancelManageForUser(pool, user),
                user.USER_TYPE === 'DRIVER' ? fetchSubscriptionForDriver(pool, user.CUST_ID) : Promise.resolve(null)
            ]);

            if (cancelRow && cancelRow.TRADE_RESTRICT_YN === 'Y') {
                return res.status(403).json({ error: '거래가 제한된 사용자입니다.', type: 'TRADE_RESTRICTED' });
            }

            const userDto = buildPostLoginUserDto({ user, cancelRow, subscriptionRow });
            res.json({ message: '로그인 성공', user: userDto });

        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
}

module.exports = createAuthRouter;
