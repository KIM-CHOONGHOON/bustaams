const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔧 DB 마이그레이션 시작...');

        // 1. TB_AUCTION_REQ에 PASSENGER_CNT 컬럼 추가 (BUS_CHANG_CNT 뒤에)
        // 먼저 PASSENGER_CNT 컬럼이 이미 있는지 확인
        const [cols] = await pool.query("SHOW COLUMNS FROM TB_AUCTION_REQ LIKE 'PASSENGER_CNT'");
        if (cols.length === 0) {
            await pool.query(`
                ALTER TABLE TB_AUCTION_REQ 
                ADD COLUMN PASSENGER_CNT int NOT NULL DEFAULT 0 COMMENT '탑승 인원 수'
                AFTER BUS_CHANG_CNT
            `);
            console.log('✅ TB_AUCTION_REQ.PASSENGER_CNT 컬럼 추가 완료');
        } else {
            console.log('ℹ️  TB_AUCTION_REQ.PASSENGER_CNT 컬럼이 이미 존재합니다.');
        }

        // 2. 최종 스키마 확인
        const [finalCols] = await pool.query("DESCRIBE TB_AUCTION_REQ");
        console.log('\n✅ 최종 TB_AUCTION_REQ 컬럼:');
        finalCols.forEach(c => console.log(`  - ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`));

        console.log('\n🎉 마이그레이션 완료!');
    } catch (err) {
        console.error('❌ 마이그레이션 실패:', err.message);
    } finally {
        pool.end();
    }
}
run();
