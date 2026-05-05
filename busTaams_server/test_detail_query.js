const { pool } = require('./db');

async function testDetailQuery() {
    try {
        const userId = 'oasis';
        const reqIdFromUrl = '0000000001';

        console.log('Testing with userId:', userId, 'reqId:', reqIdFromUrl);

        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        console.log('User rows:', uRows);
        
        if (uRows.length === 0) {
            console.log('User not found');
            return;
        }

        const custId = uRows[0].CUST_ID;
        console.log('CUST_ID:', custId);

        const [reqRows] = await pool.execute(`
            SELECT 
                REQ_ID as reqId,
                TRIP_TITLE as tripTitle,
                START_ADDR as startAddr,
                END_ADDR as endAddr,
                REQ_STAT as status,
                TRAVELER_ID as travelerId
            FROM TB_AUCTION_REQ 
            WHERE REQ_ID = ? AND TRAVELER_ID = ?
        `, [reqIdFromUrl, custId]);

        console.log('Request rows:', reqRows);
        
        if (reqRows.length === 0) {
            console.log('Query failed to find request. Checking if TRAVELER_ID matches...');
            const [allReqs] = await pool.execute('SELECT REQ_ID, TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqIdFromUrl]);
            console.log('All requests with this ID:', allReqs);
        } else {
            console.log('Query success!');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testDetailQuery();
