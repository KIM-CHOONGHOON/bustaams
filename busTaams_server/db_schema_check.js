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
        // 1. 테이블 목록 전체 조회
        const [tables] = await pool.query("SHOW TABLES;");
        console.log("\n📋 전체 테이블 목록:");
        tables.forEach(t => console.log("  -", Object.values(t)[0]));

        // 2. 경매 관련 테이블 스키마 확인
        const targetTables = ['TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_AUCTION_REQ_VIA', 'TB_BUS_RESERVATION'];
        for (const tbl of targetTables) {
            try {
                const [rows] = await pool.query(`DESCRIBE ${tbl}`);
                console.log(`\n✅ ${tbl} 스키마:`);
                console.table(rows.map(r => ({ 컬럼: r.Field, 타입: r.Type, NULL: r.Null, 키: r.Key, 기본값: r.Default })));
            } catch (e) {
                console.log(`\n❌ ${tbl} 테이블 없음: ${e.message}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
