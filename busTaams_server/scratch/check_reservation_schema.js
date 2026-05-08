const { pool } = require('../db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute(`DESC TB_BUS_RESERVATION`);
        console.log('Schema:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkSchema();
