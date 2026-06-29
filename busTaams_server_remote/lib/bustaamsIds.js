/**
 * 채번·정규화: TB_FILE_MASTER.FILE_ID 는 **varchar(20), 숫자 채번 시 왼쪽 0패딩**
 * (예: `00000000000000000001`). PROJECT 설계·운영 DDL과 동일.
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

/** TB_FILE_MASTER.FILE_ID 규격 — 숫자열만 20자리 0패딩으로 통일 (TB_USER.PROFILE_FILE_ID 와 교차 참조 시 사용) */
function canonicalFileMasterFileId(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return (s.replace(/^0+/, '') || '0').padStart(20, '0');
    return s;
}

/**
 * PROFILE_FILE_ID / FILE_ID 조회 시 DB에 `1` vs `00000000000000000001` 등 혼재 대비 IN 후보
 * @returns {string[]}
 */
function fileIdMatchCandidates(raw) {
    const fid = raw == null || raw === undefined ? '' : String(raw).trim();
    if (!fid) return [];
    const uniq = new Set([fid]);
    if (/^\d+$/.test(fid)) {
        const unpadded = fid.replace(/^0+/, '') || '0';
        uniq.add(unpadded);
        uniq.add(fid.padStart(20, '0'));
        uniq.add(unpadded.padStart(20, '0'));
    }
    return [...uniq];
}

/** `TB_USER.CUST_ID`(varchar(10)) 숫자형 — `8` vs `0000000000008` 등 혼선 흡수 (프론트 세션·쿼리 파라미터) */
function custIdMatchCandidates(raw) {
    const cid = raw == null || raw === undefined ? '' : String(raw).trim();
    if (!cid) return [];
    const uniq = new Set([cid]);
    if (/^\d+$/.test(cid)) {
        const unpadded = cid.replace(/^0+/, '') || '0';
        uniq.add(unpadded);
        uniq.add(cid.padStart(10, '0'));
        uniq.add(unpadded.padStart(10, '0'));
    }
    return [...uniq];
}

module.exports = {
    nextPaddedId,
    nextIdFromTable,
    nextFileMasterId20,
    parseMaxId,
    canonicalFileMasterFileId,
    fileIdMatchCandidates,
    custIdMatchCandidates,
};
