const { pool } = require('./db');

async function test(reqId, custId) {
    try {
        console.log(`[TEST] Fetching for REQ_ID: ${reqId}, CUST_ID: ${custId}`);
        
        // 1. tripRows
        const [tripRows] = await pool.execute(`
            SELECT REQ_ID, TRIP_TITLE, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?
        `, [reqId, custId]);
        console.log('TripRows:', tripRows);

        // 2. bidRows
        const [bidRows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ as unitSeq,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as unitStat,
                res.RES_ID as estimateId,
                res.DRIVER_BIDDING_PRICE as price,
                res.DATA_STAT as bidStat,
                u.USER_NM as driverName
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ
            LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            WHERE rb.REQ_ID = ?
        `, [reqId]);
        console.log('BidRows count:', bidRows.length);
        console.log('BidRows sample:', bidRows.slice(0, 5));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test(process.argv[2], process.argv[3]);
