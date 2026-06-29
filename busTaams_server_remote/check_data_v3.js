
const { pool } = require('./db');

async function checkData() {
    try {
        console.log('Checking TB_AUCTION_REQ sample...');
        const [rows] = await pool.execute('SELECT TRAVELER_ID FROM TB_AUCTION_REQ LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkData();
