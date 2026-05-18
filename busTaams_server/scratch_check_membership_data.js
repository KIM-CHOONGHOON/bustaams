const { pool } = require('./db');

async function checkData() {
    try {
        // 모든 사용자 조회 (최근 가입순)
        const [users] = await pool.execute('SELECT USER_ID, CUST_ID, USER_NM FROM TB_USER ORDER BY REG_DT DESC LIMIT 5');
        console.log('--- Recent Users ---');
        console.table(users);

        if (users.length > 0) {
            const custId = users[0].CUST_ID;
            console.log(`\n--- Checking data for CUST_ID: ${custId} ---`);

            const [cards] = await pool.execute('SELECT * FROM TB_PAYMENT_CARD WHERE CUST_ID = ?', [custId]);
            console.log('--- Payment Cards ---');
            console.table(cards);

            const [history] = await pool.execute('SELECT * FROM TB_MOM_MEMBER WHERE CUST_ID = ?', [custId]);
            console.log('--- Membership History ---');
            console.table(history);
            
            const [allHistory] = await pool.execute('SELECT * FROM TB_MOM_MEMBER LIMIT 5');
            console.log('--- All Membership History (Sample) ---');
            console.table(allHistory);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
