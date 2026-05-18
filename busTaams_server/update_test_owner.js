const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function updateOwner() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1', port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master', password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const reqId = '0000000005';
        const newOwner = '0000000001'; // 'oasis' (김도훈)

        console.log(`--- Updating Owner of REQ_ID: ${reqId} to ${newOwner} ---`);
        
        // 1. TB_AUCTION_REQ 업데이트
        const [res1] = await connection.execute('UPDATE TB_AUCTION_REQ SET TRAVELER_ID = ? WHERE REQ_ID = ?', [newOwner, reqId]);
        console.log('TB_AUCTION_REQ update result:', res1.affectedRows, 'row(s) affected');

        // 2. TB_BUS_RESERVATION 업데이트 (상세 정보 조회를 위해 필요할 수 있음)
        const [res2] = await connection.execute('UPDATE TB_BUS_RESERVATION SET TRAVELER_ID = ? WHERE REQ_ID = ?', [newOwner, reqId]);
        console.log('TB_BUS_RESERVATION update result:', res2.affectedRows, 'row(s) affected');

        console.log('Update complete! Now try refreshing the detail page in the app.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateOwner();
