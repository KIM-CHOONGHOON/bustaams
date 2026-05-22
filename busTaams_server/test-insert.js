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
        await conn.beginTransaction();
        const data = {
            jobId: 'TEST_001',
            jobName: 'Test Job',
            description: 'Test Desc',
            useYn: 'Y',
            execPath: '/test.sh',
            execCycle: 'DAILY',
            retryPolicy: 'RETRYABLE',
            maxRetry: 3,
            execTime: '00:00:00',
            execMonth: '*',
            execDay: '*',
            execDow: '*',
            calcRule: 'T',
            holidayRule: 'RUN'
        };
        await conn.execute(
            `INSERT INTO TB_BATCH_JOB_MST (
                BATCH_JOB_ID, BATCH_JOB_NM, JOB_DESC, USE_YN,
                EXEC_FILE_PATH, EXEC_CYCLE, RETRY_POLICY, MAX_RETRY_CNT, REG_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                data.jobId, data.jobName, data.description, data.useYn,
                data.execPath, data.execCycle, data.retryPolicy, data.maxRetry || 3
            ]
        );
        console.log("MST Insert OK");

        await conn.execute(
            `INSERT INTO TB_BATCH_SCHED (
                BATCH_JOB_ID, EXEC_TIME, EXEC_MONTH, EXEC_DAY, EXEC_DOW,
                CALC_RULE, HOLIDAY_RULE, USE_YN, REG_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                data.jobId, data.execTime || '00:00:00', data.execMonth || '*', data.execDay || '*', data.execDow || '*',
                data.calcRule || 'T', data.holidayRule || 'RUN', data.useYn
            ]
        );
        console.log("SCHED Insert OK");
        await conn.rollback();
    } catch(e) { console.error("Error:", e.message); }
    conn.end();
}
main();
