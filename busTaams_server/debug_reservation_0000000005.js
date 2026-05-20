const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const id = '0000000005';
        console.log(`Checking for ID: ${id}`);
        
        const [reqRows] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('TB_AUCTION_REQ rows:', reqRows.length);
        if (reqRows.length > 0) {
            console.log('Found in TB_AUCTION_REQ');
            console.log('TRAVELER_ID:', reqRows[0].TRAVELER_ID);
            console.log('DATA_STAT:', reqRows[0].DATA_STAT);
        }

        const [resRows] = await pool.execute('SELECT RES_ID, REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION rows:', resRows.length);
        if (resRows.length > 0) {
            console.log('Found in TB_BUS_RESERVATION');
            console.log('REQ_ID:', resRows[0].REQ_ID);
        }

        const [resReqRows] = await pool.execute('SELECT RES_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION by REQ_ID count:', resReqRows.length);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
