const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function checkDb() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- TB_USER Sample ---');
        const [users] = await pool.execute('SELECT CUST_ID, USER_ID, HP_NO FROM TB_USER LIMIT 10');
        console.table(users);

        console.log('--- TB_SMS_LOG Schema ---');
        const [schema] = await pool.execute('DESCRIBE TB_SMS_LOG');
        console.table(schema);

        console.log('--- TB_SMS_LOG FIND_ACCOUNT entries ---');
        const [findLogs] = await pool.execute('SELECT * FROM TB_SMS_LOG WHERE SEND_CATEGORY = "FIND_ACCOUNT" ORDER BY REG_DT DESC LIMIT 5');
        console.table(findLogs);

        console.log('--- Signup Check for 01083062459 ---');
        const [checkSignup] = await pool.execute('SELECT 1 FROM TB_USER WHERE HP_NO = "01083062459"');
        console.log('Exists:', checkSignup.length > 0);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
