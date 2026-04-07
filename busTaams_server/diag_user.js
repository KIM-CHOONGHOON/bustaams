const mysql = require('mysql2/promise');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function checkSpecificUser() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        const [rows] = await pool.execute('SELECT * FROM TB_USER');
        const targetUserId = 'test-final@bustams.com';
        
        console.log(`Searching for email: ${targetUserId}`);
        const user = rows.find(row => {
            const decId = decrypt(row.USER_ID_ENC);
            return decId === targetUserId;
        });

        if (!user) {
            console.log('User not found.');
            return;
        }

        console.log('--- Raw User Keys ---');
        console.log(Object.keys(user));
        
        console.log('--- Raw Column Values ---');
        console.log('HP_NO:', user.HP_NO);
        console.log('USER_NM:', user.USER_NM);
        
        console.log('--- Decrypted Values ---');
        console.log('Decrypted Name:', decrypt(user.USER_NM));
        console.log('Decrypted Phone:', decrypt(user.HP_NO));

    } catch (error) {
        console.error('Diagnostic error:', error);
    } finally {
        await pool.end();
    }
}

checkSpecificUser();
