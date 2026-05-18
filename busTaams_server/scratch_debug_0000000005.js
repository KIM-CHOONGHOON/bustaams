const { pool } = require('./db');

async function checkData() {
    try {
        const targetId = '0000000005';
        console.log(`--- Checking ID: ${targetId} ---`);

        // 1. Check TB_AUCTION_REQ
        const [reqRows] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, TRIP_TITLE, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [targetId]);
        console.log('TB_AUCTION_REQ result:', reqRows);

        // 2. Check TB_BUS_RESERVATION
        const [resRows] = await pool.execute('SELECT RES_ID, REQ_ID, DRIVER_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
        console.log('TB_BUS_RESERVATION result:', resRows);

        // 3. Check REQ_ID 0000000008
        const [req8Rows] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, TRIP_TITLE, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000008']);
        console.log('TB_AUCTION_REQ (0000000008) result:', req8Rows);

        // 4. List all users (Fixed column name)
        const [userRows] = await pool.execute('SELECT USER_ID, CUST_ID, USER_NM FROM TB_USER');
        console.log('--- User List ---');
        userRows.forEach(u => console.log(`${u.USER_ID} (${u.CUST_ID}) - Name: ${u.USER_NM}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

checkData();
