const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'busTaams_server/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function checkTable() {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ LIMIT 1');
        console.log('TB_AUCTION_REQ sample data:');
        console.log(rows);
    } catch (err) {
        console.error('Error checking TB_AUCTION_REQ:', err);
    } finally {
        await pool.end();
    }
}

checkTable();
