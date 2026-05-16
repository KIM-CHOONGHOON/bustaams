const { pool } = require('../db');

async function check() {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*
            FROM TB_AUCTION_REQ r
            WHERE r.REQ_ID = '0000000002'
        `);
        console.log('Data for REQ_ID 0000000002:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
