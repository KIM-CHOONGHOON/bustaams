const { pool } = require('./db');

async function testAPI() {
    const userId = 'oasis1';
    try {
        const [[user]] = await pool.execute(
            `SELECT 
                u.CUST_ID,
                u.USER_IMAGE,
                f.GCS_PATH
             FROM TB_USER u
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
             WHERE u.USER_ID = ?`,
            [userId]
        );

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        const userImage = user.GCS_PATH ? `/api/common/display-image?path=${encodeURIComponent(user.GCS_PATH)}` : user.USER_IMAGE;
        console.log('Resolved userImage:', userImage);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testAPI();
