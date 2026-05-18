const { pool } = require('./db');

async function check() {
    try {
        const [rows] = await pool.execute('SELECT USER_ID, USER_IMAGE, PROFILE_FILE_ID FROM TB_USER WHERE USER_IMAGE IS NOT NULL LIMIT 5');
        console.log('TB_USER records:', JSON.stringify(rows, null, 2));

        if (rows.length > 0 && rows[0].PROFILE_FILE_ID) {
            const [fileRows] = await pool.execute('SELECT * FROM TB_FILE_MASTER WHERE FILE_ID = ?', [rows[0].PROFILE_FILE_ID]);
            console.log('TB_FILE_MASTER record:', JSON.stringify(fileRows, null, 2));
        }

        const { bucketName } = require('./db');
        console.log('Bucket Name (from db.js):', bucketName);
        console.log('GCS_BUCKET_NAME (from env):', process.env.GCS_BUCKET_NAME);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
