const { pool } = require('../db');
async function checkTable() {
    try {
        const [rows] = await pool.execute('DESC TB_BUS_RESERVATION');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
checkTable();
