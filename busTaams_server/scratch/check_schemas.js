const { pool } = require('../db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESC TB_AUCTION_REQ');
        console.log('--- TB_AUCTION_REQ Schema ---');
        console.log(JSON.stringify(rows, null, 2));
        
        const [rowsBus] = await pool.execute('DESC TB_BUS_RESERVATION');
        console.log('--- TB_BUS_RESERVATION Schema ---');
        console.log(JSON.stringify(rowsBus, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
