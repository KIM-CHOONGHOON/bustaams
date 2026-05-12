const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function debug() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
    });

    const targetResId = '0000000005';
    console.log(`Checking RES_ID: ${targetResId}`);

    try {
        // 1. TB_BUS_RESERVATION 확인
        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetResId]);
        console.log('TB_BUS_RESERVATION result:', resRows);

        if (resRows.length > 0) {
            const reqId = resRows[0].REQ_ID;
            console.log(`Linked REQ_ID: ${reqId}`);

            // 2. TB_AUCTION_REQ 확인
            const [reqRows] = await pool.execute('SELECT REQ_ID, TRIP_TITLE, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            console.log('TB_AUCTION_REQ result:', reqRows);
        } else {
            console.log('No record found in TB_BUS_RESERVATION for ID:', targetResId);
            
            // 만약 REQ_ID일 수도 있으니 직접 확인
            const [reqDirect] = await pool.execute('SELECT REQ_ID, TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [targetResId]);
            console.log('Direct TB_AUCTION_REQ check:', reqDirect);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
