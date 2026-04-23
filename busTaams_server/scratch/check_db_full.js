
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkActualDB() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    };

    try {
        const connection = await mysql.createConnection(config);
        
        console.log('--- [1] 전체 테이블 목록 ---');
        const [tables] = await connection.execute('SHOW TABLES');
        tables.forEach(row => console.log(Object.values(row)[0]));

        console.log('\n--- [2] TB_USER 상세 구조 ---');
        try {
            const [userCols] = await connection.execute('DESCRIBE TB_USER');
            userCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (e) {
            console.log('TB_USER 테이블이 존재하지 않습니다.');
        }

        console.log('\n--- [3] TB_SMS_LOG 상세 구조 ---');
        try {
            const [smsCols] = await connection.execute('DESCRIBE TB_SMS_LOG');
            smsCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (e) {
            console.log('TB_SMS_LOG 테이블이 존재하지 않습니다.');
        }

        await connection.end();
    } catch (err) {
        console.error('DB 접속 에러:', err.message);
    }
}

checkActualDB();
