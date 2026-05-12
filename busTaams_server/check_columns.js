const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const [rows] = await connection.execute('SELECT * FROM TB_USER LIMIT 1');
        console.log('--- Columns in TB_USER ---');
        console.log(Object.keys(rows[0] || {}));
        console.log('--- Sample Row ---');
        console.log(rows[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkColumns();
