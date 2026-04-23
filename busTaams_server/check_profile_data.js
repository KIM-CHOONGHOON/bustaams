const { pool } = require('./db');

async function checkUserData() {
    try {
        console.log('--- TB_USER PROFILE_IMG_PATH Check ---');
        const [rows] = await pool.execute('SELECT USER_ID, USER_NM, PROFILE_IMG_PATH FROM TB_USER LIMIT 10');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking user data:', err);
        process.exit(1);
    }
}

checkUserData();
