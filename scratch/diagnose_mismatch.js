
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
};

async function checkData() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- TB_AUCTION_REQ_BUS ---');
        const [reqBus] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ, DATA_STAT FROM TB_AUCTION_REQ_BUS LIMIT 10');
        console.table(reqBus);

        console.log('\n--- TB_BUS_RESERVATION ---');
        const [res] = await connection.execute('SELECT RES_ID, REQ_ID, REQ_BUS_SEQ, DATA_STAT FROM TB_BUS_RESERVATION LIMIT 10');
        console.table(res);

        console.log('\n--- Mismatched Rows (Joining on REQ_ID only) ---');
        const [mismatched] = await connection.execute(`
            SELECT 
                rb.REQ_ID, 
                rb.REQ_BUS_SEQ as RB_SEQ, 
                res.REQ_BUS_SEQ as RES_SEQ,
                res.RES_ID
            FROM TB_AUCTION_REQ_BUS rb
            JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID
            WHERE rb.REQ_BUS_SEQ != res.REQ_BUS_SEQ
        `);
        console.table(mismatched);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
