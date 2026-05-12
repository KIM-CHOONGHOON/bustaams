const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- Checking TB_AUCTION_REQ for REQ_ID 0000000005 ---');
        const [rows] = await pool.query('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', ['0000000005']);
        console.log('TB_AUCTION_REQ Results:', rows);

        if (rows.length > 0) {
            const travelerId = rows[0].TRAVELER_ID;
            console.log(`\n--- Checking TB_USER for TRAVELER_ID ${travelerId} ---`);
            const [userRows] = await pool.query('SELECT * FROM TB_USER WHERE USER_ID = ? OR CUST_ID = ?', [travelerId, travelerId]);
            console.log('TB_USER Results:', userRows);
        } else {
            console.log('\n--- REQ_ID 0000000005 not found in TB_AUCTION_REQ. Checking TB_BUS_RESERVATION (RES_ID) ---');
            const [resRows] = await pool.query('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', ['0000000005']);
            console.log('TB_BUS_RESERVATION Results:', resRows);
            if (resRows.length > 0) {
                const reqId = resRows[0].REQ_ID;
                console.log(`Linked REQ_ID: ${reqId}`);
                const [reqRows] = await pool.query('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
                console.log('Linked TB_AUCTION_REQ Results:', reqRows);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
