const { pool } = require('./db');

async function debug() {
    try {
        console.log('--- TB_SMS_LOG Structure ---');
        const [rows] = await pool.execute("DESCRIBE TB_SMS_LOG");
        console.table(rows);
        
        console.log('--- Checking DB Connectivity ---');
        const [test] = await pool.execute("SELECT 1");
        console.log('DB Connected:', test);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
