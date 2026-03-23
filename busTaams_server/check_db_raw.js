const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
    });

    try {
        const [rows] = await pool.execute('SELECT USER_ID, USER_NM, PHONE_NO FROM TB_USER LIMIT 1');
        console.log('--- DB Stored Data (Raw) ---');
        console.log(JSON.stringify(rows[0], null, 2));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        await pool.end();
    }
}

checkData();
