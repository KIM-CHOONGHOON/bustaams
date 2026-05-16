const { pool } = require('./db');

async function checkSchema() {
    try {
        console.log('--- TB_BUS_RESERVATION ---');
        const [resRows] = await pool.execute('DESC TB_BUS_RESERVATION');
        console.table(resRows);

        console.log('--- TB_AUCTION_REQ_BUS ---');
        const [busRows] = await pool.execute('DESC TB_AUCTION_REQ_BUS');
        console.table(busRows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
