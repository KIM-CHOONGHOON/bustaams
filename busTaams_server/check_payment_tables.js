const { pool } = require('./db');

async function checkPaymentTables() {
    try {
        console.log('--- TB_BUS_RESERVATION Columns ---');
        const [resRows] = await pool.execute('SHOW COLUMNS FROM TB_BUS_RESERVATION');
        console.table(resRows.map(r => ({ Field: r.Field, Type: r.Type })));

        console.log('--- TB_AUCTION_REQ_BUS Columns ---');
        const [reqBusRows] = await pool.execute('SHOW COLUMNS FROM TB_AUCTION_REQ_BUS');
        console.table(reqBusRows.map(r => ({ Field: r.Field, Type: r.Type })));

        console.log('--- TB_AUCTION_REQ Columns ---');
        const [reqRows] = await pool.execute('SHOW COLUMNS FROM TB_AUCTION_REQ');
        console.table(reqRows.map(r => ({ Field: r.Field, Type: r.Type })));

        process.exit(0);
    } catch (err) {
        console.error('Error checking tables:', err);
        process.exit(1);
    }
}

checkPaymentTables();
