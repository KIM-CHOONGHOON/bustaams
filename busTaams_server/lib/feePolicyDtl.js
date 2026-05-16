/**
 * 기사 회원등급 TB_COMMON_CODE.DTL_CD / TB_DRIVER_DETAIL.FEE_POLICY / TB_MOM_MEMBER.FEE_POLICY
 * 스펙 오타 DRIVER_GENNERAL 은 TB_MOM_MEMBER ENUM 과 맞추기 위해 DRIVER_GENERAL 로 정규화한다.
 */

const DRIVER_FEE_POLICY_DTL_CDS = Object.freeze([
    'DRIVER',
    'DRIVER_GENERAL',
    'DRIVER_MIDDLE',
    'DRIVER_HIGH',
]);

/** SELECT … IN — DB에 레거시 오타 행만 있어도 콤보에 나오도록 */
const DRIVER_FEE_POLICY_DTL_CDS_SQL_IN = Object.freeze([
    'DRIVER',
    'DRIVER_GENERAL',
    'DRIVER_GENNERAL',
    'DRIVER_MIDDLE',
    'DRIVER_HIGH',
]);

function normalizeDriverFeePolicyDtlCd(raw) {
    const t = raw != null ? String(raw).trim() : '';
    if (t === 'DRIVER_GENNERAL') return 'DRIVER_GENERAL';
    return t;
}

function isCanonicalDriverFeePolicyDtlCd(t) {
    return DRIVER_FEE_POLICY_DTL_CDS.includes(t);
}

/** FEE_POLICY(p) ↔ FEE_POLICY_CNT(c) 조인: 일반등급 GENERAL ↔ GENNERAL 철자 불일치 허용 */
function sqlFeePolicyCntJoinOnP() {
    return `(
       TRIM(c.DTL_CD) = TRIM(p.DTL_CD)
    OR (TRIM(p.DTL_CD) = 'DRIVER_GENERAL' AND TRIM(c.DTL_CD) = 'DRIVER_GENNERAL')
    OR (TRIM(p.DTL_CD) = 'DRIVER_GENNERAL' AND TRIM(c.DTL_CD) = 'DRIVER_GENERAL')
  )`;
}

module.exports = {
    DRIVER_FEE_POLICY_DTL_CDS,
    DRIVER_FEE_POLICY_DTL_CDS_SQL_IN,
    normalizeDriverFeePolicyDtlCd,
    isCanonicalDriverFeePolicyDtlCd,
    sqlFeePolicyCntJoinOnP,
};
