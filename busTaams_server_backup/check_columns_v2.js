const { pool } = require('./db');

async function checkColumns() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_USER');
        console.log('Columns in TB_USER:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        
        const [rows2] = await pool.execute('DESCRIBE TB_BUS_RESERVATION');
        console.log('\nColumns in TB_BUS_RESERVATION:');
        rows2.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
