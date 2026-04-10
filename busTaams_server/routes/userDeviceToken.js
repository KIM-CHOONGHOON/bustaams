/**
 * POST /api/user/device-token — FCM 토큰 등록 (웹·앱 공통)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 */
const express = require('express');

module.exports = function createUserDeviceTokenRouter(pool) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { userUuid, token, clientKind } = req.body || {};
        if (!userUuid || !token || typeof token !== 'string') {
            return res.status(400).json({ error: 'userUuid와 token(문자열)이 필요합니다.' });
        }
        const kind = ['web', 'android', 'ios'].includes(clientKind) ? clientKind : 'web';
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.execute(
                `INSERT INTO TB_USER_DEVICE_TOKEN (USER_UUID, FCM_TOKEN, CLIENT_KIND)
                 VALUES (UUID_TO_BIN(?), ?, ?)
                 ON DUPLICATE KEY UPDATE UPD_DT = CURRENT_TIMESTAMP, CLIENT_KIND = VALUES(CLIENT_KIND)`,
                [userUuid, token.trim(), kind]
            );
            res.status(200).json({ ok: true });
        } catch (e) {
            console.error('user/device-token POST:', e);
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    router.delete('/', async (req, res) => {
        const { userUuid, token } = req.body || {};
        if (!userUuid || !token) {
            return res.status(400).json({ error: 'userUuid와 token이 필요합니다.' });
        }
        let connection;
        try {
            connection = await pool.getConnection();
            const [r] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN
                  WHERE USER_UUID = UUID_TO_BIN(?) AND FCM_TOKEN = ?`,
                [userUuid, String(token).trim()]
            );
            res.status(200).json({ ok: true, removed: r.affectedRows || 0 });
        } catch (e) {
            console.error('user/device-token DELETE:', e);
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};
