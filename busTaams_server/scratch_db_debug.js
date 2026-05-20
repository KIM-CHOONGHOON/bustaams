const { pool } = require('./db');
async function test() {
    console.log('🚀 DB Query Test Starting...');
    try {
        const [rows] = await pool.execute(`
            SELECT 
                r.RES_ID as resId,
                r.REQ_ID as reqId,
                r.DRIVER_ID as driverId,
                d.USER_NM as driverName,
                d.USER_ID as driverUserId,
                req.TRIP_TITLE as tripTitle,
                t.USER_NM as travelerName,
                r.DRIVER_BIDDING_PRICE as biddingPrice,
                r.RES_FEE_TOTAL_AMT as feeTotalAmt,
                r.DATA_STAT as dataStat,
                DATE_FORMAT(r.CONFIRM_DT, '%Y-%m-%d %H:%i') as confirmDt,
                DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt,
                req.START_ADDR as startAddr,
                req.END_ADDR as endAddr
            FROM TB_BUS_RESERVATION r
            INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
            INNER JOIN TB_AUCTION_REQ req ON r.REQ_ID = req.REQ_ID
            LEFT JOIN TB_USER t ON req.TRAVELER_ID = t.CUST_ID
            WHERE TRIM(d.RECOM_CODE) = TRIM(?)
            ORDER BY r.REG_DT DESC
        `, ['admin']);
        console.log('✅ Success! Rows found:', rows.length);
        console.log('Data:', JSON.stringify(rows.slice(0, 2), null, 2));
    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
