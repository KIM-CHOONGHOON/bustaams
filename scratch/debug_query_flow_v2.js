
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const idParam = '0000000005';
        const [rows] = await pool.execute('SELECT REQ_ID, TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [idParam]);
        console.log(`TB_AUCTION_REQ for ${idParam}:`, rows);

        const [resRows] = await pool.execute('SELECT RES_ID, REQ_ID, TRAVELER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [idParam]);
        console.log(`TB_BUS_RESERVATION for ${idParam}:`, resRows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
