const { pool } = require('../db');

async function checkDocTypeColumn() {
    try {
        const [rows] = await pool.execute("DESCRIBE TB_DRIVER_DOCS");
        const docType = rows.find(r => r.Field === 'DOC_TYPE');
        console.log('DOC_TYPE Column Info:', JSON.stringify(docType, null, 2));
    } catch (error) {
        console.error('Error checking table structure:', error.message);
    } finally {
        process.exit();
    }
}

checkDocTypeColumn();
