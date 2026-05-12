const db = require('../busTaams_server/db');

async function checkData() {
    try {
        const id = '0000000008';
        console.log(`Checking data for REQ_ID: ${id}`);

        const [reqRows] = await db.pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('TB_AUCTION_REQ rows:', reqRows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
