const { pool } = require('./db');

async function testQuery() {
    try {
        const reqId = '0000000001';
        const query = `
            SELECT 
                rb.REQ_BUS_SEQ as unitSeq,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as unitStat,
                rb.RES_BUS_AMT as unitReqAmt,
                res.RES_ID as estimateId,
                res.DRIVER_BIDDING_PRICE as price,
                res.DATA_STAT as bidStat,
                u.USER_NM as driverName,
                u.JOIN_DT as joinDt,
                (SELECT ROUND(AVG(STAR_RATING), 1) FROM TB_TRIP_REVIEW WHERE DRIVER_ID = u.CUST_ID) as rating,
                db.MODEL_NM as busModel,
                db.MANUFACTURE_YEAR as busYear,
                db.VEHICLE_NO as busNo,
                db.AMENITIES as amenities,
                db.HAS_ADAS as hasAdas,
                DATE_FORMAT(db.INSURANCE_EXP_DT, '%Y-%m-%d') as insuranceExpDt,
                DATE_FORMAT(db.LAST_INSPECT_DT, '%Y-%m-%d') as lastInspectDt,
                db.VEHICLE_PHOTOS_JSON as busPhotos,
                f.GCS_PATH as driverImageRaw
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ
            LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON res.BUS_ID = db.BUS_ID
            WHERE rb.REQ_ID = ?
            ORDER BY rb.REQ_BUS_SEQ ASC, res.DRIVER_BIDDING_PRICE ASC
        `;
        const [rows] = await pool.execute(query, [reqId]);
        console.log('Query Success!');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Query Failed:', err.message);
        process.exit(1);
    }
}

testQuery();
