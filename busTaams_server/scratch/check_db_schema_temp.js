const { pool } = require('../db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_AUCTION_REQ_BUS');
        console.log('Columns in TB_AUCTION_REQ_BUS:');
        rows.forEach(row => {
            console.log(`${row.Field} (${row.Type})`);
        });
        
        const [reqRows] = await pool.execute('DESCRIBE TB_AUCTION_REQ');
        console.log('\nColumns in TB_AUCTION_REQ:');
        reqRows.forEach(row => {
            console.log(`${row.Field} (${row.Type})`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
