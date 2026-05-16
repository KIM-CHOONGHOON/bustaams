
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/LG/AI자동화/project_bustaams/busTaams_server/.env' });

async function checkData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('--- Checking TB_BUS_RESERVATION for REQ_ID 0000000003 ---');
        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', ['0000000003']);
        console.log('TB_BUS_RESERVATION:', JSON.stringify(resRows, null, 2));

        if (resRows.length > 0) {
            const driverId = resRows[0].DRIVER_ID;
            console.log('\n--- Checking TB_USER for DRIVER_ID', driverId, '---');
            const [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ?', [driverId]);
            console.log('TB_USER (Driver):', JSON.stringify(userRows, null, 2));
        }

        console.log('\n--- Checking TB_AUCTION_REQ for REQ_ID 0000000003 ---');
        const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000003']);
        console.log('TB_AUCTION_REQ:', JSON.stringify(reqRows, null, 2));

        console.log('\n--- Checking TB_AUCTION_REQ_VIA for REQ_ID 0000000003 ---');
        const [viaRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ?', ['0000000003']);
        console.log('TB_AUCTION_REQ_VIA:', JSON.stringify(viaRows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
