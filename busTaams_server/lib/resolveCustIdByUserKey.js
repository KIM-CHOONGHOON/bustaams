/**
 * `TB_USER.CUST_ID`(10자리) — `TB_BUS_RESERVATION.DRIVER_ID` 등과 조인
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').Connection} poolOrConn
 * @param {string} userKey `CUST_ID`(숫자·0패딩 변형 포함). TB_USER 행이 있으면 해당 CUST_ID 반환.
 * @returns {Promise<string|null>}
 */
const { custIdMatchCandidates } = require('./bustaamsIds');

async function resolveCustIdByUserKey(poolOrConn, userKey) {
    if (!userKey) return null;
    const cands = custIdMatchCandidates(String(userKey).trim());
    if (!cands.length) return null;
    const inPh = cands.map(() => '?').join(', ');
    const [rows] = await poolOrConn.execute(
        `SELECT TRIM(CUST_ID) AS CUST_ID FROM TB_USER WHERE TRIM(CUST_ID) IN (${inPh}) LIMIT 1`,
        cands
    );
    if (rows[0]?.CUST_ID != null && String(rows[0].CUST_ID).trim() !== '') {
        return String(rows[0].CUST_ID).trim();
    }
    return null;
}

module.exports = { resolveCustIdByUserKey };
