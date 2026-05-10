/**
 * POST /api/user/device-token — FCM 토큰 등록 (웹·앱 공통)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 *
 * `TB_USER_DEVICE_TOKEN`: 운영 스키마는 `CUST_ID`(varchar(10)) PK 기준
 * (`BusTaams_Project 테이블 설계.md`). 요청 body 는 `custId` 또는 `userUuid`(레거시)·`userId` 허용.
 */
const express = require('express');

module.exports = function createUserDeviceTokenRouter(pool) {
    const router = express.Router();

    function custKeyFromBody(b) {
        if (!b || typeof b !== 'object') return '';
        return String(b.custId ?? b.userId ?? b.userUuid ?? '').trim();
    }

    router.post('/', async (req, res) => {
        const custId = custKeyFromBody(req.body);
        const { token, clientKind } = req.body || {};
        if (!custId || !token || typeof token !== 'string') {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token(문자열)이 필요합니다.' });
        }
        const kind = ['web', 'android', 'ios'].includes(clientKind) ? clientKind : 'web';
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.execute(
                `INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   FCM_TOKEN = VALUES(FCM_TOKEN),
                   CLIENT_KIND = VALUES(CLIENT_KIND),
                   MOD_DT = CURRENT_TIMESTAMP`,
                [custId, token.trim(), kind]
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
        const custId = custKeyFromBody(req.body);
        const { token } = req.body || {};
        if (!custId || !token) {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token이 필요합니다.' });
        }
        let connection;
        try {
            connection = await pool.getConnection();
            const [r] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN
                  WHERE CUST_ID = ? AND FCM_TOKEN = ?`,
                [custId, String(token).trim()]
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
