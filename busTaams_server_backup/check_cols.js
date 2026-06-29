
const { pool } = require('./db');

async function checkSpecificColumns() {
    try {
        const tables = ['TB_USER', 'TB_FILE_MASTER', 'TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_BUS_RESERVATION'];
        for (const table of tables) {
            console.log(`--- ${table} ---`);
            const [rows] = await pool.execute(`DESC ${table}`);
            console.log(rows.map(r => r.Field).join(', '));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkSpecificColumns();
