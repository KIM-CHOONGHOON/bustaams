
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkNewTable() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    };

    try {
        const connection = await mysql.createConnection(config);
        
        console.log('--- [1] TB_BUS_DRIVER_VEHICLE 상세 구조 ---');
        const [cols] = await connection.execute('DESCRIBE TB_BUS_DRIVER_VEHICLE');
        cols.forEach(col => console.log(`${col.Field}: ${col.Type}`));

        await connection.end();
    } catch (err) {
        console.error('DB 접속 에러:', err.message);
    }
}

checkNewTable();
