<<<<<<< HEAD
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
=======
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
        const [rows] = await connection.execute('SELECT * FROM TB_BUS_RESERVATION LIMIT 5');
        console.log('Sample TB_BUS_RESERVATION rows:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Check Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
>>>>>>> 44d2817b1b404f9da3159a6894dd7f0493bfe810
