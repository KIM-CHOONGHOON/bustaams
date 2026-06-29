const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    port: 3307,
    user: 'master',
    password: '!QAZ2wsx2026@',
    database: 'bustaams'
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('Altering TB_USER_CANCEL_MANAGE...');
        // Add columns if they don't exist
        await connection.execute(`
            ALTER TABLE TB_USER_CANCEL_MANAGE 
            ADD COLUMN IF NOT EXISTS RESTRICT_STAT CHAR(1) DEFAULT 'N' COMMENT '제한 상태 (N:정상, Y:일시정지, P:영구정지)' AFTER TRADE_RESTRICT_YN,
            ADD COLUMN IF NOT EXISTS RESTRICT_START_DT DATETIME DEFAULT NULL COMMENT '제한 시작일' AFTER RESTRICT_STAT,
            ADD COLUMN IF NOT EXISTS RESTRICT_END_DT DATETIME DEFAULT NULL COMMENT '제한 종료일' AFTER RESTRICT_START_DT,
            ADD COLUMN IF NOT EXISTS USER_UUID BINARY(16) DEFAULT NULL AFTER CUST_ID,
            ADD COLUMN IF NOT EXISTS USER_TYPE VARCHAR(20) DEFAULT 'TRAVELER' AFTER USER_UUID;
        `);

        console.log('Altering TB_USER_CANCEL_HIST...');
        // TB_USER_CANCEL_HIST often uses UUID in modern parts of the app
        await connection.execute(`
            ALTER TABLE TB_USER_CANCEL_HIST 
            ADD COLUMN IF NOT EXISTS HIST_UUID BINARY(16) DEFAULT NULL FIRST,
            ADD COLUMN IF NOT EXISTS USER_UUID BINARY(16) DEFAULT NULL AFTER HIST_UUID,
            ADD COLUMN IF NOT EXISTS USER_TYPE VARCHAR(20) DEFAULT 'TRAVELER' AFTER USER_UUID;
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}
migrate();
