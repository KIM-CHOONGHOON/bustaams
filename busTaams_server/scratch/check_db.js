const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- TB_AUCTION_REQ ---');
        const [reqs] = await pool.execute("SELECT REQ_ID, TRIP_TITLE, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID IN ('0000000001', '0000000003')");
        console.table(reqs);

        console.log('\n--- TB_BUS_RESERVATION ---');
        const [bids] = await pool.execute("SELECT RES_ID, REQ_ID, DRIVER_ID, BUS_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID IN ('0000000001', '0000000003')");
        console.table(bids);

        if (bids.length > 0) {
            const driverIds = bids.map(b => b.DRIVER_ID).filter(Boolean);
            const busIds = bids.map(b => b.BUS_ID).filter(Boolean);

            if (driverIds.length > 0) {
                console.log('\n--- TB_USER (Drivers) ---');
                const [drivers] = await pool.execute(`SELECT CUST_ID, USER_NM, USER_ID FROM TB_USER WHERE CUST_ID IN (${driverIds.map(() => '?').join(',')})`, driverIds);
                console.table(drivers);
            }

            if (busIds.length > 0) {
                console.log('\n--- TB_BUS_DRIVER_VEHICLE ---');
                const [vehicles] = await pool.execute(`SELECT BUS_ID, MODEL_NM, VEHICLE_NO FROM TB_BUS_DRIVER_VEHICLE WHERE BUS_ID IN (${busIds.map(() => '?').join(',')})`, busIds);
                console.table(vehicles);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDb();
