
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function fixData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3307,
    });
    try {
        console.log('Fixing REQ_BUS_SEQ in TB_BUS_RESERVATION...');
        
        // Update REQ_BUS_SEQ = 1 for REQ_ID = '0000000002' where it is currently 0
        const [result] = await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET REQ_BUS_SEQ = 1 
            WHERE REQ_ID = '0000000002' AND REQ_BUS_SEQ = 0
        `);
        
        console.log(`Rows affected: ${result.affectedRows}`);

        // Also ensure TB_AUCTION_REQ_BUS is in BIDDING state if it wasn't
        const [result2] = await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS 
            SET DATA_STAT = 'BIDDING' 
            WHERE REQ_ID = '0000000002' AND REQ_BUS_SEQ = 1
        `);
        console.log(`REQ_BUS status updated: ${result2.affectedRows}`);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

fixData();
