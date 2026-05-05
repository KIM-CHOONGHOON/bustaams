const mysql = require('mysql2/promise');

async function testQuery() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        const resId = '0000000001';
        console.log(`Testing query for RES_ID: ${resId}`);
        const [rows] = await connection.execute(`
            SELECT 
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as viaAddr,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as date,
                rev.STAR_RATING as rating,
                rev.COMMENT_TEXT as comment,
                rev.REPLY_TEXT as reply,
                DATE_FORMAT(rev.REPLY_DT, '%Y/%m/%d') as replyDate,
                u_driver.USER_NM as driverName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage,
                dv.VEHICLE_NO as busNo,
                dv.MODEL_NM as busModel
            FROM TB_TRIP_REVIEW rev
            JOIN TB_BUS_RESERVATION b ON rev.RES_ID = b.RES_ID
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON b.BUS_ID = dv.BUS_ID
            WHERE rev.RES_ID = ?
        `, [resId]);

        console.log('Result length:', rows.length);
        if (rows.length > 0) {
            console.log('Data:', JSON.stringify(rows[0], null, 2));
        } else {
            console.log('No data found.');
        }

    } catch (err) {
        console.error('SQL Error:', err);
    } finally {
        await connection.end();
    }
}

testQuery();
