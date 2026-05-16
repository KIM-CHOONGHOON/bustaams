const mysql = require('mysql2/promise');
require('dotenv').config({ path: './busTaams_server/.env' });

async function diagnose() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || process.env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableCleartextPlugin: true
    });

    try {
        console.log('--- Database Integrity Diagnosis ---');

        // 1. REQ_BUS_SEQ = 0 check in TB_AUCTION_REQ_BUS
        const [slots0] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_BUS_SEQ = 0');
        console.log(`TB_AUCTION_REQ_BUS with REQ_BUS_SEQ = 0: ${slots0.length} records found.`);
        if (slots0.length > 0) {
            console.table(slots0);
        }

        // 2. REQ_BUS_SEQ = 0 check in TB_BUS_RESERVATION
        const [res0] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_BUS_SEQ = 0');
        console.log(`TB_BUS_RESERVATION with REQ_BUS_SEQ = 0: ${res0.length} records found.`);
        if (res0.length > 0) {
            console.table(res0);
        }

        // 3. Mismatched records (Reservation exists but no slot)
        const [mismatch] = await pool.execute(`
            SELECT r.RES_ID, r.REQ_ID, r.REQ_BUS_SEQ, r.DATA_STAT
            FROM TB_BUS_RESERVATION r
            LEFT JOIN TB_AUCTION_REQ_BUS s ON r.REQ_ID = s.REQ_ID AND r.REQ_BUS_SEQ = s.REQ_BUS_SEQ
            WHERE s.REQ_ID IS NULL
        `);
        console.log(`Mismatched records (Reservation exists but no slot): ${mismatch.length} records found.`);
        if (mismatch.length > 0) {
            console.table(mismatch);
        }

        // 4. Slots marked as BIDDING but no reservation
        const [missingRes] = await pool.execute(`
            SELECT s.REQ_ID, s.REQ_BUS_SEQ, s.DATA_STAT
            FROM TB_AUCTION_REQ_BUS s
            LEFT JOIN TB_BUS_RESERVATION r ON s.REQ_ID = r.REQ_ID AND s.REQ_BUS_SEQ = r.REQ_BUS_SEQ
            WHERE s.DATA_STAT = 'BIDDING' AND r.RES_ID IS NULL
        `);
        console.log(`Slots marked as BIDDING but no reservation: ${missingRes.length} records found.`);
        if (missingRes.length > 0) {
            console.table(missingRes);
        }

    } catch (err) {
        console.error('Diagnosis Error:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
