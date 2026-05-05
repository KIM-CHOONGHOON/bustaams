const { pool } = require('../db');

async function test() {
    const custId = '0000000001';
    try {
        console.log('--- Final Test of Pending Missions Query ---');
        const query = `
            SELECT 
                b.RES_ID as id,
                r.REQ_ID as reqId,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as date,
                db.MODEL_NM as busModel,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) as busCnt,
                u_driver.USER_NM as driverName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            WHERE r.TRAVELER_ID = ? 
              AND b.DATA_STAT = 'DONE'
              AND NOT EXISTS (SELECT 1 FROM TB_TRIP_REVIEW WHERE RES_ID = b.RES_ID)
            ORDER BY r.END_DT DESC
        `;
        const [rows] = await pool.execute(query, [custId]);
        console.log('Result:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
