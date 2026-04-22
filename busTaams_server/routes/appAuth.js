const express = require('express');
const router = express.Router();
const { pool, getNextId, bucket, bucketName } = require('../db');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { decrypt, encrypt } = require('../crypto');

// 환경 변수 설정
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

/**
 * [App 전용] 아이디 중복 확인 (평문 매칭)
 */
router.get('/check-id', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.json({ isAvailable: false });
        
        // USER_ID 컬럼에서 중복 확인
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
        const { email } = req.query;
        if (!email) return res.json({ isAvailable: false });
        
        // EMAIL 컬럼에서 중복 확인
        const [rows] = await pool.execute(
            'SELECT 1 FROM TB_USER WHERE EMAIL = ?', 
            [email]
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
        let { phoneNo } = req.query;
        if (!phoneNo) return res.json({ isAvailable: false });
        
        phoneNo = phoneNo.replace(/[^0-9]/g, '');
        
        const [rows] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ?', [phoneNo]);
        res.json({ isAvailable: rows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: '서버 오류' });
    }
});

/**
 * [App 전용] 회원가입 (약관 동의 이력 및 서명 파일 처리 포함)
 */
router.post('/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

    const { 
        userId, password, userName, phoneNo, userType, 
        signatureBase64, termsData, mktChannelYN, email, smsAuthYn 
    } = req.body;

    console.log(`[Registration] Request received for user: ${userId}`);
    // console.log('[Registration] req.body:', JSON.stringify(req.body, null, 2)); // 전체 바디 로그 (필요 시 주석 해제)

    // ... (중략: 중복 체크 및 서명 처리 로직)

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
            const file = bucket.file(fileName);
            const buffer = Buffer.from(signatureBase64.split(',')[1], 'base64');
            
            // GCS 업로드
            await file.save(buffer, {
                metadata: { contentType: 'image/png' }
            });

            const gcsPath = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            signFileId = fileId;

            // TB_FILE_MASTER 삽입 (REG_ID, MOD_ID를 CUST_ID로 설정)
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID)
                VALUES (?, 'SIGNATURE', ?, ?, ?, 'png', ?, ?)
            `;
            await connection.execute(fileQuery, [fileId, bucketName, gcsPath, `${userId}_signature.png`, custId, custId]);
        }

        // 3. TB_USER 삽입 (개인정보 암호화 준수, CUST_ID 추가)
        const userQuery = `
            INSERT INTO TB_USER (
                CUST_ID, USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT, PROFILE_FILE_ID
            ) VALUES (?, ?, ?, ?, ?, ?, 'NONE', ?, ?, NOW(), 'ACTIVE', ?)
        `;
        
        const finalUserType = userType || 'TRAVELER';

        await connection.execute(userQuery, [
            custId,
            userId, 
            email || userId, 
            hashedPassword, 
            userName, 
            phoneNo, 
            smsAuthYn || 'Y', 
            finalUserType,
            signFileId // 서명 이미지의 FILE_ID를 PROFILE_FILE_ID 컬럼에 저장
        ]);

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
                if (normalizedType === 'TRAVELER' || normalizedType === 'TRAVELER_SERVICE') normalizedType = 'TRAVELER_SERVICE';
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
                    
                    // 특정 단어(sms, push 등)가 포함된 키가 Body 어디에든 있고 그 값이 'Y'류인지 딥스캔
                    const deepSearch = (targetWord) => {
                        const target = targetWord.toLowerCase();
                        
                        // 재귀적으로 객체 내부를 뒤지는 함수
                        const scan = (obj) => {
                            if (!obj || typeof obj !== 'object') return false;
                            
                            // 1. 현재 객체의 키 값들 확인
                            for (const [k, v] of Object.entries(obj)) {
                                const key = k.toLowerCase();
                                // 키에 단어가 포함되어 있고 값이 Y류인 경우
                                if (key.includes(target) && isY(v)) return true;
                                // 값이 배열인 경우 (예: channels: ['sms', 'push'])
                                if (Array.isArray(v) && v.some(item => String(item).toLowerCase().includes(target))) return true;
                                // 값이 또 다른 객체인 경우 재귀 탐색
                                if (typeof v === 'object' && !Array.isArray(v) && scan(v)) return true;
                            }
                            return false;
                        };
                        
                        return scan(req.body);
                    };

                    // 마케팅 세부 동의 항목 초기화 (MARKETING 타입일 때만 딥스캔 수행)
                    let mktSms = 'N', mktPush = 'N', mktEmail = 'N', mktTel = 'N';

                    if (normalizedType === 'MARKETING') {
                        mktSms = deepSearch('sms') ? 'Y' : 'N';
                        mktPush = (deepSearch('push') || deepSearch('alarm')) ? 'Y' : 'N';
                        mktEmail = deepSearch('email') ? 'Y' : 'N';
                        mktTel = (deepSearch('tel') || deepSearch('phone') || deepSearch('call')) ? 'Y' : 'N';
                        
                        console.log(`[Registration] Marketing DeepScan Result - User: ${userId}, SMS:${mktSms}, PUSH:${mktPush}, EMAIL:${mktEmail}, TEL:${mktTel}`);
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
        
        // USER_ID 컬럼이 평문으로 저장되어 있으므로 직접 쿼리 가능 (속도 향상)
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ? AND USER_STAT = "ACTIVE"', [userId]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.PASSWORD);
        if (!match) {
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
        console.error('App Login Error:', err);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});

/**
 * [App 전용] 아이디 찾기 (휴대폰 번호로 검색)
 * - 평문 매칭 우선 시도
 * - 실패 시 암호화된 기존 데이터(Web 가입자 등) 복호화 매칭 시도
 */
router.post('/find-id', async (req, res) => {
    try {
        let { phoneNo } = req.body;
        if (!phoneNo) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });

        // 휴대폰 번호 정규화 (하이픈 제거 등)
        phoneNo = phoneNo.replace(/[^0-9]/g, '');

        console.log(`[Find ID] Searching for: ${phoneNo}`);

        // 1. 휴대폰 번호로 직접 조회 (평문이므로 가능)
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
 * [App 전용] 비밀번호 찾기 (임시 비밀번호 발급 및 SNS 발송)
 */
router.post('/find-password', async (req, res) => {
    try {
        let { userId, phoneNo } = req.body;
        if (!userId || !phoneNo) return res.status(400).json({ error: '아이디와 휴대폰 번호를 모두 입력해주세요.' });

        // 휴대폰 번호 정규화
        phoneNo = phoneNo.replace(/[^0-9]/g, '');

        // 1. 아이디와 휴대폰 번호로 사용자 조회 (성함, CUST_ID 포함)
        const [rows] = await pool.execute(
            'SELECT USER_NM, CUST_ID FROM TB_USER WHERE USER_ID = ? AND HP_NO = ? AND USER_STAT = "ACTIVE"', 
            [userId, phoneNo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다.' });
        }
        const userName = rows[0].USER_NM;
        const custId = rows[0].CUST_ID;

        // 2. 임시 비밀번호 생성 (8자리 랜덤 영문+숫자)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // 3. DB 업데이트 (MOD_ID, MOD_DT 포함)
        await pool.execute('UPDATE TB_USER SET PASSWORD = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?', [hashedPassword, custId, userId]);

        // 4. TB_SMS_LOG에 발송 이력 저장 (요청 규격 준수, LOG_SEQ 채번)
        const msgContent = `[busTaams] ${userName}님, 임시 비밀번호는 [${tempPassword}] 입니다. 로그인 후 변경해주세요.`;
        const logSeq = await getNextId('TB_SMS_LOG', 'LOG_SEQ', 10);
        
        await pool.execute(
            `INSERT INTO TB_SMS_LOG (
                LOG_SEQ, SEND_CATEGORY, SENDER_ID, RECEIVER_ID, REG_ID, RECEIVER_PHONE, MSG_CONTENT, MSG_TYPE, SEND_STAT, REG_DT
            ) VALUES (?, 'NEW_PASSWORD', 'SYSTEM', ?, ?, ?, ?, 'SMS', 'SUCCESS', NOW())`,
            [logSeq, custId, custId, phoneNo, msgContent]
        );

        // 5. 서버 로그 확인용
        console.log(`[SNS 발송 시뮬레이션] To: ${phoneNo}, Message: ${msgContent}`);

        res.json({ 
            success: true, 
            message: '임시 비밀번호가 휴대폰으로 발송되었습니다. (시뮬레이션: 서버 로그 확인)' 
        });
    } catch (err) {
        console.error('Find PW error:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

/**
 * [App 전용] 휴대폰 인증번호 발송
 */
router.post('/send-code', async (req, res) => {
    try {
        let { phoneNo } = req.body;
        if (!phoneNo) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });

        phoneNo = phoneNo.replace(/[^0-9]/g, '');

        // 기가입 여부 확인
        const [existing] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = ?', [phoneNo]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '이미 가입된 휴대폰 번호입니다.' });
        }

        // 6자리 인증번호 생성
        const authCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // [수정] 로그인 상태일 경우 CUST_ID를 REG_ID/RECEIVER_ID로 사용
        let currentCustId = '0000000000';
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET_KEY);
                if (decoded && decoded.custId) currentCustId = decoded.custId;
            } catch (e) {
                // 토큰 무효 시 시스템 아이디 유지
            }
        }

        // TB_SMS_LOG에 발송 이력 저장 (LOG_SEQ 채번)
        const msgContent = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;
        const logSeq = await getNextId('TB_SMS_LOG', 'LOG_SEQ', 10);
        
        await pool.execute(
            `INSERT INTO TB_SMS_LOG (
                LOG_SEQ, SEND_CATEGORY, SENDER_ID, RECEIVER_PHONE, RECEIVER_ID, REG_ID, MSG_CONTENT, MSG_TYPE, SEND_STAT, REG_DT
            ) VALUES (?, 'OTHER', 'SYSTEM', ?, ?, ?, ?, 'SMS', 'SUCCESS', NOW())`,
            [logSeq, phoneNo, currentCustId, currentCustId, msgContent]
        );

        // 시뮬레이션을 위해 실제 발송은 생략하고 로그 확인
        console.log(`[SMS 발송 시뮬레이션] To: ${phoneNo}, Code: ${authCode}`);

        // 데모 목적으로 클라이언트에 인증번호를 돌려줌 (실제 운영 환경에서는 절대 금지)
        res.json({ success: true, message: '인증번호가 발송되었습니다.', debugCode: authCode });
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
        const { phoneNo, code } = req.body;
        if (!phoneNo || !code) return res.status(400).json({ error: '번호와 인증코드를 모두 입력해주세요.' });

        // TB_SMS_LOG에서 해당 번호의 가장 최신 인증번호 조회
        const [rows] = await pool.execute(
            `SELECT MSG_CONTENT FROM TB_SMS_LOG 
             WHERE RECEIVER_PHONE = ? AND SEND_CATEGORY = 'OTHER'
             ORDER BY REG_DT DESC LIMIT 1`,
            [phoneNo]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: '발송된 인증번호가 없습니다.' });
        }

        const msgContent = rows[0].MSG_CONTENT;
        const match = msgContent.includes(`[${code}]`);

        if (match) {
            res.json({ success: true, message: '인증되었습니다.' });
        } else {
            res.status(400).json({ success: false, error: '인증번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        console.error('Verify code error:', err);
        res.status(500).json({ error: '인증 확인 중 오류가 발생했습니다.' });
    }
});

module.exports = router;

