const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        await conn.query(`
        CREATE TABLE TB_BATCH_SCHED (
            SCHED_ID INT AUTO_INCREMENT NOT NULL COMMENT '스케줄ID',
            BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
            EXEC_TIME TIME NOT NULL COMMENT '수행시간',
            EXEC_MONTH VARCHAR(2) DEFAULT '*' NOT NULL COMMENT '수행월(1~12 또는 *)',
            EXEC_DAY VARCHAR(2) DEFAULT '*' NOT NULL COMMENT '수행일(1~31 또는 *)',
            EXEC_DOW VARCHAR(7) DEFAULT '*' NOT NULL COMMENT '수행요일(1:일~7:토 또는 *)',
            CALC_RULE VARCHAR(10) DEFAULT 'T' NOT NULL COMMENT '기준일계산규칙(T:당일,T-1:전일,M-1:전월)',
            HOLIDAY_RULE VARCHAR(20) DEFAULT 'RUN' NOT NULL COMMENT '휴일처리방식(RUN:휴일실행,PREV_BIZ:전영업일,NEXT_BIZ:다음영업일)',
            USE_YN CHAR(1) DEFAULT 'Y' NOT NULL COMMENT '사용여부(Y,N)',
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
            REG_ID VARCHAR(10) COMMENT '등록자 ID',
            MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
            MOD_ID VARCHAR(10) COMMENT '수정자 ID',
            PRIMARY KEY (SCHED_ID),
            FOREIGN KEY (BATCH_JOB_ID) REFERENCES TB_BATCH_JOB_MST (BATCH_JOB_ID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치스케줄등록';
        `);
        console.log("Table created.");
    } catch(e) { console.error(e.message); }
    conn.end();
}
main();
