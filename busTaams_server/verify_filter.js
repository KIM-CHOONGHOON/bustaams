const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const userUuid = '5ed2d2db-a0d5-4d46-8a90-cd3b76bc5295'; // bustams1 traveler (assuming same for test)
        console.log(`Checking Auction Requests for User [${userUuid}]:`);
        
        // 필터링 적용 전 전체 개수
        const [all] = await db.query("SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ WHERE TRAVELER_UUID = UUID_TO_BIN(?)", [userUuid]);
        console.log('Total requests (no filter):', all[0].cnt);

        // 필터링 적용 쿼리 (server.js에 적용한 로직)
        const [filtered] = await db.query(`
            SELECT 
                BIN_TO_UUID(REQ_UUID) as id, 
                REQ_STAT, 
                START_DT 
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_UUID = UUID_TO_BIN(?) 
              AND REQ_STAT = 'BIDDING'
              AND START_DT >= CURDATE()
        `, [userUuid]);

        console.log('Filtered requests count:', filtered.length);
        console.log('Filtered items snapshot:', filtered.slice(0, 3));

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
