const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
    });

    try {
        const [rows] = await pool.execute('SELECT USER_ID_ENC, USER_NM FROM TB_USER LIMIT 1');
        console.log('--- DB Stored Data (Raw) ---');
        if (rows.length > 0) {
            console.log(JSON.stringify(rows[0], null, 2));
        } else {
            console.log('No data found in TB_USER table.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        await pool.end();
    }
}

checkData();
