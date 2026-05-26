const { pool } = require('./db');
async function test() {
    try {
        const confirmDtFrom = '2026-05-01';
        const confirmDtTo = '2026-05-31';
        const searchKeyword = '';

        const listParams = [];
        const conditions = [`br.DATA_STAT = 'CONFIRM'`];

        if (confirmDtFrom) {
            conditions.push(`DATE(br.CONFIRM_DT) >= ?`);
            listParams.push(confirmDtFrom);
        }
        if (confirmDtTo) {
            conditions.push(`DATE(br.CONFIRM_DT) <= ?`);
            listParams.push(confirmDtTo);
        }

        const whereClause = `WHERE ` + conditions.join(` AND `);

        const listQuery = `
            SELECT
                br.RES_ID                                          as resId,
                br.REQ_ID                                          as reqId,
                req.TRIP_TITLE                                     as tripTitle,
                req.START_ADDR                                     as startAddr,
                req.END_ADDR                                       as endAddr,
                DATE_FORMAT(req.START_DT,    '%Y-%m-%d %H:%i')    as startDt,
                traveler.USER_NM                                   as travelerName,
                traveler.HP_NO                                     as travelerPhone,
                driver.USER_NM                                     as driverName,
                v.VEHICLE_NO                                       as vehicleNo,
                br.DRIVER_BIDDING_PRICE                            as driverBiddingPrice,
                br.RES_FEE_TOTAL_AMT                               as resFeeTotal,
                DATE_FORMAT(br.CONFIRM_DT,   '%Y-%m-%d %H:%i')    as confirmDt
            FROM TB_BUS_RESERVATION br
            INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
            LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
            LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
            LEFT  JOIN TB_BUS_DRIVER_VEHICLE v   ON br.BUS_ID      = v.BUS_ID
            ${whereClause}
            ORDER BY br.CONFIRM_DT DESC
        `;

        const summaryQuery = `
            SELECT
                COUNT(*)                                        as totalCount,
                IFNULL(SUM(req.REQ_AMT),          0)            as totalReqAmt,
                IFNULL(SUM(req.REQ_AMT) * 0.06,   0)            as totalFee6pct
            FROM TB_BUS_RESERVATION br
            INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
            LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
            LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
            ${whereClause}
        `;

        console.log('Parameters:', listParams);
        
        const [listRows] = await pool.execute(listQuery, listParams);
        const [summaryRows] = await pool.execute(summaryQuery, listParams);

        console.log('List Rows Count:', listRows.length);
        console.log('List Rows:', JSON.stringify(listRows, null, 2));
        console.log('Summary Row:', JSON.stringify(summaryRows[0], null, 2));

    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
