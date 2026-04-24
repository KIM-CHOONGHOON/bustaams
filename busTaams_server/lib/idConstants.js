/**
 * 비즈니스 문자열 ID 상한 — ARCHITECTURE.md 및 API 정합
 * (DB 컬럼이 더 짧으면 DDL·마이그레이션으로 맞춤)
 */
const VARCHAR_ID_MAX_LEN = 256;

/** @param {unknown} s */
function normalizeVarcharId(s) {
    const t = String(s ?? '').trim();
    if (!t) return '';
    return t.length <= VARCHAR_ID_MAX_LEN ? t : t.slice(0, VARCHAR_ID_MAX_LEN);
}

module.exports = {
    VARCHAR_ID_MAX_LEN,
    normalizeVarcharId,
};
