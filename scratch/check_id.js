const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// .env 파일 경로 설정 (서버 디렉토리의 .env 파일 사용)
dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkReservation() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const id = '0000000005';
        console.log(`Checking for ID: ${id}`);

        const [auctionReq] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        console.log('TB_AUCTION_REQ:', auctionReq);

        const [busRes] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ? OR REQ_ID = ?', [id, id]);
        console.log('TB_BUS_RESERVATION:', busRes);

        const [allReqs] = await pool.execute('SELECT REQ_ID, TRIP_TITLE FROM TB_AUCTION_REQ LIMIT 10');
        console.log('Recent REQ_IDs:', allReqs);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkReservation();
