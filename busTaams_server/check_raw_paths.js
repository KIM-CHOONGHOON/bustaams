const { pool } = require('./db');

async function checkRawPaths() {
    try {
        console.log('--- TB_USER.USER_IMAGE Sample ---');
        const [userRows] = await pool.execute('SELECT USER_ID, USER_NM, USER_IMAGE FROM TB_USER WHERE USER_IMAGE IS NOT NULL LIMIT 5');
        console.table(userRows);

        console.log('\n--- TB_FILE_MASTER Unique Categories and Sample Paths ---');
        const [categories] = await pool.execute("SELECT FILE_CATEGORY, COUNT(*) as count, MIN(GCS_PATH) as sample_path FROM TB_FILE_MASTER GROUP BY FILE_CATEGORY");
        console.table(categories);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRawPaths();
