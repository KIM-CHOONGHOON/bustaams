const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkLogs() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- 최근 10개 SMS 발송 로그 ---');
        const [rows] = await pool.execute('SELECT * FROM TB_SMS_LOG ORDER BY REG_DT DESC LIMIT 10');
        console.table(rows);

        console.log('\n--- 최근 가입된 유저 5명 (HP_NO 확인용) ---');
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID, HP_NO, JOIN_DT FROM TB_USER ORDER BY JOIN_DT DESC LIMIT 5');
        console.table(users);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkLogs();
