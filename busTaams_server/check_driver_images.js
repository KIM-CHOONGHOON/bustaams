const { pool } = require('./db');

async function checkDriverImages() {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                u.CUST_ID, 
                u.USER_NM, 
                u.PROFILE_FILE_ID, 
                u.USER_IMAGE, 
                u.PROFILE_IMG_PATH,
                f.GCS_PATH
            FROM TB_USER u
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            WHERE u.USER_TYPE = 'DRIVER'
            LIMIT 10
        `);
        console.log('Driver Image Info:');
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkDriverImages();
