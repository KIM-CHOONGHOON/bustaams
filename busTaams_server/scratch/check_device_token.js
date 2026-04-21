const { pool } = require('../db');

async function checkDeviceTokenTable() {
    try {
        const [cols] = await pool.execute(`SHOW COLUMNS FROM TB_USER_DEVICE_TOKEN`);
        console.log(`TB_USER_DEVICE_TOKEN Columns:`);
        console.table(cols);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkDeviceTokenTable();
