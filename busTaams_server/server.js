const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 서명 이미지 저장 경로 확인 및 생성 (./uploads/signatures)
const uploadDir = path.join(__dirname, 'uploads', 'signatures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 회원가입 API (POST /api/users/signup)
app.post('/api/users/signup', async (req, res) => {
    try {
        const {
            userId, password, userName, phoneNo,
            snsType, snsId, authVerifyYn, emailAddr,
            mktAgreeYn, userType, signature
        } = req.body;

        // 필수 검증 (소셜 타입이 아닐 경우 password, 기본적으로 userId, userName, phoneNo 필수)
        if (!userId || !userName || !phoneNo) {
            return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다.' });
        }

        // 서명 이미지 저장 처리 (Base64 to PNG File)
        let signImgPath = null;
        if (signature) {
            const base64Data = signature.replace(/^data:image\/png;base64,/, "");
            const fileName = `${userId}_sign_${Date.now()}.png`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, base64Data, 'base64');
            signImgPath = `/uploads/signatures/${fileName}`;
        }

        const query = `
            INSERT INTO TB_USER (
                USER_ID, PASSWORD, USER_NM, PHONE_NO, SNS_TYPE, 
                SNS_ID, AUTH_VERIFY_YN, EMAIL_ADDR, MKT_AGREE_YN, USER_TYPE, SIGN_IMG_PATH
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            userId,
            password || null, // 카카오/네이버 가입 시 널 허용
            userName,
            phoneNo,
            snsType || 'NONE',
            snsId || null,
            authVerifyYn || 'N', // 프론트에서 넘어온 본인인증 완료 여부
            emailAddr || userId,
            mktAgreeYn || 'N',
            userType || 'CONSUMER',
            signImgPath
        ];

        const [result] = await pool.execute(query, params);
        
        res.status(201).json({
            message: '회원 가입이 완료되었습니다.',
            data: result
        });

    } catch (error) {
        console.error('회원가입 백엔드 통신 에러:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: '이미 존재하는 사용자(아이디)입니다.' });
        }
        res.status(500).json({ error: '데이터를 저장하는 동안 오류가 발생했습니다.' });
    }
});
 
// 로그인 API (POST /api/users/login)
app.post('/api/users/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        const query = 'SELECT * FROM TB_USER WHERE USER_ID = ? AND PASSWORD = ?';
        const [rows] = await pool.execute(query, [userId, password]);

        if (rows.length === 0) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        res.status(200).json({
            message: '로그인 성공',
            user: {
                userId: rows[0].USER_ID,
                userName: rows[0].USER_NM,
                userType: rows[0].USER_TYPE
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
            userId, licenseNo, certPhotoUrl, accidentFreeDoc,
            membershipType, bioDesc, profileImgUrl
        } = req.body;

        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }

        const query = `
            INSERT INTO TB_DRIVER_DETAIL (
                USER_ID, LICENSE_NO, CERT_PHOTO_URL, ACCIDENT_FREE_DOC,
                MEMBERSHIP_TYPE, BIO_DESC, PROFILE_IMG_URL, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                LICENSE_NO = VALUES(LICENSE_NO),
                CERT_PHOTO_URL = VALUES(CERT_PHOTO_URL),
                ACCIDENT_FREE_DOC = VALUES(ACCIDENT_FREE_DOC),
                MEMBERSHIP_TYPE = VALUES(MEMBERSHIP_TYPE),
                BIO_DESC = VALUES(BIO_DESC),
                PROFILE_IMG_URL = VALUES(PROFILE_IMG_URL),
                MOD_ID = VALUES(MOD_ID)
        `;

        const params = [
            userId, 
            licenseNo || '', 
            certPhotoUrl || '', 
            accidentFreeDoc || '',
            membershipType || 'NORMAL', 
            bioDesc || '', 
            profileImgUrl || '',
            userId, // REG_ID
            userId  // MOD_ID
        ];

        await pool.execute(query, params);

        res.status(200).json({ message: '기사님 프로필이 성공적으로 저장되었습니다.' });

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
