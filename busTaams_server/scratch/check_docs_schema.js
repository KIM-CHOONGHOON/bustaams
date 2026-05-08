const { pool } = require('../db');

async function checkDocTypeColumn() {
    try {
        console.log('Checking TB_DRIVER_DOCS structure...');
        const [rows] = await pool.execute("DESCRIBE TB_DRIVER_DOCS");
        console.table(rows);
    } catch (error) {
        console.error('Error checking table structure:', error.message);
    } finally {
        process.exit();
    }
}

checkDocTypeColumn();
