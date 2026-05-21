/**
 * 버스 기사 청약(입찰) 등록 시 TB_MOM_MEMBER 월별 건수 관리
 * 테이블·ENUM 정본: 사용자 요구(TB_MOM_MEMBER, FEE_POLICY_CNT, …)
 */
const { getCurrentYyyyMm } = require('./loginPayload');
const { normalizeDriverFeePolicyDtlCd } = require('./feePolicyDtl');

/** @typedef {{ ackMessage: string, disableFurtherBid: boolean, remainingCnt: number, useCnt: number, basicCnt: number }} MomMemberOk */

function isNoSuchTable(e) {
    return e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146);
}

/**
 * @param {import('mysql2').PoolConnection} connection
 * @param {string} custId TB_USER.CUST_ID
 * @returns {Promise<{ ok: true, payload: MomMemberOk } | { ok: false, status: number, code: string, lines: string[] }>}
 */
async function applyMomMemberAfterBid(connection, custId) {
    // [수정] 기사의 청약(입찰) 횟수를 검증하거나 차감하지 않고 항상 무제한 승인하도록 변경합니다.
    return {
        ok: true,
        payload: {
            ackMessage: '청약 정상 처리 (횟수 제한 없음)',
            disableFurtherBid: false,
            remainingCnt: 9999,
            useCnt: 0,
            basicCnt: 9999,
        },
    };
}

/**
 * 기사 취소/변경 시 응찰 횟수 원복 처리
 * @param {import('mysql2').PoolConnection} connection
 * @param {string} custId 기사 CUST_ID
 * @returns {Promise<{ ok: true } | { ok: false, error: any }>}
 */
async function rollbackMomMember(connection, custId) {
    const cust = String(custId || '').trim();
    if (!cust) return { ok: false, error: 'CUST_ID_REQUIRED' };

    const yyyyMM = getCurrentYyyyMm();

    try {
        // [수정] 데이터가 없으면 Insert, 있으면 Update 로직 적용
        // Insert 시: USE_CNT=0, REMAINING_CNT=5
        // Update 시: USE_CNT=USE_CNT-1, REMAINING_CNT=REMAINING_CNT+1
        const query = `
            INSERT INTO TB_MOM_MEMBER (
                CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, 'DRIVER', 5, 0, 5, NOW(), ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE
                USE_CNT = IF(USE_CNT > 0, USE_CNT - 1, 0),
                REMAINING_CNT = REMAINING_CNT + 1,
                MOD_DT = NOW(),
                MOD_ID = ?
        `;

        await connection.execute(query, [cust, yyyyMM, cust, cust, cust]);
        console.log(`[ROLLBACK] Quota rollback processed for driver ${cust} (${yyyyMM})`);
        
        return { ok: true };
    } catch (e) {
        console.error(`[ROLLBACK ERROR] Failed to process quota for driver ${cust}:`, e);
        return { ok: false, error: e };
    }
}

module.exports = {
    applyMomMemberAfterBid,
    rollbackMomMember,
};
