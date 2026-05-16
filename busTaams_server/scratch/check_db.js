const { pool } = require('../db');

async function check() {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, rb.RES_BUS_AMT, rb.BUS_TYPE_CD
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_AUCTION_REQ_BUS rb ON b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ
            WHERE b.RES_ID = '0000000003'
        `);
        console.log('Data for RES_ID 0000000003:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
