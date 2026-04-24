/**
 * POST /api/user/device-token — FCM 토큰 등록 (웹·앱 공통)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 *
 * `BusTaams` / `server.js`: `TB_USER_DEVICE_TOKEN.USER_ID` VARCHAR(256) — `TB_USER.USER_ID`와 동일 문자열
 */
const express = require('express');

module.exports = function createUserDeviceTokenRouter(pool) {
    const router = express.Router();

    function userKeyFromBody(b) {
        if (!b || typeof b !== 'object') return '';
        return String(b.userId ?? b.userUuid ?? '').trim();
    }

    router.post('/', async (req, res) => {
        const userId = userKeyFromBody(req.body);
        const { token, clientKind } = req.body || {};
        if (!userId || !token || typeof token !== 'string') {
            return res.status(400).json({ error: 'userId(또는 userUuid)와 token(문자열)이 필요합니다.' });
        }
        const kind = ['web', 'android', 'ios'].includes(clientKind) ? clientKind : 'web';
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.execute(
                `INSERT INTO TB_USER_DEVICE_TOKEN (USER_ID, FCM_TOKEN, CLIENT_KIND)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE UPD_DT = CURRENT_TIMESTAMP, CLIENT_KIND = VALUES(CLIENT_KIND)`,
                [userId, token.trim(), kind]
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
        const userId = userKeyFromBody(req.body);
        const { token } = req.body || {};
        if (!userId || !token) {
            return res.status(400).json({ error: 'userId(또는 userUuid)와 token이 필요합니다.' });
        }
        let connection;
        try {
            connection = await pool.getConnection();
            const [r] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN
                  WHERE USER_ID = ? AND FCM_TOKEN = ?`,
                [userId, String(token).trim()]
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
