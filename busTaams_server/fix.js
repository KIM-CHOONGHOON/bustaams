const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.execute(`
            SELECT r.REQ_ID, r.TRIP_TITLE, r.DATA_STAT as REQ_STAT, rb.DATA_STAT as BUS_STAT, res.RES_ID, res.DATA_STAT as RES_STAT 
            FROM TB_AUCTION_REQ r 
            JOIN TB_AUCTION_REQ_BUS rb ON r.REQ_ID = rb.REQ_ID 
            LEFT JOIN TB_BUS_RESERVATION res ON r.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ 
            WHERE r.DATA_STAT = 'BIDDING' OR rb.DATA_STAT = 'BIDDING' OR res.DATA_STAT = 'BIDDING'
            ORDER BY r.REG_DT DESC LIMIT 5
        `);
        console.log("Found requests to fix:", rows);
        
        for (const row of rows) {
            // These requests have been paid but failed to update due to ONLY_FULL_GROUP_BY bug
            await pool.execute("UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM', CONFIRM_DT = NOW() WHERE RES_ID = ?", [row.RES_ID]);
            await pool.execute("UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'CONFIRM' WHERE REQ_ID = ?", [row.REQ_ID]);
            await pool.execute("UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM' WHERE REQ_ID = ?", [row.REQ_ID]);
            console.log('Fixed REQ_ID:', row.REQ_ID);
        }
    } catch(e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}

fix();
