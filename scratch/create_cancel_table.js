const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function createTable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Creating TB_USER_CANCEL_MANAGE ---');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS TB_USER_CANCEL_MANAGE (
                CUST_ID varchar(10) NOT NULL,
                CANCEL_CNT int NOT NULL DEFAULT '0' COMMENT '누적 취소 건수',
                CANCEL_BUS_DRIVER_CNT int NOT NULL DEFAULT '0' COMMENT '버스기사 누적 취소 건수',
                CANCEL_TRAVELER_ALL_CNT int NOT NULL DEFAULT '0' COMMENT '여행자 여행 전체취소 누적 건수',
                CANCEL_TRAVELER_PARTIAL_BUS_CNT int NOT NULL DEFAULT '0' COMMENT '여행자 버스 부분 취소 누적 건수',
                TRADE_RESTRICT_YN char(1) NOT NULL DEFAULT 'N' COMMENT '거래제한 여부 Y/N',
                TRADE_RESTRICT_START_DT datetime DEFAULT NULL COMMENT '거래제한 시작일시',
                TRADE_RESTRICT_END_DT datetime DEFAULT NULL COMMENT '거래제한 종료일시',
                REG_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마스터 등록 일시',
                REG_ID varchar(10) DEFAULT NULL COMMENT '등록자 ID',
                MOD_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마스터 수정 일시',
                MOD_ID varchar(10) DEFAULT NULL COMMENT '수정자 ID',
                PRIMARY KEY (CUST_ID),
                KEY IDX_UCM_USER (CUST_ID)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='고객별·유형별 취소 누적·거래제한 마스터'
        `);
        console.log('- Table [TB_USER_CANCEL_MANAGE] created or already exists.');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

createTable();
