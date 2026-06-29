const pool = require('./db');
const bcrypt = require('bcrypt');

async function checkOasis1() {
    try {
        const userId = 'oasis1';
        console.log(`Checking user: ${userId}`);
        
        const [users] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [userId]);
        console.log('User Record:', JSON.stringify(users, null, 2));
        
        if (users.length > 0) {
            const user = users[0];
            const testPw = '!ch070809';
            const match = await bcrypt.compare(testPw, user.PASSWORD);
            console.log(`Password Match for '${testPw}':`, match);
        } else {
            console.log(`User '${userId}' not found in TB_USER.`);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

checkOasis1();
