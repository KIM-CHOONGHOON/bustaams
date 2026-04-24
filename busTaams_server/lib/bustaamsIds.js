/**
 * `BusTaams 테이블.md` — 0패딩 ID 채번 (FILE_ID 20자, 그 외 10자)
 */

function parseMaxId(maxVal) {
    if (maxVal == null || maxVal === '') return 0;
    const n = parseInt(String(maxVal), 10);
    return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string|number} currentMax
 * @param {number} length
 * @returns {string}
 */
function nextPaddedId(currentMax, length = 10) {
    return String(parseMaxId(currentMax) + 1).padStart(length, '0');
}

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').Connection} conn
 * @param {string} table
 * @param {string} col
 * @param {number} len
 */
async function nextIdFromTable(conn, table, col, len = 10) {
    const [rows] = await conn.execute(
        `SELECT MAX(\`${col}\`) AS m FROM \`${table}\``
    );
    return nextPaddedId(rows[0]?.m, len);
}

/** TB_FILE_MASTER.FILE_ID (varchar(20)) */
async function nextFileMasterId20(conn) {
    return nextIdFromTable(conn, 'TB_FILE_MASTER', 'FILE_ID', 20);
}

module.exports = {
    nextPaddedId,
    nextIdFromTable,
    nextFileMasterId20,
    parseMaxId,
};
