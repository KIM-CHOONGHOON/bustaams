/**
 * `TB_USER.CUST_ID`(10자리) — `TB_BUS_RESERVATION.DRIVER_ID` 등 `VARCHAR(10)` FK와 조인
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').Connection} poolOrConn
 * @param {string} userKey `USER_ID` 로그인키 또는 `CUST_ID` 또는 10자리 숫자문자
 * @returns {Promise<string|null>}
 */
async function resolveCustIdByUserKey(poolOrConn, userKey) {
    if (!userKey) return null;
    const k = String(userKey).trim();
    const [rows] = await poolOrConn.execute(
        'SELECT CUST_ID FROM TB_USER WHERE USER_ID = ? OR CUST_ID = ? LIMIT 1',
        [k, k]
    );
    if (rows[0]?.CUST_ID) return String(rows[0].CUST_ID);
    return /^[0-9]{10}$/.test(k) ? k : null;
}

module.exports = { resolveCustIdByUserKey };
