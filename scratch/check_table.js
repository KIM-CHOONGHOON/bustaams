const { pool } = require('../busTaams_server/db');

async function checkTable() {
    try {
        const [rows] = await pool.execute('DESCRIBE TB_USER_CANCEL_MANAGE');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkTable();
