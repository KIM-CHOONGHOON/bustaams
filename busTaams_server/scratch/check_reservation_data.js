const { pool } = require('../db');

async function checkData() {
    try {
        const [rows] = await pool.execute(`
            SELECT RES_ID, DRIVER_BIDDING_PRICE, REQ_ID, DATA_STAT
            FROM TB_BUS_RESERVATION
            WHERE RES_ID = '0000000001'
        `);
        console.log('Data:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData();
