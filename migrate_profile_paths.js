require('dotenv').config({ path: './busTaams_server/.env' });
const { pool, bucketName } = require('./busTaams_server/db');

async function migrate() {
    try {
        const fullUrlPrefix = `https://storage.googleapis.com/${bucketName}/`;
        console.log(`Using Prefix: ${fullUrlPrefix}`);

        // 1. Update TB_FILE_MASTER.GCS_PATH for USER_PROFILE
        console.log('Updating TB_FILE_MASTER.GCS_PATH...');
        const [res1] = await pool.execute(`
            UPDATE TB_FILE_MASTER 
            SET GCS_PATH = CONCAT(?, GCS_PATH)
            WHERE FILE_CATEGORY = 'USER_PROFILE' AND GCS_PATH NOT LIKE 'http%'
        `, [fullUrlPrefix]);
        console.log(`Updated ${res1.affectedRows} rows in TB_FILE_MASTER.`);

        // 2. Update TB_USER.USER_IMAGE
        console.log('Updating TB_USER.USER_IMAGE...');
        const [res2] = await pool.execute(`
            UPDATE TB_USER u
            JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            SET u.USER_IMAGE = f.GCS_PATH
            WHERE u.USER_IMAGE IS NULL OR u.USER_IMAGE NOT LIKE 'http%'
        `);
        console.log(`Updated ${res2.affectedRows} rows in TB_USER.`);

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
