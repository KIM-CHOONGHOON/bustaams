const { pool } = require('./db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_BUS_RESERVATION');
        console.log('--- TB_BUS_RESERVATION Schema ---');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkSchema();
