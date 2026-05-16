
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../busTaams_server/.env') });
const { pool } = require('../busTaams_server/db.js');

async function checkReq() {
    try {
        console.log('--- TB_AUCTION_REQ 최신 5건 ---');
        const [rows] = await pool.execute('SELECT REQ_ID, TRIP_TITLE, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ ORDER BY REG_DT DESC LIMIT 5');
        console.table(rows);

        if (rows.length > 0) {
            const latestReqId = rows[0].REQ_ID;
            console.log(`\n--- 최신 REQ_ID(${latestReqId})의 유닛 정보 ---`);
            const [buses] = await pool.execute('SELECT REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [latestReqId]);
            console.table(buses);
            
            console.log(`\n--- 최신 REQ_ID(${latestReqId})의 응찰 정보 ---`);
            const [bids] = await pool.execute('SELECT REQ_BUS_SEQ, DRIVER_ID, DRIVER_BIDDING_PRICE, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [latestReqId]);
            console.table(bids);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkReq();
