const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function recreateTable() {
    try {
        console.log('--- Dropping existing TB_DRIVER_DETAIL ---');
        await pool.query('DROP TABLE IF EXISTS TB_DRIVER_DETAIL');

        console.log('--- Creating new TB_DRIVER_DETAIL ---');
        const createTableSql = `
            CREATE TABLE TB_DRIVER_DETAIL (
                CUST_ID VARCHAR(10) NOT NULL PRIMARY KEY COMMENT '기사 식별자',
                BIRTH_YMD VARCHAR(6) COMMENT '생년월일',
                SEX VARCHAR(1) COMMENT '성별',
                ADDR_TYPE ENUM('HOME','OFFICE','OTHER') NOT NULL DEFAULT 'HOME' COMMENT '주소 타입',
                ADDR_NAME VARCHAR(40) COMMENT '주소 별칭',
                ZIPCODE VARCHAR(10) COMMENT '우편번호',
                ADDRESS VARCHAR(255) COMMENT '기본 주소',
                DETAIL_ADDRESS VARCHAR(255) COMMENT '상세 주소',
                FEE_POLICY VARCHAR(30) COMMENT '요금제',
                SELF_INTRO VARCHAR(500) COMMENT '자기소개',
                REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
                REG_ID  VARCHAR(30),
                MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                MOD_ID  VARCHAR(30),
                CONSTRAINT FK_DETAIL_USER FOREIGN KEY (CUST_ID) REFERENCES TB_USER (CUST_ID) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='기사 상세 인적 사항 및 주소 정보'
        `;
        await pool.query(createTableSql);

        console.log('✅ TABLE TB_DRIVER_DETAIL RECREATED SUCCESSFULLY');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during table recreation:', err);
        process.exit(1);
    }
}

recreateTable();
