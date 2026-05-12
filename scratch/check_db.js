const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    port: 3307,
    user: 'master',
    password: '!QAZ2wsx2026@',
    database: 'bustaams'
};

async function check() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        const reqId = '0000000005';
        
        console.log(`--- Checking TB_AUCTION_REQ for REQ_ID: ${reqId} ---`);
        const [reqRows] = await connection.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        console.log(JSON.stringify(reqRows, null, 2));

        console.log(`--- Checking TB_AUCTION_REQ_VIA for REQ_ID: ${reqId} ---`);
        const [viaRows] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC', [reqId]);
        console.log(JSON.stringify(viaRows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

check();
