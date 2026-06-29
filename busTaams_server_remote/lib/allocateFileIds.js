/**
 * TB_FILE_MASTER.FILE_ID — 숫자 채번 후 20자리 0패딩 (`BusTaams_Project 테이블 설계.md`)
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number} count
 * @returns {Promise<string[]>}
 */
async function allocateSequentialFileIds(connection, count) {
    const n = Math.max(1, Math.min(Number(count) || 1, 20));
    const [[row]] = await connection.execute(
        `SELECT COALESCE(MAX(CAST(FILE_ID AS UNSIGNED)), 0) AS m FROM TB_FILE_MASTER`
    );
    let cur = Number(row?.m) || 0;
    const out = [];
    for (let i = 0; i < n; i++) {
        cur += 1;
        if (cur > Number.MAX_SAFE_INTEGER) {
            throw new Error('FILE_ID 범위를 초과했습니다.');
        }
        out.push(String(cur).padStart(20, '0'));
    }
    return out;
}

module.exports = { allocateSequentialFileIds };
