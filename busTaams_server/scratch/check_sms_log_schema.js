const { pool } = require('../db');

async function checkSmsLogSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_SMS_LOG');
        console.log('--- TB_SMS_LOG Schema ---');
        console.table(rows);
    } catch (err) {
        console.error('Schema check failed:', err);
    } finally {
        process.exit();
    }
}

checkSmsLogSchema();
