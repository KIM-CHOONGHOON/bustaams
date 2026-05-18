const { pool } = require('./db.js');
async function run() {
    try {
        const [uRows] = await pool.execute('SELECT u.CUST_ID, u.USER_NM FROM TB_USER u WHERE u.USER_ID = ?', ['oasis']);
        const user = uRows[0];
        const [statsRows] = await pool.execute("SELECT COUNT(DISTINCT CASE WHEN r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND NOT EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING') AND NOT EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING') THEN r.REQ_ID END) as countProgressing, COUNT(DISTINCT CASE WHEN r.DATA_STAT = 'BIDDING' OR (r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND (EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING') OR EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING'))) THEN r.REQ_ID END) as countWaitingApproval FROM TB_AUCTION_REQ r WHERE r.TRAVELER_ID IN (?, ?)", [user.CUST_ID, 'oasis']);
        console.log('Stats:', statsRows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
