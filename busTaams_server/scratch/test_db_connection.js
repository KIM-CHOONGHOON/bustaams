const { pool } = require('../db');

async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('✅ DB Connection Successful. Result:', rows[0].result);
        process.exit(0);
    } catch (err) {
        console.error('❌ DB Connection Failed:', err.message);
        process.exit(1);
    }
}

testConnection();
