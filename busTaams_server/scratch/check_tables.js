
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
        
        const tables = ['TB_USER', 'TB_FILE_MASTER', 'TB_USER_TERMS_HIST', 'TB_SMS_LOG', 'TB_DRIVER_DETAIL', 'TB_DRIVER_DOCS', 'TB_BUS_DRIVER_VEHICLE'];
        
        for (const table of tables) {
            console.log(`\n--- ${table} 구조 ---`);
            try {
                const [rows] = await connection.execute(`DESCRIBE ${table}`);
                rows.forEach(col => console.log(`${col.Field}: ${col.Type}`));
            } catch (e) {
                console.log(`${table} 테이블이 존재하지 않거나 오류 발생: ${e.message}`);
            }
        }
        
        await connection.end();
    } catch (err) {
        console.error('DB 접속 에러:', err.message);
    }
}

checkDB();
