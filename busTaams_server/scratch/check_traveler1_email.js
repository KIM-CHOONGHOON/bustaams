
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUser() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute("SELECT CUST_ID, USER_ID, USER_NM, EMAIL, USER_TYPE FROM TB_USER WHERE CUST_ID = '0000000002'");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkUser();
