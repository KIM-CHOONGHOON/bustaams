const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const [rows] = await connection.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000005']);
        console.log('--- REQ INFO ---');
        console.log(JSON.stringify(rows[0], null, 2));

        const [viaRows] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ?', ['0000000005']);
        console.log('--- VIA INFO ---');
        console.log(JSON.stringify(viaRows, null, 2));
    } finally {
        await connection.end();
    }
}

check();
