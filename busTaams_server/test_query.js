const { pool } = require('./db');
require('dotenv').config();

async function test() {
    try {
        const reqId = '0000000001';
        const [tripRows] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        console.log('Query with REQ_ID:', reqId);
        console.log('Result:', tripRows);
        
        const [allRows] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ LIMIT 5');
        console.log('All REQ_IDs:', allRows.map(r => r.REQ_ID));
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

test();
