const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColumns() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM TB_USER_CANCEL_MANAGE');
        console.log('Columns in TB_USER_CANCEL_MANAGE:');
        console.table(rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
