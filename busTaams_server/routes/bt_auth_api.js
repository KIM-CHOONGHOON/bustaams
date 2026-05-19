const express = require('express');
const bcrypt = require('bcrypt');
console.log('\n---------------------------------------------------------');
console.log('✅ [LOADED] bt_auth_api.js (WITHDRAW PW CHECK ENABLED)');
console.log('---------------------------------------------------------\n');
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
    sendAlimTalkAndLog,
    orgFileNmAndExt,
} = require('../lib/bt_common_utils');

const aligoService = require('../services/bt_comm_handler');

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

    // [GET] 전화번호 중복 체크 (유저 타입별 중복 허용 및 레거시 복호화 대응)
    router.get('/check-phone', async (req, res) => {
        let connection;
        try {
            const { phoneNo, userType } = req.query;
            if (!phoneNo) return res.status(400).json({ error: 'phoneNo가 필요합니다.' });
            connection = await pool.getConnection();
            
            // 유저 타입 정규화 및 매핑
            let targetUserType = null;
            if (userType) {
                const ut = String(userType).toUpperCase().trim();
                if (ut === 'CONSUMER' || ut === 'TRAVELER' || ut === 'CUSTOMER') targetUserType = 'TRAVELER';
                else if (ut === 'DRIVER') targetUserType = 'DRIVER';
                else if (ut === 'SALES' || ut === 'SALESPERSON' || ut === 'PARTNER') targetUserType = 'PARTNER';
            }

            let rows;
            if (targetUserType) {
                // 지정된 유저 타입 그룹 내에서만 휴대폰 번호 조회
                [rows] = await connection.execute('SELECT HP_NO FROM TB_USER WHERE USER_TYPE = ?', [targetUserType]);
            } else {
                // 하위 호환성을 위해 유저 타입이 지정되지 않은 경우 전체 사용자 조회
                [rows] = await connection.execute('SELECT HP_NO FROM TB_USER');
            }

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
        
        // 6자리 난수 생성
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        smsCodeStore.set(cleaned, { code, expiresAt: Date.now() + SMS_CODE_TTL });
        
        console.log(`[SMS AUTH] Phone: ${cleaned}, Code: ${code}`);

        // 알리고 발송 (비동기)
        aligoService.sendSms({
            receiver: cleaned,
            message: `[busTaams] 인증번호는 [${code}] 입니다.`,
            category: 'AUTH'
        }).catch(e => console.error('SMS Send Error:', e.message));
        
        res.json({ success: true, message: `인증번호가 발송되었습니다.` });
    });

    // [POST] SMS 인증번호 확인
    router.post('/verify-sms', async (req, res) => {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) return res.status(400).json({ error: '전화번호와 인증코드가 필요합니다.' });
        const cleaned = phoneNumber.replace(/-/g, '');

        const entry = smsCodeStore.get(cleaned);
        
        // 테스트용 고정 코드 '123456' 허용
        const isTestCode = (code === '123456');

        if (!isTestCode && (!entry || entry.code !== code.trim() || Date.now() > entry.expiresAt)) {
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
                recomCode, residentNo
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

            // [추가] 주민등록번호 중복 체크 (기 가입자 확인)
            if (userType === 'DRIVER' && residentNo) {
                const cleanedRrn = residentNo.replace(/-/g, '');
                const [allUsers] = await connection.execute('SELECT RESIDENT_NO_ENC FROM TB_USER WHERE RESIDENT_NO_ENC IS NOT NULL');
                const isDuplicate = allUsers.some(row => {
                    try {
                        return decrypt(row.RESIDENT_NO_ENC) === cleanedRrn;
                    } catch (e) { return false; }
                });

                if (isDuplicate) {
                    connection.release();
                    return res.status(409).json({ error: '이미 가입된 사용자입니다. (주민번호 중복)' });
                }
            }

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
                    CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, RESIDENT_NO_ENC, SNS_TYPE, 
                    SMS_AUTH_YN, USER_TYPE, RECOM_CODE, SIGNATURE_FILE_ID, PROFILE_FILE_ID,
                    JOIN_DT, USER_STAT, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NONE', 'Y', ?, ?, ?, ?, NOW(), 'ACTIVE', NOW(), ?)
            `;

            await connection.execute(userQuery, [
                nextCustId, userId, email, hashedPassword, userName, 
                phoneNo, 
                residentNo ? encrypt(residentNo.replace(/-/g, '')) : null,
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

            const { orgFileNm: sigOrgNm, fileExt: sigExt } = orgFileNmAndExt('signature.png', {
                ext: 'png',
                mime: 'image/png',
                orgName: 'signature.png',
            });

            await connection.execute(`
                INSERT INTO TB_FILE_MASTER (
                    FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                    ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, 'SIGNATURE', ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
            `, [nextFileId, bucketName, `https://storage.googleapis.com/${bucketName}/${sigGcsPath}`, sigOrgNm, sigExt, sigBuffer.length, nextCustId, nextCustId]);

            // 4-1. 프로필 사진 처리 (기사 전용)
            if (mappedUserType === 'DRIVER' && photoBase64) {
                const photoMimeMatch = photoBase64.match(/^data:image\/([^;]+);base64,/);
                const rawMimeSub = photoMimeMatch?.[1] || 'png';
                const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const parsedLike = {
                    buffer: photoBuffer,
                    ext: rawMimeSub,
                    mime: `image/${rawMimeSub}`,
                    orgName: String(photoName || 'photo').replace(/[^a-zA-Z0-9._-가-힣]/g, '_'),
                };
                const { orgFileNm, fileExt } = orgFileNmAndExt(photoName, parsedLike);
                const photoFileName = `${nextProfileFileId}.${fileExt}`;
                const photoGcsPath = `profiles/${photoFileName}`;
                const photoGcsFile = bucket.file(photoGcsPath);
                await photoGcsFile.save(photoBuffer, { metadata: { contentType: `image/${rawMimeSub}` }, resumable: false });
                uploadedFiles.push(photoGcsFile);

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (?, 'PROFILE', ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                `, [nextProfileFileId, bucketName, `https://storage.googleapis.com/${bucketName}/${photoGcsPath}`, orgFileNm, fileExt, photoBuffer.length, nextCustId, nextCustId]);
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

            // 알리고 가입 완료 문자 발송
            aligoService.sendSms({
                receiverId: nextCustId,
                receiver: phoneNo.replace(/-/g, ''),
                category: 'JOIN',
                message: `[busTaams] ${userName}님, 회원가입을 감사드립니다. 고품격 버스 여행의 기준을 경험해보세요!`
            }).catch(e => console.error('Welcome SMS Error:', e.message));

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

            // 사용자 상태 체크 (ACTIVE인 경우만 로그인 가능)
            if (user.USER_STAT !== 'ACTIVE') {
                return res.status(403).json({ error: '로그인이 제한된 계정입니다. 고객센터에 문의해주세요.' });
            }

            const match = await bcrypt.compare(password, user.PASSWORD);
            if (!match) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

            const [cancelRow, subscriptionRow] = await Promise.all([
                fetchCancelManageForUser(pool, user),
                user.USER_TYPE === 'DRIVER' ? fetchSubscriptionForDriver(pool, user.CUST_ID) : Promise.resolve(null)
            ]);

            const userDto = buildPostLoginUserDto({ user, cancelRow, subscriptionRow });
            res.json({ message: '로그인 성공', user: userDto });

        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [POST] 회원 탈퇴
    router.post('/withdraw', async (req, res) => {
        let connection;
        try {
            const { custId, password } = req.body;
            console.log(`\n🚨 [WITHDRAW_ATTEMPT] CustID: ${custId}, Password: ${password ? 'PROVIDED' : 'MISSING'}`);
            
            if (!custId || !password) return res.status(400).json({ error: '사용자 식별자와 비밀번호가 필요합니다.' });

            connection = await pool.getConnection();
            
            // 1. 비밀번호 검증
            const [users] = await connection.execute('SELECT PASSWORD FROM TB_USER WHERE CUST_ID = ?', [custId]);
            if (users.length === 0) {
                console.log(`❌ [WITHDRAW_FAIL] User not found: ${custId}`);
                return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
            }

            const isMatch = await bcrypt.compare(password, users[0].PASSWORD);
            console.log(`🔍 [WITHDRAW_VERIFY] Password Match: ${isMatch}`);

            if (!isMatch) {
                return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
            }

            // 2. 탈퇴 처리
            await connection.beginTransaction();
            const [result] = await connection.execute(
                'UPDATE TB_USER SET USER_STAT = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
                ['LEAVE', custId, custId]
            );

            if (result.affectedRows === 0) {
                throw new Error('사용자를 찾을 수 없거나 이미 탈퇴 처리되었습니다.');
            }

            await connection.commit();
            res.json({ success: true, message: '회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.' });
        } catch (e) {
            if (connection) await connection.rollback();
        } finally {
            if (connection) connection.release();
        }
    });
    
    // [POST] 아이디 찾기
    router.post('/find-id', async (req, res) => {
        let connection;
        try {
            const { userName, phoneNo } = req.body;
            if (!userName || !phoneNo) return res.status(400).json({ error: '이름과 휴대폰 번호를 입력해주세요.' });

            connection = await pool.getConnection();
            const [rows] = await connection.execute('SELECT USER_ID, HP_NO FROM TB_USER WHERE USER_NM = ? AND USER_STAT = "ACTIVE"', [userName]);
            
            // 암호화된 HP_NO 복호화 비교
            const foundUser = rows.find(row => {
                try {
                    return decrypt(row.HP_NO) === phoneNo.replace(/-/g, '');
                } catch (e) { return false; }
            });

            if (!foundUser) {
                return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다.' });
            }

            res.json({ success: true, userId: foundUser.USER_ID });
        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [POST] 비밀번호 재설정을 위한 본인 확인
    router.post('/verify-for-password', async (req, res) => {
        let connection;
        try {
            const { userId, phoneNo, email } = req.body;
            if (!userId || !phoneNo || !email) return res.status(400).json({ error: '모든 정보를 입력해주세요.' });

            connection = await pool.getConnection();
            const [rows] = await connection.execute(
                'SELECT CUST_ID, HP_NO FROM TB_USER WHERE USER_ID = ? AND EMAIL = ? AND USER_STAT = "ACTIVE"', 
                [userId, email]
            );

            const foundUser = rows.find(row => {
                try {
                    return decrypt(row.HP_NO) === phoneNo.replace(/-/g, '');
                } catch (e) { return false; }
            });

            if (!foundUser) {
                return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다.' });
            }

            res.json({ success: true, custId: foundUser.CUST_ID });
        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [POST] 비밀번호 재설정 (최종 변경)
    router.post('/reset-password', async (req, res) => {
        let connection;
        try {
            const { custId, newPassword } = req.body;
            if (!custId || !newPassword) return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [result] = await connection.execute(
                'UPDATE TB_USER SET PASSWORD = ?, MOD_DT = NOW(), MOD_ID = ? WHERE CUST_ID = ?',
                [hashedPassword, custId, custId]
            );

            if (result.affectedRows === 0) {
                throw new Error('비밀번호 변경에 실패했습니다.');
            }

            await connection.commit();
            res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
}

module.exports = createAuthRouter;
