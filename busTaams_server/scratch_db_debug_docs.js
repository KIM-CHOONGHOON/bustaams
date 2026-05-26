const { pool } = require('./db');
async function test() {
    console.log('🚀 Checking TB_DRIVER_DOCS...');
    try {
        const [rows] = await pool.execute(`
            SELECT CUST_ID, DOC_TYPE, DOC_TYPE_SEQ, GCS_PATH, ORG_FILE_NM, APPROVE_STAT 
            FROM TB_DRIVER_DOCS 
            LIMIT 20
        `);
        console.log('✅ Success! Rows found:', rows.length);
        console.table(rows);
    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
