
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('--- Checking REQ_ID 0000000008 ---');
        const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000008']);
        console.log('TB_AUCTION_REQ:', reqRows);

        console.log('\n--- Checking RES_ID 0000000005 ---');
        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', ['0000000005']);
        console.log('TB_BUS_RESERVATION:', resRows);

        console.log('\n--- Checking USER oasis ---');
        const [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', ['oasis']);
        console.log('TB_USER (oasis):', userRows);

        if (reqRows.length > 0 && userRows.length > 0) {
            console.log('\n--- Comparison ---');
            console.log('REQ.TRAVELER_ID:', reqRows[0].TRAVELER_ID);
            console.log('USER.CUST_ID:', userRows[0].CUST_ID);
            console.log('Match?', reqRows[0].TRAVELER_ID === userRows[0].CUST_ID);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
