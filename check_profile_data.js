require('dotenv').config({ path: './busTaams_server/.env' });
const { pool } = require('./busTaams_server/db');

async function check() {
    try {
        console.log('\n--- USER_PROFILE category in TB_FILE_MASTER ---');
        const [fileRows] = await pool.execute('SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_CATEGORY = "USER_PROFILE" LIMIT 5');
        console.log(JSON.stringify(fileRows, null, 2));

        console.log('\n--- TB_USER Data ---');
        const [rows] = await pool.execute('SELECT CUST_ID, USER_ID, USER_IMAGE, PROFILE_FILE_ID FROM TB_USER WHERE PROFILE_FILE_ID IS NOT NULL LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
