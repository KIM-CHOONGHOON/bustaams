/**
 * 기사의 당월 확정 건수 및 요금제(FEE_POLICY)에 따른 수수료 계산
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} custId 기사의 CUST_ID
 * @param {number} busAmt 이용 금액 (입찰가)
 * @returns {Promise<{ feePolicy: string, feeRate: number, feeTotal: number, feeRefund: number, feeAttribution: number, confirmCount: number }>}
 */
async function calculateDriverFee(connection, custId, busAmt) {
    const cust = String(custId || '').trim();
    
    // 1. 기사의 FEE_POLICY 조회
    let feePolicy = 'DRIVER'; // 기본값
    
    // TB_MOM_MEMBER 에서 현재 월 요금제 조회
    const [momRows] = await connection.execute(
        `SELECT FEE_POLICY 
         FROM TB_MOM_MEMBER 
         WHERE CUST_ID = ? AND YYYYMM = DATE_FORMAT(NOW(), '%Y%m')
         LIMIT 1`,
        [cust]
    );
    
    if (momRows.length > 0) {
        feePolicy = momRows[0].FEE_POLICY;
    } else {
        // 없으면 TB_DRIVER_DETAIL 에서 조회
        const [driverRows] = await connection.execute(
            `SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ? LIMIT 1`,
            [cust]
        );
        if (driverRows.length > 0) {
            feePolicy = driverRows[0].FEE_POLICY;
        }
    }
    
    // 일반 요금제 오타 정규화
    if (feePolicy === 'DRIVER_GENNERAL') {
        feePolicy = 'DRIVER_GENERAL';
    }
    
    // 2. 기사의 당월 확정(CONFIRM) 및 완료(DONE) 건수 조회
    const [confirmRows] = await connection.execute(
        `SELECT COUNT(*) AS confirmCount
         FROM TB_BUS_RESERVATION
         WHERE DRIVER_ID = ? 
           AND DATA_STAT IN ('CONFIRM', 'DONE')
           AND DATE_FORMAT(REG_DT, '%Y%m') = DATE_FORMAT(NOW(), '%Y%m')`,
        [cust]
    );
    const confirmCount = confirmRows[0]?.confirmCount || 0;
    
    // 3. 요금제 정책 및 확정 건수에 따른 수수료율 결정
    let feeRate = 0.066; // 기본 6.6%
    
    if (feePolicy === 'DRIVER') {
        feeRate = 0.066;
    } else if (feePolicy === 'DRIVER_GENERAL') {
        feeRate = confirmCount >= 10 ? 0.066 : 0.022;
    } else if (feePolicy === 'DRIVER_HIGH') {
        feeRate = confirmCount >= 20 ? 0.066 : 0.022;
    } else if (feePolicy === 'DRIVER_MIDDLE') {
        feeRate = confirmCount >= 30 ? 0.066 : 0.022;
    }
    
    const feeTotal = Math.floor(busAmt * feeRate);
    const feeRefund = Math.floor(feeTotal * (5.5 / 6.6)); // 기존 환불 비율 (약 83.33%) 유지
    const feeAttribution = feeTotal - feeRefund;
    
    return {
        feePolicy,
        feeRate,
        feeTotal,
        feeRefund,
        feeAttribution,
        confirmCount
    };
}

module.exports = {
    calculateDriverFee
};
