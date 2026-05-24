
const { pool } = require('./db');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESC TB_USER_CANCEL_MANAGE');
        fs.writeFileSync('schema_cancel.json', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
checkSchema();
