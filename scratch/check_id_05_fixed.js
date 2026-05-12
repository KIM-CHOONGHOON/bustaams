const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../busTaams_server/.env') });
const mysql = require('mysql2/promise');

async function checkData() {
    const dbConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        timezone: '+09:00'
    };

    const pool = mysql.createPool(dbConfig);

    try {
        const id = '0000000005';
        console.log(`Checking data for ID: ${id}`);

        const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('TB_AUCTION_REQ rows:', reqRows);

        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION (RES_ID) rows:', resRows);

        const [resRowsByReq] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION (REQ_ID) rows:', resRowsByReq);

        if (reqRows.length > 0) {
            const travelerId = reqRows[0].TRAVELER_ID;
            console.log(`Traveler ID from REQ: ${travelerId}`);
            const [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ? OR USER_ID = ?', [travelerId, travelerId]);
            console.log('Associated user rows:', userRows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkData();
