
const { pool } = require('./db');

async function checkSchema() {
    try {
        console.log('Checking TB_USER_CANCEL_MANAGE columns...');
        const [rows] = await pool.execute('DESC TB_USER_CANCEL_MANAGE');
        console.log(JSON.stringify(rows, null, 2));
        
        console.log('\nChecking TB_USER columns...');
        const [uRows] = await pool.execute('DESC TB_USER');
        console.log(JSON.stringify(uRows, null, 2));
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
