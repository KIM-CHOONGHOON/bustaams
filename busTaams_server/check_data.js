const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- Checking TB_AUCTION_REQ ---');
        const [rows1] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000005']);
        console.log(JSON.stringify(rows1, null, 2));

        console.log('\n--- Checking TB_BUS_RESERVATION ---');
        const [rows2] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', ['0000000005']);
        console.log(JSON.stringify(rows2, null, 2));

        console.log('\n--- Checking TB_BUS_RESERVATION by REQ_ID ---');
        const [rows3] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', ['0000000005']);
        console.log(JSON.stringify(rows3, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
