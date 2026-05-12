const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
    });

    try {
        console.log('--- TB_USER_CANCEL_HIST ---');
        const [hist] = await pool.execute('DESC TB_USER_CANCEL_HIST');
        console.table(hist);

        console.log('--- TB_USER_CANCEL_MANAGE ---');
        const [manage] = await pool.execute('DESC TB_USER_CANCEL_MANAGE');
        console.table(manage);

        console.log('--- TB_CODE_DETAIL (DRIVER_CANCEL_REASON) ---');
        const [codes] = await pool.execute('SELECT * FROM TB_CODE_DETAIL WHERE GRP_CD = "DRIVER_CANCEL_REASON"');
        console.table(codes);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
