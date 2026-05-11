/**
 * 버스 청약 취소 증빙 — TB_USER_CANCEL_HIST 최신 행의 REASON_DOC_FILE_NM ↔ TB_FILE_MASTER
 * CommonView 스트리밍 접근 검증용 (`FILE_CATEGORY = DRIVER_CANCEL_REPORT`)
 */

const DRIVER_CANCEL_REPORT = 'DRIVER_CANCEL_REPORT';

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} custId
 * @returns {Promise<string[]>} FILE_ID 목록 (순서 유지)
 */
async function fileIdsFromLatestCancelHist(connection, custId) {
    const [histRows] = await connection.execute(
        `SELECT REASON_DOC_FILE_NM AS reasonDoc
           FROM TB_USER_CANCEL_HIST
          WHERE CUST_ID = ?
          ORDER BY HIST_SEQ DESC
          LIMIT 1`,
        [custId]
    );
    const raw = histRows[0]?.reasonDoc;
    if (raw == null || String(raw).trim() === '') return [];
    return String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} custId
 * @returns {Promise<Array<{ fileId: string, orgFileNm: string, fileExt: string, fileSizeBytes: number }>>}
 */
async function fetchLastHistProofFileMetas(connection, custId) {
    const ids = await fileIdsFromLatestCancelHist(connection, custId);
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.execute(
        `SELECT FILE_ID AS fileId,
                ORG_FILE_NM AS orgFileNm,
                FILE_EXT AS fileExt,
                FILE_SIZE AS fileSizeBytes
           FROM TB_FILE_MASTER
          WHERE FILE_ID IN (${placeholders})
            AND FILE_CATEGORY = ?`,
        [...ids, DRIVER_CANCEL_REPORT]
    );
    const map = new Map((rows || []).map((r) => [String(r.fileId), r]));
    return ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((r) => ({
            fileId: String(r.fileId),
            orgFileNm: r.orgFileNm != null ? String(r.orgFileNm) : '',
            fileExt: r.fileExt != null ? String(r.fileExt) : '',
            fileSizeBytes: Number(r.fileSizeBytes) || 0,
        }));
}

/**
 * 최신 이력 REASON_DOC_FILE_NM 에 포함되고, DRIVER_CANCEL_REPORT + GCS 경로가 기사 소유인지
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} custId
 * @param {string} fileId
 */
async function canAccessDriverCancelProofFile(connection, custId, fileId) {
    const ids = await fileIdsFromLatestCancelHist(connection, custId);
    if (!ids.includes(String(fileId).trim())) return false;

    const [fmRows] = await connection.execute(
        `SELECT FILE_ID, FILE_CATEGORY, GCS_PATH
           FROM TB_FILE_MASTER
          WHERE FILE_ID = ?
          LIMIT 1`,
        [fileId]
    );
    const row = fmRows[0];
    if (!row || String(row.FILE_CATEGORY || '') !== DRIVER_CANCEL_REPORT) return false;
    const prefix = `${DRIVER_CANCEL_REPORT}/${custId}/`;
    const p = String(row.GCS_PATH || '');
    return p.startsWith(prefix);
}

/**
 * GCS 객체 키 — 청약 취소 업로드 시 GCS_PATH 는 폴더, 실제 객체는 {GCS_PATH}/{FILE_ID}
 * @param {{ FILE_CATEGORY?: string, GCS_PATH?: string }} row
 * @param {string} fileId
 */
function resolveGcsObjectKey(row, fileId) {
    const cat = String(row.FILE_CATEGORY || '');
    const path = String(row.GCS_PATH || '').trim().replace(/\/$/, '');
    if (cat === DRIVER_CANCEL_REPORT) {
        return path ? `${path}/${fileId}` : String(fileId);
    }
    return path || String(fileId);
}

module.exports = {
    DRIVER_CANCEL_REPORT,
    fileIdsFromLatestCancelHist,
    fetchLastHistProofFileMetas,
    canAccessDriverCancelProofFile,
    resolveGcsObjectKey,
};
