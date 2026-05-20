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
        const addColumn = async (table, col, def) => {
            try {
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
                console.log(`Added ${col} to ${table}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`${col} already exists in ${table}`);
                } else {
                    throw err;
                }
            }
        };

        await addColumn('TB_USER_CANCEL_MANAGE', 'RESTRICT_STAT', "CHAR(1) DEFAULT 'N' COMMENT '제한 상태 (N:정상, Y:일시정지, P:영구정지)' AFTER TRADE_RESTRICT_YN");
        await addColumn('TB_USER_CANCEL_MANAGE', 'RESTRICT_START_DT', "DATETIME DEFAULT NULL COMMENT '제한 시작일' AFTER RESTRICT_STAT");
        await addColumn('TB_USER_CANCEL_MANAGE', 'RESTRICT_END_DT', "DATETIME DEFAULT NULL COMMENT '제한 종료일' AFTER RESTRICT_START_DT");
        await addColumn('TB_USER_CANCEL_MANAGE', 'USER_UUID', "BINARY(16) DEFAULT NULL AFTER CUST_ID");
        await addColumn('TB_USER_CANCEL_MANAGE', 'USER_TYPE', "VARCHAR(20) DEFAULT 'TRAVELER' AFTER USER_UUID");

        console.log('Altering TB_USER_CANCEL_HIST...');
        await addColumn('TB_USER_CANCEL_HIST', 'HIST_UUID', "BINARY(16) DEFAULT NULL FIRST");
        await addColumn('TB_USER_CANCEL_HIST', 'USER_UUID', "BINARY(16) DEFAULT NULL AFTER HIST_UUID");
        await addColumn('TB_USER_CANCEL_HIST', 'USER_TYPE', "VARCHAR(20) DEFAULT 'TRAVELER' AFTER USER_UUID");

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}
migrate();
