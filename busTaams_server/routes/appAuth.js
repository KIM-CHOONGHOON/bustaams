const express = require('express');
const router = express.Router();
const { pool, getNextId, getBucket, bucketName } = require('../db');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { decrypt, encrypt } = require('../crypto');
const axios = require('axios');

/**
 * [공통] 알리고 SMS 발송 유틸리티
 */
const sendAligoSMS = async (phoneNo, authCode) => {
    const ALIGO_USER_ID = process.env.ALIGO_USER_ID;
    const ALIGO_API_KEY = process.env.ALIGO_API_KEY;
    const ALIGO_SENDER = process.env.ALIGO_SENDER;

    if (!ALIGO_USER_ID || !ALIGO_API_KEY || !ALIGO_SENDER) {
        console.error('Aligo credentials missing in environment variables');
        throw new Error('SMS 설정 오류');
    }

    const msg = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;
    
    const params = new URLSearchParams();
    params.append('user_id', ALIGO_USER_ID);
    params.append('key', ALIGO_API_KEY);
    params.append('receiver', phoneNo);
    params.append('sender', ALIGO_SENDER);
    params.append('msg', msg);
    params.append('msg_type', 'SMS');

    try {
        const response = await axios.post('https://apis.aligo.in/send/', params);
        console.log('[Aligo Send Response]', response.data);
        return response.data;
    } catch (error) {
        console.error('Aligo SMS Send Error:', error.message);
        throw error;
    }
};


// 환경 변수 설정
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

/**
 * 주민등록번호 유효성 검증 (체크섬)
 */
const validateResidentNo = (rrn) => {
    if (!rrn || !/^[0-9]{13}$/.test(rrn)) return false;
    const digits = rrn.split('').map(Number);
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * weights[i];
    }
    const remainder = sum % 11;
    const checkValue = (11 - remainder) % 10;
    return checkValue === digits[12];
};

/**
 * [App 전용] 아이디 중복 확인 (평문 매칭)
 */
router.get('/check-id', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.json({ isAvailable: false });
        
        // USER_ID 컬럼에서 중복 확인 (전체 유형 대상)
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE USER_ID = ?', [userId]);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

/**
 * [App 전용] 이메일 중복 확인
 */
router.get('/check-email', async (req, res) => {
    try {
        const { email, userType } = req.query;
        if (!email) return res.json({ isAvailable: false });
        
        // EMAIL 컬럼에서 중복 확인 (유형별)
        const [rows] = await pool.execute(
            'SELECT 1 FROM TB_USER WHERE EMAIL = ? AND USER_TYPE = ?', 
            [email, userType || 'TRAVELER']
        );
        
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        console.error('Check email error:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

/**
 * [App 전용] 휴대폰 번호 중복 확인
 */
router.get('/check-phone', async (req, res) => {
    try {
        let { phoneNo, userType } = req.query;
        if (!phoneNo) return res.json({ isAvailable: false });
        
        phoneNo = phoneNo.replace(/[^0-9]/g, '');
        
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ? AND USER_TYPE = ?', [phoneNo, userType || 'TRAVELER']);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

const admin = require('firebase-admin');

/**
 * [App 전용] 회원가입 (Firebase Auth 휴대폰 인증 검증 포함)
 */
router.post('/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let {
            userId, password, userName, phoneNo, userType, 
            signatureBase64, termsData, mktChannelYN, email, smsAuthYn,
            firebaseToken, residentNo, recomCode
        } = req.body;

    console.log(`[Registration] Request received for user: ${userId}`);

    // 0. SMS 인증 토큰 검증 (Firebase 대신 서버 자체 발행 토큰 사용)
    let verifiedPhoneNo = phoneNo;
    if (firebaseToken) {
        try {
            // firebaseToken이라는 이름은 유지하되, 서버에서 발행한 JWT인지 확인 (리팩토링 편의상)
            const decoded = jwt.verify(firebaseToken, JWT_SECRET_KEY);
            
            if (!decoded.verified || !decoded.phoneNo) {
                throw new Error('Invalid verification token');
            }

            const cleanVerifiedPhone = decoded.phoneNo.replace(/[^0-9]/g, '');
            const cleanRequestPhone = phoneNo.replace(/[^0-9]/g, '');
            
            if (cleanVerifiedPhone !== cleanRequestPhone) {
                console.error(`[Registration] Phone mismatch: Verified(${cleanVerifiedPhone}) vs Req(${cleanRequestPhone})`);
                await connection.rollback();
                return res.status(400).json({ error: '인증된 휴대폰 번호와 입력된 번호가 일치하지 않습니다.' });
            }
            console.log(`[Registration] Phone Verified via Server Token: ${decoded.phoneNo}`);
        } catch (error) {
            console.error('[Registration] SMS Token Verification Failed:', error);
            await connection.rollback();
            return res.status(401).json({ error: '휴대폰 인증이 유효하지 않거나 만료되었습니다.' });
        }
    } else {
        return res.status(400).json({ error: '휴대폰 인증이 필요합니다.' });
    }


        // userType 대문자 정규화 (DRIVER, TRAVELER 등)
        const finalUserType = (userType || 'TRAVELER').toUpperCase();

        // [추가] 기사 주민번호 유효성 및 중복 체크 (DRIVER 타입인 경우)
        if (finalUserType === 'DRIVER') {
            if (!residentNo) {
                await connection.rollback();
                return res.status(400).json({ error: '기사 회원은 주민등록번호 입력이 필수입니다.' });
            }
            
            // 공백 제거
            residentNo = String(residentNo).replace(/\s/g, '');
            
            // 1. 형식 및 체크섬 검증
            if (!validateResidentNo(residentNo)) {
                await connection.rollback();
                return res.status(400).json({ error: '올바르지 않은 주민등록번호 형식입니다.' });
            }

            // 2. 중복 체크 (암호화된 컬럼이므로 전체 기사를 조회하여 복호화 비교)
            const [allDrivers] = await connection.execute(
                'SELECT USER_ID, RESIDENT_NO_ENC FROM TB_USER WHERE USER_TYPE = "DRIVER" AND RESIDENT_NO_ENC IS NOT NULL'
            );
            
            let existingUserId = null;
            for (const driver of allDrivers) {
                try {
                    const decrypted = decrypt(driver.RESIDENT_NO_ENC);
                    // 평문 비교 (둘 다 trim하여 비교)
                    if (decrypted && decrypted.trim() === residentNo.trim()) {
                        existingUserId = driver.USER_ID;
                        break;
                    }
                } catch (err) {
                    // 복호화 실패 시 로그만 남기고 다음으로 진행 (레거시 데이터 등)
                    console.error(`[Registration] RRN Decrypt Error for user ${driver.USER_ID}:`, err);
                }
            }

            if (existingUserId) {
                await connection.rollback();
                return res.status(400).json({ error: `이미 가입된 고객입니다. 아이디: [${existingUserId}]` });
            }
        }

        // [추가] 추천인 코드 검증 (입력된 경우 PARTNER 타입의 USER_ID인지 확인)
        if (recomCode) {
            const [partnerRows] = await connection.execute(
                'SELECT 1 FROM TB_USER WHERE USER_TYPE = "PARTNER" AND USER_ID = ?',
                [recomCode]
            );
            if (partnerRows.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: '존재하지 않는 추천인 아이디입니다.' });
            }
        }

        // 아이디 및 연락처 중복 체크
        const [existing] = await connection.execute(
            'SELECT 1 FROM TB_USER WHERE USER_ID = ? OR HP_NO = ?', 
            [userId, phoneNo]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '이미 존재하는 아이디 혹은 휴대폰 번호입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 1. CUST_ID 채번 (10자리, 0 패딩)
        const custId = await getNextId('TB_USER', 'CUST_ID', 10);

        // 2. 전자 서명 처리 (GCS 업로드 및 TB_FILE_MASTER 등록)
        let signFileId = null;
        if (signatureBase64 && signatureBase64.startsWith('data:image')) {
            const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
            const fileName = `signatures/${fileId}.png`;
            const file = getBucket().file(fileName);
            const buffer = Buffer.from(signatureBase64.split(',')[1], 'base64');
            
            // GCS 업로드
            await file.save(buffer, {
                metadata: { contentType: 'image/png' }
            });

            const gcsPath = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            signFileId = fileId;

            // TB_FILE_MASTER 삽입 (REG_ID 제거, MOD_ID를 CUST_ID로 설정, FILE_SIZE 추가)
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, MOD_ID)
                VALUES (?, 'SIGNATURE', ?, ?, ?, 'png', ?, ?)
            `;
            await connection.execute(fileQuery, [fileId, bucketName, gcsPath, `${userId}_signature.png`, buffer.length, custId]);
        }

        // 3. TB_USER 삽입 (REG_ID 제거, CUST_ID, RESIDENT_NO_ENC, RECOM_CODE 추가)
        const userQuery = `
            INSERT INTO TB_USER (
                CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT, SIGNATURE_FILE_ID,
                RESIDENT_NO_ENC, RECOM_CODE, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, 'NONE', ?, ?, NOW(), 'ACTIVE', ?, ?, ?, ?)
        `;
        
        await connection.execute(userQuery, [
            custId,
            userId, 
            email || userId, 
            hashedPassword, 
            userName, 
            phoneNo, 
            smsAuthYn || 'Y', 
            finalUserType,
            signFileId, // SIGNATURE_FILE_ID
            finalUserType === 'DRIVER' ? encrypt(residentNo) : null,
            recomCode || null,
            custId  // MOD_ID
        ]);

        // 3.5 TB_USER_CANCEL_MANAGE 초기화 (취소 건수 0으로 설정)
        // 중복 키 오류 방지를 위해 INSERT IGNORE 사용 (REG_ID 제거)
        const cancelManageQuery = `
            INSERT IGNORE INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, USER_TYPE, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, 
                CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, 
                TRADE_RESTRICT_YN, REG_ID, MOD_ID
            ) VALUES (?, ?, 0, 0, 0, 0, 'N', ?, ?)
        `;
        await connection.execute(cancelManageQuery, [custId, finalUserType, custId, custId]);

        // 4. 약관 동의 이력 처리 (TB_USER_TERMS_HIST - 키값을 CUST_ID로 변경)
        if (termsData && Array.isArray(termsData)) {
            let seq = 1;
            const validTypes = ['SERVICE', 'TRAVELER_SERVICE', 'DRIVER_SERVICE', 'PRIVACY', 'MARKETING', 'PARTNER_CONTRACT', 'LOCATION'];
            
            for (const term of termsData) {
                const agreeYn = term.agreed ? 'Y' : 'N';
                let normalizedType = (term.type || '').toUpperCase();
                
                // 앱에서 보내는 다양한 명칭 매핑
                if (normalizedType === 'PERSONAL' || normalizedType === 'PRIVACY_POLICY' || normalizedType === 'PRIVACY_INFO') normalizedType = 'PRIVACY';
                if (normalizedType === 'SERVICE_TERMS' || normalizedType === 'SERVICE_AGREEMENT') normalizedType = 'SERVICE';
                if (normalizedType === 'TRAVELER' || normalizedType === 'TRAVELER_SERVICE') {
                    normalizedType = (finalUserType === 'DRIVER') ? 'DRIVER_SERVICE' : 'TRAVELER_SERVICE';
                }
                if (normalizedType === 'DRIVER' || normalizedType === 'DRIVER_SERVICE') normalizedType = 'DRIVER_SERVICE';
                if (normalizedType === 'ADVERTISING' || normalizedType === 'AD' || normalizedType === 'PROMOTION' || normalizedType === 'EVENT' || normalizedType === '마케팅') normalizedType = 'MARKETING';
                if (normalizedType === 'PARTNER' || normalizedType === 'PARTNER_AGREEMENT' || normalizedType === 'CONTRACT') normalizedType = 'PARTNER_CONTRACT';
                if (normalizedType === 'LOCATION' || normalizedType === 'LOCATION_SERVICE' || normalizedType === 'ETC_AGREEMENT') normalizedType = 'LOCATION';
                
                if (validTypes.includes(normalizedType)) {
                    // 마케팅 세부 동의 항목 처리 (절대 놓치지 않는 초강력 딥스캔 로직)
                    const isY = (val) => {
                        if (val === true || val === 1) return true;
                        if (typeof val === 'string') {
                            const v = val.trim().toUpperCase();
                            return v === 'Y' || v === 'TRUE' || v === 'YES' || v === 'ON' || v === 'checked';
                        }
                        return false;
                    };
                    
                    const deepSearch = (targetWord) => {
                        const target = targetWord.toLowerCase();
                        const scan = (obj) => {
                            if (!obj || typeof obj !== 'object') return false;
                            if (Array.isArray(obj)) {
                                for (const item of obj) if (scan(item)) return true;
                                return false;
                            }
                            for (const [k, v] of Object.entries(obj)) {
                                const key = k.toLowerCase();
                                if (key.includes(target) && isY(v)) return true;
                                if (Array.isArray(v)) {
                                    if (v.some(item => String(item).toLowerCase().includes(target) && isY(item))) return true;
                                    for (const item of v) if (typeof item === 'object' && scan(item)) return true;
                                } else if (typeof v === 'object' && scan(v)) return true;
                            }
                            return false;
                        };
                        return scan(req.body);
                    };

                    // 마케팅 세부 동의 항목 초기화
                    let mktSms = 'N', mktPush = 'N', mktEmail = 'N', mktTel = 'N';

                    if (normalizedType === 'MARKETING') {
                        // 1. 현재 term 객체에 channels가 있는 경우 (Signup.jsx 구조)
                        if (term.channels) {
                            const c = term.channels;
                            mktSms = isY(c.sms) ? 'Y' : 'N';
                            mktPush = isY(c.push || c.alarm) ? 'Y' : 'N';
                            mktEmail = isY(c.email) ? 'Y' : 'N';
                            mktTel = isY(c.tel || c.phone || c.call) ? 'Y' : 'N';
                        }
                        
                        // 2. mktChannelYN 필드 확인 (하위 호환성)
                        if (mktChannelYN && typeof mktChannelYN === 'object') {
                            if (mktSms === 'N') mktSms = isY(mktChannelYN.sms) ? 'Y' : 'N';
                            if (mktPush === 'N') mktPush = isY(mktChannelYN.push || mktChannelYN.alarm) ? 'Y' : 'N';
                            if (mktEmail === 'N') mktEmail = isY(mktChannelYN.email) ? 'Y' : 'N';
                            if (mktTel === 'N') mktTel = isY(mktChannelYN.tel || mktChannelYN.phone) ? 'Y' : 'N';
                        }
                        
                        // 3. 만약 여전히 N이라면 딥스캔 수행 (최후의 수단)
                        if (mktSms === 'N') mktSms = deepSearch('sms') ? 'Y' : 'N';
                        if (mktPush === 'N') mktPush = (deepSearch('push') || deepSearch('alarm')) ? 'Y' : 'N';
                        if (mktEmail === 'N') mktEmail = deepSearch('email') ? 'Y' : 'N';
                        if (mktTel === 'N') mktTel = (deepSearch('tel') || deepSearch('phone') || deepSearch('call')) ? 'Y' : 'N';
                        
                        console.log(`[Registration] Marketing Result for ${userId} - SMS:${mktSms}, PUSH:${mktPush}, EMAIL:${mktEmail}, TEL:${mktTel}`);
                        console.log(`[Registration] term.channels:`, JSON.stringify(term.channels || {}));
                    }

                    const histQuery = `
                        INSERT INTO TB_USER_TERMS_HIST (
                            CUST_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, 
                            MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN,
                            SIGN_FILE_ID, AGREE_DT
                        ) VALUES (?, ?, ?, 'v1.0', ?, ?, ?, ?, ?, ?, NOW())
                    `;

                    await connection.execute(histQuery, [
                        custId, 
                        seq++, 
                        normalizedType, 
                        agreeYn,
                        mktSms, mktPush, mktEmail, mktTel,
                        signFileId
                    ]);
                } else {
                    // 4개 데이터 중 하나가 여기서 걸렸을 가능성 대비 로그 강화
                    console.warn(`[Registration] Warning: Unknown terms type skipped: "${term.type}" (Normalized: "${normalizedType}") for User: ${userId}`);
                }
            }
        }
 
         await connection.commit();
        console.log(`✅ App user registered: ${userId}`);
        res.status(201).json({ success: true, message: '앱 전용 회원가입 및 약관 동의가 완료되었습니다.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('App Registration Error:', err);
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App 전용] 로그인 (평문 데이터 매칭)
 */
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        console.log(`[App Login] Attempt for user: ${userId}`);
        
        // USER_ID 컬럼이 평문으로 저장되어 있으므로 직접 쿼리 가능 (속도 향상)
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ? AND USER_STAT = "ACTIVE"', [userId]);
        
        if (rows.length === 0) {
            console.log(`[App Login] Failed: User ${userId} not found or inactive`);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.PASSWORD);
        if (!match) {
            console.log(`[App Login] Failed: Password mismatch for ${userId}`);
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

        console.log(`[App Login] Success: ${userId} (${user.CUST_ID})`);
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
        console.error('[App Login] Critical Error:', err);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});

/**
 * [App 전용] 아이디 찾기 (휴대폰 번호로 검색)
 * - SMS 인증 토큰(verifyToken) 필수
 */
router.post('/find-id', async (req, res) => {
    try {
        let { phoneNo, verifyToken } = req.body;
        if (!phoneNo) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });
        if (!verifyToken) return res.status(400).json({ error: '휴대폰 인증이 필요합니다.' });

        // 1. 인증 토큰 검증
        try {
            const decoded = jwt.verify(verifyToken, JWT_SECRET_KEY);
            const cleanTokenPhone = decoded.phoneNo.replace(/[^0-9]/g, '');
            const cleanRequestPhone = phoneNo.replace(/[^0-9]/g, '');

            if (!decoded.verified || cleanTokenPhone !== cleanRequestPhone) {
                return res.status(401).json({ error: '인증 정보가 일치하지 않거나 유효하지 않습니다.' });
            }
        } catch (error) {
            console.error('[Find ID] Token Verification Failed:', error);
            return res.status(401).json({ error: '인증이 만료되었습니다. 다시 시도해주세요.' });
        }

        console.log(`[Find ID] Searching for: ${phoneNo}`);

        // 2. 휴대폰 번호로 직접 조회 (평문이므로 가능)
        const [rows] = await pool.execute(
            'SELECT USER_ID FROM TB_USER WHERE HP_NO = ? AND USER_STAT = "ACTIVE"', 
            [phoneNo]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: '해당 번호로 가입된 아이디 정보가 없습니다.' });
        }

        const userId = rows[0].USER_ID;
        if (!userId) {
            return res.status(404).json({ error: '사용자 아이디 정보가 유효하지 않습니다.' });
        }

        // [변경] 보안 마스킹 제거 - 요청에 따라 전체 아이디 반환
        res.json({ success: true, userId: userId });
    } catch (err) {
        console.error('Find ID Critical Error:', err);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
});

/**
 * [App 전용] 비밀번호 재설정 (Firebase Auth 인증 후 호출)
 */
router.post('/reset-password', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { userId, phoneNo, newPassword, firebaseToken } = req.body;

        if (!userId || !phoneNo || !newPassword || !firebaseToken) {
            return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
        }

        // 1. 인증 토큰 검증
        let verifiedPhoneNo = '';
        try {
            const decoded = jwt.verify(firebaseToken, JWT_SECRET_KEY);
            if (!decoded.verified || !decoded.phoneNo) {
                throw new Error('Invalid verification token');
            }

            const cleanVerifiedPhone = decoded.phoneNo.replace(/[^0-9]/g, '');
            const cleanRequestPhone = phoneNo.replace(/[^0-9]/g, '');

            if (cleanVerifiedPhone !== cleanRequestPhone) {
                await connection.rollback();
                return res.status(400).json({ error: '인증된 휴대폰 번호와 입력된 번호가 일치하지 않습니다.' });
            }
            verifiedPhoneNo = cleanRequestPhone;
        } catch (error) {
            console.error('[ResetPassword] SMS Token Verification Failed:', error);
            await connection.rollback();
            return res.status(401).json({ error: '휴대폰 인증이 유효하지 않거나 만료되었습니다.' });
        }


        // 2. 사용자 존재 및 번호 일치 확인
        const [rows] = await connection.execute(
            'SELECT CUST_ID FROM TB_USER WHERE USER_ID = ? AND HP_NO = ? AND USER_STAT = "ACTIVE"',
            [userId, verifiedPhoneNo]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다.' });
        }

        const custId = rows[0].CUST_ID;

        // 3. 새 비밀번호 해싱 및 업데이트
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await connection.execute(
            'UPDATE TB_USER SET PASSWORD = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
            [hashedPassword, custId, custId]
        );

        await connection.commit();
        console.log(`✅ Password reset success for user: ${userId}`);
        res.json({ success: true, message: '비밀번호가 성공적으로 재설정되었습니다.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: '비밀번호 재설정 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App 전용] 휴대폰 인증번호 발송
 * type: signup (가입), find-account (비밀번호 재설정), verify (단순 인증)
 */
router.post('/send-code', async (req, res) => {
    try {
        let { phoneNo, type, userType } = req.body;
        if (!phoneNo) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });

        phoneNo = phoneNo.replace(/[^0-9]/g, '');
        const verificationType = type || 'signup';

        // 기가입 여부 확인 로직 분기 (유형별 중복 체크)
        if (verificationType === 'signup') {
            const [existing] = await pool.execute(
                'SELECT 1 FROM TB_USER WHERE HP_NO = ? AND USER_TYPE = ?', 
                [phoneNo, userType || 'TRAVELER']
            );
            if (existing.length > 0) {
                return res.status(400).json({ success: false, error: '해당 유형으로 이미 가입된 휴대폰 번호입니다.' });
            }
        } else if (verificationType === 'find-account') {
            const [existing] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ?', [phoneNo]);
            if (existing.length === 0) {
                return res.status(400).json({ success: false, error: '가입되지 않은 휴대폰 번호입니다.' });
            }
        }

        // 6자리 인증번호 생성
        const authCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 실제 SMS 발송 (Aligo)
        let sendStat = 'SUCCESS';
        let errorMsg = null;
        try {
            const aligoRes = await sendAligoSMS(phoneNo, authCode);
            if (aligoRes.result_code !== '1') {
                sendStat = 'FAIL';
                errorMsg = aligoRes.message || '알리고 응답 오류';
            }
        } catch (e) {
            sendStat = 'FAIL';
            errorMsg = e.message;
        }

        let currentCustId = '0000000000';
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET_KEY);
                if (decoded && decoded.custId) currentCustId = decoded.custId;
            } catch (e) {}
        }

        // TB_SMS_LOG에 발송 이력 저장
        const msgContent = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;
        
        // SEND_CATEGORY를 type에 따라 저장
        const categoryMap = {
            'signup': 'SIGN_UP',
            'find-account': 'FIND_ACCOUNT',
            'verify': 'VERIFY'
        };
        const category = categoryMap[verificationType] || 'VERIFY';

        await pool.execute(
            `INSERT INTO TB_SMS_LOG (
                SEND_CATEGORY, SENDER_ID, RECEIVER_PHONE, RECEIVER_ID, REG_ID, MSG_CONTENT, MSG_TYPE, SEND_STAT, ERROR_MSG, REG_DT
            ) VALUES (?, 'SYSTEM', ?, ?, ?, ?, 'SMS', ?, ?, NOW())`,
            [category, phoneNo, currentCustId, currentCustId, msgContent, sendStat, errorMsg]
        );

        if (sendStat === 'FAIL') {
            return res.status(500).json({ error: '인증번호 발송 실패: ' + errorMsg });
        }

        console.log(`[SMS 발송 완료] Type: ${verificationType}, To: ${phoneNo}, Code: ${authCode}`);
        res.json({ success: true, message: '인증번호가 발송되었습니다.' });

    } catch (err) {
        console.error('Send code error:', err);
        res.status(500).json({ error: '인증번호 발송 중 오류가 발생했습니다.' });
    }
});

/**
 * [App 전용] 휴대폰 인증번호 확인
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { phoneNo, code, type } = req.body;
        if (!phoneNo || !code) return res.status(400).json({ error: '번호와 인증코드를 모두 입력해주세요.' });

        const verificationType = type || 'signup';
        const categoryMap = {
            'signup': 'SIGN_UP',
            'find-account': 'FIND_ACCOUNT',
            'verify': 'VERIFY'
        };
        const category = categoryMap[verificationType] || 'VERIFY';

        // TB_SMS_LOG에서 해당 번호와 카테고리의 가장 최신 인증번호 조회
        const [rows] = await pool.execute(
            `SELECT MSG_CONTENT FROM TB_SMS_LOG 
             WHERE RECEIVER_PHONE = ? AND SEND_CATEGORY = ?
             ORDER BY REG_DT DESC LIMIT 1`,
            [phoneNo, category]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: '발송된 인증번호가 없습니다.' });
        }

        const msgContent = rows[0].MSG_CONTENT;
        const match = msgContent.includes(`[${code}]`);

        if (match) {
            // 인증 성공 시 서버 자체 토큰 발행 (30분 유효)
            const verifyToken = jwt.sign(
                { phoneNo, verified: true, type: verificationType },
                JWT_SECRET_KEY,
                { expiresIn: '30m' }
            );
            res.json({ success: true, message: '인증되었습니다.', verifyToken });
        } else {
            res.status(400).json({ success: false, error: '인증번호가 일치하지 않습니다.' });
        }

    } catch (err) {
        console.error('Verify code error:', err);
        res.status(500).json({ error: '인증 확인 중 오류가 발생했습니다.' });
    }
});

console.log('>>> APP AUTH ROUTER LOADED SUCCESSFULLY');
module.exports = router;

