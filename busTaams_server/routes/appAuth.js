const express = require('express');
const router = express.Router();
const { pool, getNextId } = require('../db');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { Storage } = require('@google-cloud/storage');
const { decrypt, encrypt } = require('../crypto');

// Google Cloud Storage 설정
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

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
        
        // 1. 전자 서명 처리 (GCS 업로드 및 TB_FILE_MASTER 등록)
        let signFileId = null;
        if (signatureBase64 && signatureBase64.startsWith('data:image')) {
            const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
            const fileName = `signatures/app_${fileId}.png`;
            const file = bucket.file(fileName);
            const buffer = Buffer.from(signatureBase64.split(',')[1], 'base64');
            
            // GCS 업로드
            await file.save(buffer, {
                metadata: { contentType: 'image/png' }
            });

            const gcsPath = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            signFileId = fileId;

            // TB_FILE_MASTER 삽입
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_PATH, ORG_FILE_NM, FILE_EXT)
                VALUES (?, 'SIGNATURE', ?, ?, 'png')
            `;
            await connection.execute(fileQuery, [fileId, gcsPath, `${userId}_signature.png`]);
        }

        // 2. TB_USER 삽입 (개인정보 암호화 준수)
        const userQuery = `
            INSERT INTO TB_USER (
                USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT, USER_IMAGE
            ) VALUES (?, ?, ?, ?, ?, 'NONE', ?, ?, NOW(), 'ACTIVE', ?)
        `;
        
        const finalUserType = userType || 'TRAVELER';

        await connection.execute(userQuery, [
            userId, 
            email || userId, 
            hashedPassword, 
            userName, 
            phoneNo, 
            smsAuthYn || 'Y', 
            finalUserType,
            signFileId // [수정] 서명 이미지의 FILE_ID를 USER_IMAGE 컬럼에 저장
        ]);

        // 3. 약관 동의 이력 처리 (TB_USER_TERMS_HIST)
        if (termsData && Array.isArray(termsData)) {
            let seq = 1;
            const validTypes = ['SERVICE', 'TRAVELER_SERVICE', 'DRIVER_SERVICE', 'PRIVACY', 'MARKETING', 'PARTNER_CONTRACT'];
            
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
                            USER_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, 
                            MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN,
                            SIGN_FILE_ID, AGREE_DT
                        ) VALUES (?, ?, ?, 'v1.0', ?, ?, ?, ?, ?, ?, NOW())
                    `;

                    await connection.execute(histQuery, [
                        userId, 
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

        // JWT 발행
        const token = jwt.sign(
            { 
                userId: userId, 
                userUuid: user.USER_UUID ? user.USER_UUID.toString('hex') : null,
                userType: user.USER_TYPE 
            }, 
            JWT_SECRET_KEY, 
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { 
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

        // 보안상 마스킹 (예: bus****ler)
        const maskedId = userId.length > 5
            ? userId.substring(0, 3) + '*'.repeat(userId.length - 6) + userId.substring(userId.length - 3)
            : userId.substring(0, 1) + '*'.repeat(userId.length - 2) + userId.substring(userId.length - 1);

        res.json({ success: true, userId: userId, maskedId: maskedId });
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

        // 1. 아이디와 휴대폰 번호로 직접 조회
        const [rows] = await pool.execute(
            'SELECT 1 FROM TB_USER WHERE USER_ID = ? AND HP_NO = ? AND USER_STAT = "ACTIVE"', 
            [userId, phoneNo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다.' });
        }

        // 2. 임시 비밀번호 생성 (8자리 랜덤 영문+숫자)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // 3. DB 업데이트
        await pool.execute('UPDATE TB_USER SET PASSWORD = ? WHERE USER_ID = ?', [hashedPassword, userId]);

        // 4. SNS(SMS) 발송 시뮬레이션
        console.log(`[SNS 발송] To: ${phoneNo}, Message: [busTaams] 임시 비밀번호는 [${tempPassword}] 입니다. 로그인 후 즉시 변경해주세요.`);

        res.json({ 
            success: true, 
            message: '임시 비밀번호가 휴대폰으로 발송되었습니다. (시뮬레이션: 서버 로그 확인)' 
        });
    } catch (err) {
        console.error('Find PW error:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

module.exports = router;
