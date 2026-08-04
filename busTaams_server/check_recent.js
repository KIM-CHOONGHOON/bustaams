const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.execute(`
            SELECT r.REQ_ID, r.TRIP_TITLE, r.DATA_STAT as REQ_STAT, r.MOD_DT, res.RES_ID, res.DATA_STAT as RES_STAT 
            FROM TB_AUCTION_REQ r 
            LEFT JOIN TB_BUS_RESERVATION res ON r.REQ_ID = res.REQ_ID 
            ORDER BY r.MOD_DT DESC LIMIT 3
        `);
        console.log("Recent requests:");
        console.table(rows);
    } catch(e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}

check();
