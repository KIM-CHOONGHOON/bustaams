
const mysql = require('mysql2/promise');
require('dotenv').config();

async function modifyDB() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    };

    try {
        const conn = await mysql.createConnection(config);
        
        // 1. 기존 혼란스러운 컬럼들 제거 (BUS_SIZE, BUS_GRADE)
        const [columns] = await conn.execute('DESCRIBE TB_DRIVER_BUS');
        const columnNames = columns.map(c => c.Field.toUpperCase());
        
        if (columnNames.includes('BUS_SIZE')) {
            await conn.execute('ALTER TABLE TB_DRIVER_BUS DROP COLUMN BUS_SIZE');
            console.log('--- BUS_SIZE 컬럼 삭제 완료 ---');
        }
        if (columnNames.includes('BUS_GRADE')) {
            await conn.execute('ALTER TABLE TB_DRIVER_BUS DROP COLUMN BUS_GRADE');
            console.log('--- BUS_GRADE 컬럼 삭제 완료 ---');
        }
        
        // 2. 통합된 BUS_TYPE_CD 컬럼 추가 (VARCHAR로 넉넉하게 설정하여 오류 방지)
        if (!columnNames.includes('BUS_TYPE_CD')) {
            await conn.execute('ALTER TABLE TB_DRIVER_BUS ADD COLUMN BUS_TYPE_CD VARCHAR(20) AFTER MANUFACTURE_YEAR');
            console.log('--- BUS_TYPE_CD 컬럼 추가 완료 ---');
        }

        console.log('--- DB 물리적 구조 변경 완료 ---');
        const [finalColumns] = await conn.execute('DESCRIBE TB_DRIVER_BUS');
        finalColumns.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        
        await conn.end();
    } catch (err) {
        console.error('DB 수정 중 에러 발생:', err.message);
    }
}

modifyDB();
