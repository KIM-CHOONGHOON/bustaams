const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function debug() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
    });

    try {
        // 1. CUST_ID '0000000001' 사용자 확인
        const [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ?', ['0000000001']);
        console.log('User 0000000001:', userRows);

        // 2. 전체 사용자 목록 (간략하게)
        const [allUsers] = await pool.execute('SELECT CUST_ID, USER_ID, USER_NM FROM TB_USER');
        console.log('All Users:', allUsers);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
