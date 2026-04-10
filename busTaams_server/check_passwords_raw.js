const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPasswords() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        console.log('--- Checking TB_USER passwords ---');
        const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as UUID, USER_ID, PASSWORD FROM TB_USER');
        console.log(`Found ${rows.length} users:`);
        for (const row of rows) {
             const passPreview = row.PASSWORD ? row.PASSWORD.substring(0, 10) + '...' : 'NULL';
             console.log(`- UUID: ${row.UUID}, Password (hashed): ${passPreview}`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkPasswords();
