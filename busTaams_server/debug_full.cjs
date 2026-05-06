const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkData() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT)
        });

        const reqId = '0000000003';
        console.log(`\n--- TB_AUCTION_REQ (REQ_ID: ${reqId}) ---`);
        const [req] = await connection.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        console.table(req);

        console.log(`\n--- TB_AUCTION_REQ_BUS (REQ_ID: ${reqId}) ---`);
        const [bus] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [reqId]);
        console.table(bus);

        console.log(`\n--- TB_BUS_RESERVATION (REQ_ID: ${reqId}) ---`);
        const [res] = await connection.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [reqId]);
        console.table(res);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
