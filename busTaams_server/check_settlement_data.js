const { pool } = require('./db');
async function test() {
    console.log('🚀 Checking CONFIRM reservations in TB_BUS_RESERVATION...');
    try {
        const [rows] = await pool.execute(`
            SELECT 
                br.RES_ID,
                br.REQ_ID,
                br.TRAVELER_ID,
                br.DRIVER_ID,
                br.DRIVER_BIDDING_PRICE,
                br.RES_FEE_TOTAL_AMT,
                br.DATA_STAT,
                br.CONFIRM_DT,
                req.REQ_AMT,
                req.TRIP_TITLE,
                req.DATA_STAT as req_status
            FROM TB_BUS_RESERVATION br
            LEFT JOIN TB_AUCTION_REQ req ON br.REQ_ID = req.REQ_ID
            WHERE br.DATA_STAT = 'CONFIRM'
        `);
        console.log('✅ Found CONFIRM reservations:', rows.length);
        console.log('Data:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
