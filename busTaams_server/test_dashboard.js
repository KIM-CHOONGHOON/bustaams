
const { pool } = require('./db');

async function testDashboard() {
    const userId = 'oasis'; // Example user
    try {
        console.log('--- Step 1: User Info ---');
        const [uRows] = await pool.execute(`
            SELECT u.CUST_ID, u.USER_NM, 
                   CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as USER_IMAGE 
            FROM TB_USER u 
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
            WHERE u.USER_ID = ?
        `, [userId]);
        console.log('User rows:', uRows);
        
        if (uRows.length === 0) {
            console.log('User not found');
            return;
        }
        const user = uRows[0];
        const custId = user.CUST_ID;
        
        console.log('--- Step 2: Stats ---');
        const [statsRows] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT CASE 
                    WHEN r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') 
                    AND NOT EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    AND NOT EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    THEN r.REQ_ID END) as countProgressing,
                COUNT(DISTINCT CASE 
                    WHEN r.DATA_STAT = 'BIDDING' 
                    OR (r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND (
                        EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                        OR EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    ))
                    THEN r.REQ_ID END) as countWaitingApproval
            FROM TB_AUCTION_REQ r
            WHERE r.TRAVELER_ID IN (?, ?)
        `, [custId, userId]);
        console.log('Stats rows:', statsRows);
        
        console.log('--- Step 3: Restrictions ---');
        const [restrictRows] = await pool.execute(`
            SELECT RESTRICT_STAT, RESTRICT_END_DT, CANCEL_CNT
            FROM TB_USER_CANCEL_MANAGE
            WHERE CUST_ID = ?
        `, [custId]);
        console.log('Restrict rows:', restrictRows);
        
    } catch (err) {
        console.error('Error during testDashboard:', err);
    } finally {
        process.exit();
    }
}

testDashboard();
