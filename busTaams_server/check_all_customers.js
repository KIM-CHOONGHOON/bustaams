const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkAllUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const [users] = await connection.execute('SELECT CUST_ID, USER_ID, USER_NM, USER_TYPE, USER_STAT FROM TB_USER LIMIT 30');
        console.log('--- All Users (from TB_USER) ---');
        console.table(users);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkAllUsers();
