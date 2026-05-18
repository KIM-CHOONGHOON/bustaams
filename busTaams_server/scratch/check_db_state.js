const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        const dbHost = (process.env.DB_HOST || '127.0.0.1').split('#')[0].trim();
        const rawPort = String(process.env.DB_PORT ?? '').trim();
        const parsedPort = parseInt(rawPort, 10);
        const dbPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3306;

        const poolConfig = {
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bustaams',
        };

        if (dbHost.startsWith('/cloudsql/')) {
            poolConfig.socketPath = dbHost;
        } else {
            poolConfig.host = dbHost;
            poolConfig.port = dbPort;
        }

        connection = await mysql.createConnection(poolConfig);
        
        console.log('--- TB_AUCTION_REQ (최근 3건) ---');
        const [reqs] = await connection.execute('SELECT REQ_ID, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ ORDER BY REG_DT DESC LIMIT 3');
        console.table(reqs);

        console.log('\n--- TB_AUCTION_REQ_BUS (최근 3건) ---');
        const [buses] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ, DATA_STAT FROM TB_AUCTION_REQ_BUS ORDER BY REG_DT DESC LIMIT 3');
        console.table(buses);

        console.log('\n--- TB_BUS_RESERVATION (최근 5건) ---');
        const [res] = await connection.execute('SELECT RES_ID, REQ_ID, REQ_BUS_SEQ, DRIVER_ID, DATA_STAT FROM TB_BUS_RESERVATION ORDER BY REG_DT DESC LIMIT 5');
        console.table(res);

    } catch (e) {
        console.error('SQL Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
