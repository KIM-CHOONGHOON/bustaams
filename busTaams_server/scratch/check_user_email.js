
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const [rows] = await connection.execute('SELECT CUST_ID, USER_ID, EMAIL, HP_NO, USER_NM FROM TB_USER');
        console.log('--- User List ---');
        rows.forEach(row => {
            console.log(`CUST_ID: ${row.CUST_ID}, USER_ID: ${row.USER_ID}, EMAIL: ${row.EMAIL}, HP: ${row.HP_NO}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

check();
