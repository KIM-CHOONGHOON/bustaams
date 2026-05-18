const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3307
        });
        
        const query = `
                SELECT r.REQ_ID, ab.REQ_BUS_SEQ, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.TRAVELER_ID,
                       r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT, ab.BUS_TYPE_CD,
                       ab.RES_BUS_AMT as UNIT_REQ_AMT, ab.DATA_STAT as BUS_STAT,
                       (SELECT res.DATA_STAT FROM TB_BUS_RESERVATION res WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) AND res.DATA_STAT IN ('AUCTION', 'BIDDING') ORDER BY res.REG_DT DESC LIMIT 1) as RES_STAT,
                       (SELECT res.RES_ID FROM TB_BUS_RESERVATION res WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) AND res.DATA_STAT IN ('AUCTION', 'BIDDING') LIMIT 1) as RES_ID,
                       (SELECT u.USER_NM FROM TB_BUS_RESERVATION res LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) AND res.DATA_STAT IN ('AUCTION', 'BIDDING') LIMIT 1) as DRIVER_NM,
                       (SELECT u.PROFILE_FILE_ID FROM TB_BUS_RESERVATION res LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) AND res.DATA_STAT IN ('AUCTION', 'BIDDING') LIMIT 1) as PROFILE_PHOTO_ID,
                       (SELECT res.DRIVER_ID FROM TB_BUS_RESERVATION res WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) AND res.DATA_STAT IN ('AUCTION', 'BIDDING') LIMIT 1) as DRIVER_ID
                FROM TB_AUCTION_REQ r
                INNER JOIN TB_AUCTION_REQ_BUS ab ON r.REQ_ID = ab.REQ_ID
                WHERE r.TRAVELER_ID = ? AND r.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE') AND ab.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL', 'BUS_CANCEL')
                ORDER BY r.REG_DT DESC, ab.REQ_BUS_SEQ ASC
            `;
        const [rows] = await connection.execute(query, ['0000000003']);
        console.log('Query success! Rows:', rows.length);
    } catch (e) {
        console.error('SQL Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
