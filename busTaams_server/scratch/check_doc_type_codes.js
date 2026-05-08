const { pool } = require('../db');

async function checkCommonCodes() {
    try {
        console.log('Checking TB_COMMON_CODE for DOC_TYPE...');
        const [rows] = await pool.execute("SELECT DTL_CD, DTL_NM FROM TB_COMMON_CODE WHERE GRP_CD = 'DOC_TYPE'");
        console.table(rows);
    } catch (error) {
        console.error('Error checking common codes:', error.message);
    } finally {
        process.exit();
    }
}

checkCommonCodes();
