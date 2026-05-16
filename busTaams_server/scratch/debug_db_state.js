const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const reqId = '0000000002';
        
        console.log('--- TB_AUCTION_REQ ---');
        const [trip] = await pool.execute('SELECT REQ_ID, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        console.table(trip);

        console.log('--- TB_AUCTION_REQ_BUS ---');
        const [bus] = await pool.execute('SELECT REQ_BUS_SEQ, DATA_STAT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [reqId]);
        console.table(bus);

        console.log('--- TB_BUS_RESERVATION ---');
        const [res] = await pool.execute('SELECT RES_ID, REQ_BUS_SEQ, DATA_STAT, DRIVER_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [reqId]);
        console.table(res);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
