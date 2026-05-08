const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [users] = await pool.query("SELECT CUST_ID, USER_ID FROM TB_USER WHERE USER_ID = 'busgisa04'");
        if (users.length === 0) {
            console.log("User 'busgisa04' not found in TB_USER.");
            return;
        }
        const custId = users[0].CUST_ID;
        console.log(`User 'busgisa04' has CUST_ID: ${custId}`);

        const [cancelData] = await pool.query("SELECT * FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?", [custId]);
        if (cancelData.length === 0) {
            console.log(`No data found in TB_USER_CANCEL_MANAGE for CUST_ID: ${custId}`);
        } else {
            console.log(`Data found in TB_USER_CANCEL_MANAGE for CUST_ID: ${custId}:`);
            console.table(cancelData);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
