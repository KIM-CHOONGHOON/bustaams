
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const reqId = '0000000005';
    
    console.log(`--- Checking TB_AUCTION_REQ for REQ_ID: ${reqId} ---`);
    const [reqRows] = await pool.execute('SELECT START_ADDR, END_ADDR, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
    console.log('Main Req Data:', reqRows);

    console.log(`--- Checking TB_AUCTION_REQ_VIA for REQ_ID: ${reqId} ---`);
    const [viaRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC', [reqId]);
    console.log('Via Rows Count:', viaRows.length);
    console.log('Via Rows Data:', JSON.stringify(viaRows, null, 2));

    await pool.end();
}

checkData().catch(console.error);
