const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

async function checkData() {
    dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });
    
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [rows] = await pool.execute(`
            SELECT BIN_TO_UUID(REQ_UUID) as uuid, TRIP_TITLE, REQ_STAT FROM TB_AUCTION_REQ
        `);
        console.log('--- REQ Data ---');
        console.log(JSON.stringify(rows, null, 2));

        const [busRows] = await pool.execute(`
            SELECT BIN_TO_UUID(REQ_UUID) as reqUuid, BUS_TYPE_CD, REQ_AMT FROM TB_AUCTION_REQ_BUS
        `);
        console.log('--- REQ_BUS Data ---');
        console.log(JSON.stringify(busRows, null, 2));

        const [userRows] = await pool.execute(`
            SELECT BIN_TO_UUID(USER_UUID) as userUuid, USER_NM, USER_TYPE, PROFILE_IMG_PATH FROM TB_USER
        `);
        console.log('--- USER Data ---');
        console.log(JSON.stringify(userRows, null, 2));

        const [driverVehRows] = await pool.execute(`
            SELECT BIN_TO_UUID(USER_UUID) as userUuid, SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE
        `);
        console.log('--- DRIVER VEHICLE Data ---');
        console.log(JSON.stringify(driverVehRows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
