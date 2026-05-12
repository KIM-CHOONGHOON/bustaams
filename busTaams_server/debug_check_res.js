const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkReservation() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const targetId = '0000000005';
        console.log(`--- Checking REQ_ID: ${targetId} ---`);

        // 1. REQ_ID 존재 여부 및 소유자 확인
        const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [targetId]);
        console.log('TB_AUCTION_REQ Result:', reqRows.length > 0 ? reqRows[0] : 'NOT FOUND');

        if (reqRows.length > 0) {
            const travelerId = reqRows[0].TRAVELER_ID;
            console.log(`Owner (TRAVELER_ID): ${travelerId}`);

            // 2. 소유자 사용자 정보 확인
            const [userRows] = await pool.execute('SELECT USER_ID, USER_NM, CUST_ID FROM TB_USER WHERE CUST_ID = ? OR USER_ID = ?', [travelerId, travelerId]);
            console.log('Owner User Info:', userRows);
        }

        // 3. 관련 예약 정보 확인
        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [targetId]);
        console.log(`TB_BUS_RESERVATION Found: ${resRows.length} rows`);
        if (resRows.length > 0) {
            console.log('First Reservation Sample:', resRows[0]);
        }

        // 4. 전체 데이터 수 요약
        const [countRow] = await pool.execute('SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ');
        console.log('Total REQ Count in DB:', countRow[0].cnt);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkReservation();
