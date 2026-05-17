const { pool } = require('./db');

async function checkSchema() {
    try {
        console.log('--- TB_USER Structure ---');
        const [userCols] = await pool.execute('DESCRIBE TB_USER');
        console.table(userCols);

        console.log('\n--- TB_USER_CANCEL_MANAGE Structure ---');
        const [cancelCols] = await pool.execute('DESCRIBE TB_USER_CANCEL_MANAGE');
        console.table(cancelCols);
        
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err.message);
        process.exit(1);
    }
}

checkSchema();
