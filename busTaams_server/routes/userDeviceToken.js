/**
 * POST /api/user/device-token — FCM 토큰 등록 및 업데이트 (Upsert)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 */
const express = require('express');

module.exports = function createUserDeviceTokenRouter(pool, app) {
    const router = express.Router();

    // /api/user/device-token 경로로 라우터 등록
    if (app) {
        app.use('/api/user/device-token', router);
    }

    // 토큰 등록 및 업데이트 (Upsert)
    router.post('/', async (req, res) => {
        const { userId, token, clientKind } = req.body || {};
        
        if (!userId || !token) {
            return res.status(400).json({ error: 'userId(CUST_ID)와 token(FCM_TOKEN)이 필요합니다.' });
        }

        // clientKind validation: mobile, tablet, desktop 중 하나 (기본값 mobile)
        const validKinds = ['mobile', 'tablet', 'desktop'];
        const kind = validKinds.includes(clientKind) ? clientKind : 'mobile';

        let connection;
        try {
            connection = await pool.getConnection();
            
            // CUST_ID와 CLIENT_KIND가 PK이므로 ON DUPLICATE KEY UPDATE 사용
            const sql = `
                INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND, REG_ID, MOD_ID)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    FCM_TOKEN = VALUES(FCM_TOKEN),
                    MOD_ID = VALUES(MOD_ID),
                    MOD_DT = CURRENT_TIMESTAMP
            `;
            
            await connection.execute(sql, [userId, token.trim(), kind, userId, userId]);
            
            res.status(200).json({ ok: true, message: '토큰이 성공적으로 업데이트되었습니다.' });
        } catch (e) {
            console.error('FCM 토큰 업데이트 오류:', e);
            res.status(500).json({ error: '서버 오류가 발생했습니다.', details: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 토큰 삭제 (로그아웃 등)
    router.delete('/', async (req, res) => {
        const { userId, token } = req.body || {};
        
        if (!userId || !token) {
            return res.status(400).json({ error: 'userId와 token이 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const [result] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN WHERE CUST_ID = ? AND FCM_TOKEN = ?`,
                [userId, String(token).trim()]
            );
            res.status(200).json({ ok: true, removed: result.affectedRows });
        } catch (e) {
            console.error('FCM 토큰 삭제 오류:', e);
            res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};
