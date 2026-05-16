const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'busTaams_server/.env' });

async function simulateApi() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute(`
        SELECT 
            b.RES_ID as id,
            r.REQ_ID,
            r.TRIP_TITLE as title,
            r.START_ADDR as startAddrMaster,
            r.END_ADDR as endAddrMaster,
            (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_NODE' LIMIT 1) as startAddrVia,
            (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
            DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
            DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
            b.DRIVER_BIDDING_PRICE as price,
            b.DATA_STAT,
            rb.RES_BUS_AMT as targetPrice,
            COALESCE(cm.CODE_NM, rb.BUS_TYPE_CD, '차종 미정') as busTypeNm,
            db.MODEL_NM as model,
            db.VEHICLE_NO as busNumber,
            u.USER_NM as customerName,
            (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
            (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
            (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia
        FROM TB_BUS_RESERVATION b
        JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
        LEFT JOIN TB_AUCTION_REQ_BUS rb ON b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ
        LEFT JOIN TB_CODE_MASTER cm ON cm.CODE_GRP_ID = 'BUS_TYPE' AND cm.CODE_ID = rb.BUS_TYPE_CD
        LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
        LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
        WHERE (b.RES_ID = '0000000003' OR b.REQ_ID = '0000000003') AND b.DRIVER_ID = '0000000002'
        ORDER BY b.REG_DT DESC
        LIMIT 1
    `);

    console.log('---DATA_START---');
    console.log(JSON.stringify(rows[0], null, 2));
    console.log('---DATA_END---');
    await connection.end();
}

simulateApi();
