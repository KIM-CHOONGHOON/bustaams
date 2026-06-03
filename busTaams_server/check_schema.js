const { pool } = require('./db');

async function checkSchema() {
    try {
        console.log('--- TB_BUS_RESERVATION ---');
        const [resRows] = await pool.execute('DESC TB_BUS_RESERVATION');
        console.table(resRows);

        console.log('--- TB_DRIVER_DETAIL ---');
        const [momRows] = await pool.execute('DESC TB_DRIVER_DETAIL');
        console.table(momRows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
