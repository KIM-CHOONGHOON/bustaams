
const { pool } = require('../db');

async function checkTables() {
    try {
        const tables = ['TB_BID', 'TB_BUS_DRIVER_VEHICLE', 'TB_USER', 'TB_AUCTION_REQ'];
        for (const table of tables) {
            console.log(`--- Structure of ${table} ---`);
            const [rows] = await pool.execute(`DESCRIBE ${table}`);
            console.table(rows);
        }
    } catch (err) {
        console.error('Error checking tables:', err);
    } finally {
        process.exit();
    }
}

checkTables();
