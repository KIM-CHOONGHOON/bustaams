
const pool = require('./db');

async function checkUser() {
    try {
        const userId = 'driver1';
        console.log(`Checking user: ${userId}`);
        
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID, USER_TYPE, USER_STAT FROM TB_USER WHERE USER_ID = ?', [userId]);
        console.log('User Record:', JSON.stringify(users, null, 2));
        
        if (users.length > 0) {
            const custId = users[0].CUST_ID;
            const [penalties] = await pool.execute('SELECT * FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?', [custId]);
            console.log('Penalty Record:', JSON.stringify(penalties, null, 2));
        } else {
            console.log('User driver1 not found in TB_USER');
        }
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

checkUser();
