const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [rows] = await pool.execute('SHOW TABLES');
        console.log('--- Tables ---');
        console.log(rows.map(r => Object.values(r)[0]).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
