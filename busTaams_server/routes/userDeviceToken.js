/**
 * POST /api/user/device-token — FCM 토큰 등록 (웹·앱 공통)
 * DELETE /api/user/device-token — 로그아웃 시 토큰 제거
 *
 * `TB_USER_DEVICE_TOKEN`: 운영 스키마는 `CUST_ID`(varchar(10)) PK 기준
 * (`BusTaams_Project 테이블 설계.md`). 요청 body 는 `custId` 또는 `userUuid`(레거시)·`userId` 허용.
 * `UK_USER_FCM_TOKEN`(FCM 단일 유니크 또는 USER_UUID+FCM 접두 유니크) 때문에
 * 동시 요청·패딩 불일치 시 ER_DUP_ENTRY 가 날 수 있음 → CUST_ID 후보 전부·토큰 행 선삭제 후 INSERT,
 * 실패 시 ODKU 한 번 더 시도.
 */
const express = require('express');
const { custIdMatchCandidates } = require('../lib/bustaamsIds');

/** 숫자형 CUST_ID → TB 에 맞는 10자리 0패딩 (`4` ↔ `0000000004`) */
function canonicalCustId10(raw) {
    const s = raw != null ? String(raw).trim() : '';
    if (!s) return '';
    if (!/^\d+$/.test(s)) return s;
    return (s.replace(/^0+/, '') || '0').padStart(10, '0');
}

module.exports = function createUserDeviceTokenRouter(pool) {
    const router = express.Router();

    function custKeyFromBody(b) {
        if (!b || typeof b !== 'object') return '';
        return String(b.custId ?? b.userId ?? b.userUuid ?? '').trim();
    }

    router.post('/', async (req, res) => {
        const custRaw = custKeyFromBody(req.body);
        const { token, clientKind } = req.body || {};
        if (!custRaw || !token || typeof token !== 'string') {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token(문자열)이 필요합니다.' });
        }
        const custCanon = canonicalCustId10(custRaw);
        const custIdForDb = custCanon || custRaw;
        const kind = ['web', 'android', 'ios'].includes(clientKind) ? clientKind : 'web';
        let connection;
        try {
            connection = await pool.getConnection();
            const tok = token.trim();
            const variants = custIdMatchCandidates(custRaw);
            const inList = variants.length ? variants : [custIdForDb];
            const ph = inList.map(() => '?').join(', ');
            await connection.beginTransaction();
            try {
                await connection.execute(
                    `DELETE FROM TB_USER_DEVICE_TOKEN WHERE FCM_TOKEN = ? OR CUST_ID IN (${ph})`,
                    [tok, ...inList]
                );
                await connection.execute(
                    `INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND)
                     VALUES (?, ?, ?)`,
                    [custIdForDb, tok, kind]
                );
                await connection.commit();
            } catch (inner) {
                await connection.rollback();
                const dup =
                    inner &&
                    (inner.code === 'ER_DUP_ENTRY' ||
                        inner.errno === 1062 ||
                        (inner.sqlMessage && String(inner.sqlMessage).includes('Duplicate')));
                if (dup) {
                    await connection.execute(
                        `INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                           CUST_ID = VALUES(CUST_ID),
                           FCM_TOKEN = VALUES(FCM_TOKEN),
                           CLIENT_KIND = VALUES(CLIENT_KIND)`,
                        [custIdForDb, tok, kind]
                    );
                } else {
                    throw inner;
                }
            }
            res.status(200).json({ ok: true });
        } catch (e) {
            console.error('user/device-token POST:', e);
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    router.delete('/', async (req, res) => {
        const custRaw = custKeyFromBody(req.body);
        const { token } = req.body || {};
        if (!custRaw || !token) {
            return res.status(400).json({ error: 'custId(또는 userId·userUuid)와 token이 필요합니다.' });
        }
        const custIdForDb = canonicalCustId10(custRaw) || custRaw;
        let connection;
        try {
            connection = await pool.getConnection();
            const variants = custIdMatchCandidates(custRaw);
            const inList = variants.length ? variants : [custIdForDb];
            const ph = inList.map(() => '?').join(', ');
            const [r] = await connection.execute(
                `DELETE FROM TB_USER_DEVICE_TOKEN
                  WHERE FCM_TOKEN = ? AND CUST_ID IN (${ph})`,
                [String(token).trim(), ...inList]
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
