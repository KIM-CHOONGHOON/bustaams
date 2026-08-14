const { pool } = require('./busTaams_server/db');

async function checkTable() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_BUS_RESERVATION');
        console.log('=== TB_BUS_RESERVATION COLUMNS ===');
        console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })));
        process.exit(0);
    } catch (err) {
        console.error('Error describing table:', err);
        process.exit(1);
    }
}

checkTable();
