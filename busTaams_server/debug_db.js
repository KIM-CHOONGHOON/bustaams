const { pool } = require('./db');

async function debug() {
    try {
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID FROM TB_USER WHERE USER_ID = "ch070809"');
        console.log('User:', users);

        const [reqs] = await pool.execute('SELECT REQ_ID, TRAVELER_ID FROM TB_AUCTION_REQ');
        console.log('Requests:', reqs);

        if (users.length > 0 && reqs.length > 0) {
            const userId = users[0].USER_ID;
            const custId = users[0].CUST_ID;
            const reqId = reqs[0].REQ_ID;
            
            const [rows] = await pool.execute(
                'SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?',
                [reqId, custId]
            );
            console.log(`Match for REQ_ID ${reqId} and CUST_ID ${custId}:`, rows.length > 0 ? 'YES' : 'NO');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

debug();
