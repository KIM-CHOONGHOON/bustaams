const { pool } = require('../db');

async function checkFileMasterSchema() {
    try {
        const [rows] = await pool.execute("DESCRIBE TB_FILE_MASTER");
        const category = rows.find(r => r.Field === 'FILE_CATEGORY');
        console.log('FILE_CATEGORY Column Info:', JSON.stringify(category, null, 2));
    } catch (error) {
        console.error('Error checking table structure:', error.message);
    } finally {
        process.exit();
    }
}

checkFileMasterSchema();
