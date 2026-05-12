const db = require('../busTaams_server/db');

async function checkData() {
    try {
        const id = '0000000005';
        console.log(`Checking data for ID: ${id}`);

        const [reqRows] = await db.pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('TB_AUCTION_REQ rows:', reqRows);

        const [resRows] = await db.pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION (RES_ID) rows:', resRows);

        const [resRowsByReq] = await db.pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [id]);
        console.log('TB_BUS_RESERVATION (REQ_ID) rows:', resRowsByReq);

        if (reqRows.length > 0) {
            const travelerId = reqRows[0].TRAVELER_ID;
            console.log(`Traveler ID from REQ: ${travelerId}`);
            const [userRows] = await db.pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ? OR USER_ID = ?', [travelerId, travelerId]);
            console.log('Associated user rows:', userRows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
