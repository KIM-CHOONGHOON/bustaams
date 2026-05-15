require('dotenv').config({ path: './busTaams_server/.env' });
const { pool } = require('./busTaams_server/db');

async function check() {
    try {
        const [rows] = await pool.execute('SELECT FILE_ID, FILE_CATEGORY, GCS_PATH FROM TB_FILE_MASTER');
        const relatives = rows.filter(r => !r.GCS_PATH.startsWith('http'));
        
        console.log('Total records:', rows.length);
        console.log('Total relative paths found:', relatives.length);
        if (relatives.length > 0) {
            console.log('Examples:', JSON.stringify(relatives.slice(0, 10), null, 2));
        }
        
        const [userRows] = await pool.execute('SELECT CUST_ID, USER_ID, USER_IMAGE FROM TB_USER');
        const userRelatives = userRows.filter(r => r.USER_IMAGE && !r.USER_IMAGE.startsWith('http'));
        console.log('Total user profile relative paths found:', userRelatives.length);
        if (userRelatives.length > 0) {
            console.log('User Examples:', JSON.stringify(userRelatives.slice(0, 10), null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
