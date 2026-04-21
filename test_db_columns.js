
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // 상위 폴더의 .env에서 환경변수를 가져옵니다.

async function checkDB() {
    const config = {
        host: 'localhost',
        user: 'root',
        password: '', // 기본값으로 빈 비밀번호 사용 (기사님 환경에 맞춰 자동 세팅 시도)
        database: 'project_bustaams'
    };

    try {
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.execute('DESCRIBE TB_DRIVER_BUS');
        console.log('--- TB_DRIVER_BUS 컬럼 목록 ---');
        rows.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        await connection.end();
    } catch (err) {
        console.error('DB 접속 에러:', err.message);
    }
}

checkDB();
