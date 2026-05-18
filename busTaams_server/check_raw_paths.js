const { pool } = require('./db');

async function checkRawPaths() {
    try {
        console.log('--- TB_USER.USER_IMAGE Sample ---');
        const [userRows] = await pool.execute('SELECT USER_ID, USER_NM, USER_IMAGE FROM TB_USER WHERE USER_IMAGE IS NOT NULL LIMIT 5');
        console.table(userRows);

        console.log('\n--- TB_FILE_MASTER Sample (USER_PROFILE) ---');
        const [fileRows] = await pool.execute("SELECT FILE_ID, FILE_CATEGORY, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_CATEGORY = 'USER_PROFILE' LIMIT 5");
        console.table(fileRows);

        console.log('\n--- TB_FILE_MASTER Sample (SIGNATURE) ---');
        const [signRows] = await pool.execute("SELECT FILE_ID, FILE_CATEGORY, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_CATEGORY = 'SIGNATURE' LIMIT 5");
        console.table(signRows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRawPaths();
