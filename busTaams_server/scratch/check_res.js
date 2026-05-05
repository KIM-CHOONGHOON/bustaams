const { pool } = require('../db');

async function check() {
    try {
        const [rows] = await pool.execute(`
            SELECT b.RES_ID, b.DATA_STAT 
            FROM TB_BUS_RESERVATION b 
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID 
            WHERE r.TRAVELER_ID = '0000000001'
        `);
        console.log('Reservations:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
