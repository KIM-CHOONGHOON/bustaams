const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || process.env.DB_DATABASE,
        enableCleartextPlugin: true
    });

    try {
        console.log('--- TB_AUCTION_REQ_BUS Schema ---');
        const [busCols] = await pool.execute('DESCRIBE TB_AUCTION_REQ_BUS');
        console.table(busCols);

        console.log('--- TB_BUS_RESERVATION Schema ---');
        const [resCols] = await pool.execute('DESCRIBE TB_BUS_RESERVATION');
        console.table(resCols);

        // Check if there are ANY records with SEQ = 0 in any table
        const [any0] = await pool.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_AUCTION_REQ_BUS WHERE REQ_BUS_SEQ = 0');
        console.log('Records with SEQ=0 in TB_AUCTION_REQ_BUS:', any0);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
