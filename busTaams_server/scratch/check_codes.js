const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCodes() {
    try {
        console.log('Connecting with:', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: '***',
            database: process.env.DB_NAME
        });

        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- TB_COMMON_CODE (DRIVER_CANCEL_REASON) ---');
        const [rows] = await conn.query("SELECT * FROM TB_COMMON_CODE WHERE GRP_CD = 'DRIVER_CANCEL_REASON'");
        console.table(rows);

        console.log('--- TB_COMMON_CODE (USER_CANCEL_REASON) ---');
        const [userRows] = await conn.query("SELECT * FROM TB_COMMON_CODE WHERE GRP_CD = 'USER_CANCEL_REASON'");
        console.table(userRows);

        await conn.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkCodes();
