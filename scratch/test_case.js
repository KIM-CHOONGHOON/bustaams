
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function test() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3307,
    });
    try {
        const [rows] = await connection.execute('SELECT REQ_BUS_SEQ FROM TB_AUCTION_REQ_BUS LIMIT 1');
        console.log('Result Object Keys:', Object.keys(rows[0]));
        console.log('REQ_BUS_SEQ value:', rows[0].REQ_BUS_SEQ);
        console.log('req_bus_seq value:', rows[0].req_bus_seq);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

test();
