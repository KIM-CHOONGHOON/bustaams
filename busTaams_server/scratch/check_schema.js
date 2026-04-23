const { pool } = require('../db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_USER');
        console.log('--- TB_USER Schema ---');
        console.table(rows);
        
        const [termsRows] = await pool.execute('DESCRIBE TB_USER_TERMS_HIST');
        console.log('\n--- TB_USER_TERMS_HIST Schema ---');
        console.table(termsRows);
    } catch (err) {
        console.error('Schema check failed:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
