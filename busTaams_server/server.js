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

// 서버 기동
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://127.0.0.1:${PORT}`);
});
