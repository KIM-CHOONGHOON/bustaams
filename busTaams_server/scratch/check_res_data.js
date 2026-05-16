const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });

    try {
        const [rows] = await pool.execute('SELECT RES_ID, REQ_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID = "0000000002"');
        console.log('TB_BUS_RESERVATION Data for REQ_ID 0000000002:');
        console.table(rows);
    } catch (err) {
        console.error('Error fetching data:', err);
    } finally {
        await pool.end();
    }
}

checkData();
