const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'busTaams_server', '.env') });

const { pool } = require('./busTaams_server/db');

async function checkData() {
    try {
        const id = '0000000003';
        console.log(`Checking data for ID: ${id}`);

        const [auctionRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('\n--- TB_AUCTION_REQ ---');
        console.log(JSON.stringify(auctionRows, null, 2));

        const [reservationRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ? OR RES_ID = ?', [id, id]);
        console.log('\n--- TB_BUS_RESERVATION ---');
        console.log(JSON.stringify(reservationRows, null, 2));

        if (reservationRows.length > 0) {
            const driverId = reservationRows[0].DRIVER_ID;
            const [userRows] = await pool.execute('SELECT USER_ID, CUST_ID, USER_NM FROM TB_USER WHERE CUST_ID = ?', [driverId]);
            console.log('\n--- DRIVER USER INFO ---');
            console.log(JSON.stringify(userRows, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
