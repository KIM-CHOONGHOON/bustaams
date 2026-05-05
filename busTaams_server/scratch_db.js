const { pool } = require('./db');
require('dotenv').config();

async function dump() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_AUCTION_REQ');
        console.log('Columns of TB_AUCTION_REQ:');
        rows.forEach(row => console.log(`- ${row.Field}: ${row.Type}`));
        
        const [data] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ LIMIT 1');
        console.log('Sample REQ_ID:', data[0] ? data[0].REQ_ID : 'None');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

dump();
