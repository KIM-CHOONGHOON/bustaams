const { pool } = require('../db');

async function debug() {
    try {
        console.log('--- Deep Dive into Reservation 0000000001 ---');
        
        // 1. Check TB_BUS_RESERVATION
        const [res] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', ['0000000001']);
        console.log('TB_BUS_RESERVATION:', res);

        if (res.length > 0) {
            const reqId = res[0].REQ_ID;
            // 2. Check TB_AUCTION_REQ
            const [req] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            console.log('TB_AUCTION_REQ:', req);
        }

        // 3. Check current user in session (mocking)
        // Let's see all users to see who might be logged in
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID, USER_NM FROM TB_USER');
        console.log('Users in system:', users);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
