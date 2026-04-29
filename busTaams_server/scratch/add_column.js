const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumn() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('📡 DB 연결 성공...');

        // 1. TB_AUCTION_REQ 컬럼 추가
        try {
            await connection.execute('ALTER TABLE TB_AUCTION_REQ ADD COLUMN BUS_CHANG_CNT INT DEFAULT 0 COMMENT "기사 변경 횟수" AFTER REQ_AMT');
            console.log('✅ TB_AUCTION_REQ.BUS_CHANG_CNT 컬럼 추가 완료!');
        } catch (err) {
            if (err.errno === 1060) {
                console.log('ℹ️ TB_AUCTION_REQ.BUS_CHANG_CNT 컬럼이 이미 존재합니다.');
            } else {
                throw err;
            }
        }

        // 2. TB_USER_TERMS_HIST 테이블 존재 여부 확인 (이전 세션 에러 방지)
        // [참고] 이전 세션에서 ensureTbUserTermsHistTable 에러가 있었으므로 안전하게 유지

    } catch (error) {
        console.error('❌ 작업 실패:', error.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

addColumn();
