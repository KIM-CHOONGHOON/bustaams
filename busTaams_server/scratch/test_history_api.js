const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const userUuid = 'e524bb65-0cea-4be7-8a1d-5b629373033d';
    console.log('Testing History API with userUuid:', userUuid);

    const query = `
        SELECT 
            BIN_TO_UUID(r.REQ_UUID) as REQ_UUID_STR, 
            BIN_TO_UUID(ab.REQ_BUS_UUID) as REQ_BUS_UUID_STR,
            r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, 
            r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT,
            ab.BUS_TYPE_CD,
            ab.REQ_AMT as UNIT_REQ_AMT
        FROM TB_AUCTION_REQ r
        INNER JOIN TB_AUCTION_REQ_BUS ab ON r.REQ_UUID = ab.REQ_UUID
        WHERE r.TRAVELER_UUID = UUID_TO_BIN(?)
        ORDER BY r.REG_DT DESC
    `;

    try {
        const [rows] = await pool.execute(query, [userUuid]);
        console.log('Result Count:', rows.length);
        console.log('First Row Sample:', rows[0]);
    } catch (err) {
        console.error('Query Error:', err);
    }

    await pool.end();
})();
