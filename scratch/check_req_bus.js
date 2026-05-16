
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/LG/AI자동화/project_bustaams/busTaams_server/.env' });

async function checkBusData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('--- Checking TB_AUCTION_REQ_BUS for REQ_ID 0000000003 ---');
        const [busRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', ['0000000003']);
        console.log('TB_AUCTION_REQ_BUS:', JSON.stringify(busRows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkBusData();
