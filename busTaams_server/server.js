const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { encrypt, decrypt } = require('./crypto');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------


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


// API 4: 로그인 (Standard & SNS 통합)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userId, password, snsType = 'NONE' } = req.body;

        if (!userId) {
            return res.status(400).json({ error: '아이디(또는 SNS ID)는 필수입니다.' });
        }

        // 1. 사용자 조회 (보안상 전체 스캔 후 복호화 비교)
        const [rows] = await pool.execute(`
            SELECT BIN_TO_UUID(USER_UUID) as userUuid, USER_ID_ENC, PASSWORD, USER_NM, HP_NO, USER_TYPE, SNS_TYPE, USER_STAT 
            FROM TB_USER 
            WHERE USER_STAT = 'ACTIVE'
        `);

        let targetUser = null;
        for (const row of rows) {
            try {
                if (decrypt(row.USER_ID_ENC) === userId) {
                    targetUser = row;
                    break;
                }
            } catch (e) { continue; }
        }

        if (!targetUser) {
            return res.status(401).json({ error: '가입되지 않은 아이디입니다.' });
        }

        // 2. 인증 검증 (SNS_TYPE에 따라 분기)
        if (snsType === 'NONE' || targetUser.SNS_TYPE === 'NONE') {
            if (!password) {
                return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
            }
            const isMatch = await bcrypt.compare(password, targetUser.PASSWORD);
            if (!isMatch) {
                return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
            }
        } else {
            if (snsType !== targetUser.SNS_TYPE) {
                return res.status(401).json({ error: '로그인 방식(SNS)이 일치하지 않습니다.' });
            }
        }

        res.status(200).json({
            message: '로그인 성공',
            user: {
                uuid: targetUser.userUuid,
                name: decrypt(targetUser.USER_NM),
                type: targetUser.USER_TYPE,
                phone: decrypt(targetUser.HP_NO),
                snsType: targetUser.SNS_TYPE
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다.' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://127.0.0.1:${PORT}`);
});
