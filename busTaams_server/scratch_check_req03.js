const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'busTaams'
    });

    try {
        console.log('--- TB_AUCTION_REQ_BUS ---');
        const [busRows] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', ['0000000003']);
        console.table(busRows);

        console.log('--- TB_AUCTION_RES (Estimates) ---');
        const [resRows] = await connection.execute('SELECT * FROM TB_AUCTION_RES WHERE REQ_ID = ?', ['0000000003']);
        console.table(resRows);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
