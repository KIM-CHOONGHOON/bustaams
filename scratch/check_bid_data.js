const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'busTaams_server/.env' });

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_BUS_RESERVATION for REQ_ID or RES_ID 0000000003 ---');
        const [rows] = await connection.execute(
            'SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ? OR RES_ID = ?',
            ['0000000003', '0000000003']
        );
        console.log(JSON.stringify(rows, null, 2));

        if (rows.length > 0) {
            const reqId = rows[0].REQ_ID;
            console.log(`\n--- TB_AUCTION_REQ for REQ_ID ${reqId} ---`);
            const [reqRows] = await connection.execute(
                'SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?',
                [reqId]
            );
            console.log(JSON.stringify(reqRows, null, 2));

            console.log(`\n--- TB_AUCTION_REQ_BUS for REQ_ID ${reqId} ---`);
            const [busRows] = await connection.execute(
                'SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
                [reqId]
            );
            console.log(JSON.stringify(busRows, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
