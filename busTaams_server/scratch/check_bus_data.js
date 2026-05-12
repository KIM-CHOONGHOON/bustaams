
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkBusData() {
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
    
    console.log(`--- Checking TB_AUCTION_REQ_BUS & TB_BUS_DRIVER_VEHICLE for REQ_ID: ${reqId} ---`);
    const [busRows] = await pool.execute(`
        SELECT 
            rb.REQ_BUS_SEQ,
            res.DRIVER_ID,
            dv.VEHICLE_NO,
            dv.MODEL_NM,
            dv.VEHICLE_PHOTOS_JSON
        FROM TB_AUCTION_REQ_BUS rb
        LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT = 'CONFIRM'
        LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON res.BUS_ID = dv.BUS_ID
        WHERE rb.REQ_ID = ?
    `, [reqId]);
    
    console.log('Bus Data:', JSON.stringify(busRows, null, 2));

    await pool.end();
}

checkBusData().catch(console.error);
