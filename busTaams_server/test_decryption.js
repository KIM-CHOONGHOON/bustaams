const mysql = require('mysql2/promise');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function testDecryption() {
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
        const [rows] = await pool.execute('SELECT USER_ID_ENC, USER_NM, HP_NO FROM TB_USER LIMIT 1');
        if (rows.length === 0) {
            console.log('No users found.');
            return;
        }
        const user = rows[0];
        console.log('--- Raw Data ---');
        console.log(user);
        
        console.log('--- Decrypted Data ---');
        console.log('User ID (Email):', decrypt(user.USER_ID_ENC));
        console.log('User Name:', decrypt(user.USER_NM));
        console.log('Phone No:', decrypt(user.HP_NO));
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await pool.end();
    }
}

testDecryption();
