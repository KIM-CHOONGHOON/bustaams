const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'master',
    password: '!QAZ2wsx2026@',
    database: 'bustaams',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function test() {
    const reqId = '0000000002';
    try {
        console.log('Testing approve-all logic for reqId:', reqId);
        
        const [bids] = await pool.execute(`
            SELECT MIN(RES_ID) AS RES_ID, REQ_BUS_SEQ 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? COLLATE utf8mb4_unicode_ci AND DATA_STAT = 'BIDDING'
            GROUP BY REQ_BUS_SEQ
        `, [reqId]);
        
        console.log('Found bids:', bids);

        for (const bid of bids) {
            console.log('Updating bid:', bid.RES_ID);
            // We won't actually update in a test script that might fail, 
            // but we can check if the columns exist.
            const [res] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ? COLLATE utf8mb4_unicode_ci', [bid.RES_ID]);
            const [bus] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? COLLATE utf8mb4_unicode_ci AND REQ_BUS_SEQ = ?', [reqId, bid.REQ_BUS_SEQ]);
            console.log('Bid check:', res.length > 0 ? 'OK' : 'MISSING');
            console.log('Bus check:', bus.length > 0 ? 'OK' : 'MISSING');
        }

        const [master] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ? COLLATE utf8mb4_unicode_ci', [reqId]);
        console.log('Master check:', master.length > 0 ? 'OK' : 'MISSING');

        console.log('Test completed successfully');
    } catch (error) {
        console.error('Test failed with error:', error);
    } finally {
        await pool.end();
    }
}

test();
