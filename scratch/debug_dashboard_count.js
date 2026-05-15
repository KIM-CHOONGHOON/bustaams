const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function debug() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [users] = await pool.execute(`
            SELECT USER_ID, CUST_ID, USER_NM FROM TB_USER 
            WHERE USER_TYPE = 'TRAVELER'
        `);

        for (const user of users) {
            const { USER_ID, CUST_ID, USER_NM } = user;
            console.log(`\n=== Checking stats for User: ${USER_NM} (ID: ${USER_ID}, CustID: ${CUST_ID}) ===`);

            const [reqs] = await pool.execute(`
                SELECT REQ_ID, DATA_STAT 
                FROM TB_AUCTION_REQ 
                WHERE TRAVELER_ID IN (?, ?)
            `, [CUST_ID, USER_ID]);

            console.log(`Found ${reqs.length} requests.`);

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
            `, [CUST_ID, USER_ID]);

            console.log('Dashboard Stats Result:', statsRows[0]);
            console.log('Types:', typeof statsRows[0].countProgressing, typeof statsRows[0].countWaitingApproval);

            for (const r of reqs) {
                const [auctionReqBus] = await pool.execute(`
                    SELECT COUNT(*) as count FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'
                `, [r.REQ_ID]);
                const [reservation] = await pool.execute(`
                    SELECT COUNT(*) as count FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'
                `, [r.REQ_ID]);

                console.log(`- REQ_ID: ${r.REQ_ID}, STAT: ${r.DATA_STAT}`);
                console.log(`  - Sub-tables BIDDING count: AuctionBus=${auctionReqBus[0].count}, Reservation=${reservation[0].count}`);
            }
        }

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await pool.end();
    }
}

debug();
