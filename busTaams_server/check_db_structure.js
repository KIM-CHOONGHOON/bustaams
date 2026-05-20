
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDB() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    };

    try {
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute('DESCRIBE TB_DRIVER_BUS');
        console.log('--- TB_DRIVER_BUS 상세 구조 ---');
        rows.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        await connection.end();
    } catch (err) {
        console.error('DB 접속 에러:', err.message);
    }
}

checkDB();
