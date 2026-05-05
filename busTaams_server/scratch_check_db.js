const { pool } = require('./db');

async function checkData() {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ,
                db.AMENITIES,
                db.VEHICLE_PHOTOS_JSON,
                db.BUS_ID
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON res.BUS_ID = db.BUS_ID
            WHERE rb.REQ_ID = '2026050201' -- Example REQ_ID from context or just pick one
            LIMIT 10
        `);
        console.log('Rows:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData();
