const { pool } = require('./db');

async function testFixedQuery() {
    try {
        console.log('--- Testing Fixed Query (Latest Schema) ---');
        const reqId = '0000000008'; // 로그에 있던 REQ_ID
        const query = `
            SELECT 
                rb.REQ_BUS_SEQ as reqBusUuid,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as status,
                rb.RES_BUS_AMT as price,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
                 WHERE b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ AND b.DATA_STAT = 'BIDDING') as bidCount,
                res.DRIVER_ID as driverId,
                u_driver.USER_NM as driverName,
                u_driver.HP_NO as driverHp,
                u_driver.USER_IMAGE as driverAvatar,
                dv.VEHICLE_NO as busNo,
                dv.MODEL_NM as busModel,
                res.DRIVER_BIDDING_PRICE as confirmedPrice,
                res.DATA_STAT as resStatus
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT = 'CONFIRM'
            LEFT JOIN TB_USER u_driver ON res.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON res.BUS_ID = dv.BUS_ID
            WHERE rb.REQ_ID = ?
        `;
        const [rows] = await pool.execute(query, [reqId]);
        console.log('Query Success with Fixed Schema!');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Query Failed with Fixed Schema:', err.message);
        process.exit(1);
    }
}

testFixedQuery();
