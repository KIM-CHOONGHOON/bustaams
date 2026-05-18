const { pool } = require('./db');

async function testRoute() {
    const userId = 'oasis1'; // 일단 테스트용 ID. 실제 DB에 있는 ID로 확인 필요
    console.log(`Testing for USER_ID: ${userId}`);

    try {
        // 1. 등록된 카드 정보 및 사용자 프로필 이미지 조회
        console.log('--- Query 1: User Profile ---');
        const [[user]] = await pool.execute(
            'SELECT CUST_ID, USER_IMAGE FROM TB_USER WHERE USER_ID = ?',
            [userId]
        );
        console.log('User:', user);
        if (!user) {
            console.log('User not found');
            return;
        }
        const custId = user.CUST_ID;

        console.log('--- Query 2: Cards ---');
        const [cards] = await pool.execute(
            'SELECT CARD_SEQ, CARD_NICKNAME, CARD_NO_ENC, EXP_MONTH, EXP_YEAR, IS_PRIMARY FROM TB_PAYMENT_CARD WHERE CUST_ID = ? ORDER BY IS_PRIMARY DESC, CARD_SEQ ASC',
            [custId]
        );
        console.log('Cards count:', cards.length);

        // 2. 월별 멤버십 이용 및 결제 내역 조회 (최근 12개월)
        console.log('--- Query 3: Membership History ---');
        const [history] = await pool.execute(
            `SELECT 
                YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT 
             FROM TB_MOM_MEMBER 
             WHERE CUST_ID = ?
             ORDER BY YYYYMM DESC 
             LIMIT 12`,
            [custId]
        );
        console.log('History count:', history.length);

        // 3. 현재 활성화된 요금제 확인하여 다음 결제 정보 계산
        console.log('--- Query 4: Driver Detail ---');
        const [detail] = await pool.execute(
            'SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );
        console.log('Detail:', detail[0]);

        console.log('\nAll queries executed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n!!! Query failed !!!');
        console.error('Error Code:', error.code);
        console.error('SQL:', error.sql);
        console.error('Message:', error.message);
        process.exit(1);
    }
}

testRoute();
