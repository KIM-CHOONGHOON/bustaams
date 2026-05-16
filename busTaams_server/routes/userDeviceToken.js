/**
 * POST /api/user/device-token — FCM 토큰 등록 및 업데이트 (Upsert)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 *
 * `TB_USER_DEVICE_TOKEN`: 운영 스키마는 `CUST_ID`(varchar(10)) PK 기준
 * (`BusTaams_Project 테이블 설계.md`). 요청 body 는 `custId` 또는 `userUuid`(레거시)·`userId` 허용.
 */
const express = require('express');

module.exports = function createUserDeviceTokenRouter(pool, app) {
    const router = express.Router();

    function custKeyFromBody(b) {
        if (!b || typeof b !== 'object') return '';
        return String(b.custId ?? b.userId ?? b.userUuid ?? '').trim();
    }

    // /api/user/device-token 경로로 라우터 등록 (app이 인자로 넘어올 경우 호환 처리)
    if (app && typeof app.use === 'function') {
        app.use('/api/user/device-token', router);
    }

    // 토큰 등록 및 업데이트 (Upsert)
    router.post('/', async (req, res) => {
        const custId = custKeyFromBody(req.body);
        const { token, clientKind } = req.body || {};
        if (!custId || !token || typeof token !== 'string') {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token(문자열)이 필요합니다.' });
        }

        // clientKind validation: mobile, tablet, desktop 중 하나 (기본값 mobile)
        const validKinds = ['mobile', 'tablet', 'desktop'];
        const kind = validKinds.includes(clientKind) ? clientKind : 'mobile';

        let connection;
        try {
            connection = await pool.getConnection();
            
            // CUST_ID와 CLIENT_KIND가 PK인 경우 등을 고려하여 ON DUPLICATE KEY UPDATE 사용
            // REG_ID, MOD_ID 컬럼이 존재하는 경우를 대비하여 포함 (HEAD 로직 유지)
            await connection.execute(
                `INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND, REG_ID, MOD_ID)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   FCM_TOKEN = VALUES(FCM_TOKEN),
                   CLIENT_KIND = VALUES(CLIENT_KIND),
                   MOD_ID = VALUES(MOD_ID),
                   MOD_DT = CURRENT_TIMESTAMP`,
                [custId, token.trim(), kind, custId, custId]
            );
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
        const custId = custKeyFromBody(req.body);
        const { token } = req.body || {};
        if (!custId || !token) {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token이 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const [result] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN
                  WHERE CUST_ID = ? AND FCM_TOKEN = ?`,
                [custId, String(token).trim()]
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
