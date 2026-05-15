const { pool } = require('../db');

async function cleanUp() {
    try {
        console.log('Checking for TB_PAYMENT_LOG table...');
        const [rows] = await pool.execute("SHOW TABLES LIKE 'TB_PAYMENT_LOG'");
        if (rows.length > 0) {
            console.log('TB_PAYMENT_LOG exists. Dropping it...');
            await pool.execute('DROP TABLE TB_PAYMENT_LOG');
            console.log('Table dropped successfully.');
        } else {
            console.log('TB_PAYMENT_LOG does not exist.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanUp();
