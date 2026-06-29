const { pool } = require('./db');
const { decrypt } = require('./crypto');

async function checkSpecificDuplicate() {
    try {
        console.log('Checking for resident number: 7202121177820');
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID, USER_TYPE, RESIDENT_NO_ENC FROM TB_USER');
        
        const targetRRN = '7202121177820';
        const matches = [];

        for (const user of users) {
            if (user.RESIDENT_NO_ENC) {
                try {
                    const decrypted = decrypt(user.RESIDENT_NO_ENC);
                    if (decrypted && decrypted.trim() === targetRRN) {
                        matches.push({
                            CUST_ID: user.CUST_ID,
                            USER_ID: user.USER_ID,
                            USER_TYPE: user.USER_TYPE
                        });
                    }
                } catch (e) {
                    // Skip decryption errors
                }
            }
        }

        if (matches.length > 0) {
            console.log('Found matches:');
            console.table(matches);
        } else {
            console.log('No matches found for this specific RRN.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSpecificDuplicate();
