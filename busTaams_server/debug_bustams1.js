const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log("Searching for Driver: bustams1");
        const [users] = await db.query("SELECT BIN_TO_UUID(USER_UUID) as uuid, USER_ID_ENC FROM TB_USER WHERE USER_ID_ENC LIKE '%bustams1%'");
        console.log('User found:', users);

        if (users.length > 0) {
            const userUuid = users[0].uuid;
            console.log(`\nChecking Bus for Driver [${userUuid}]:`);
            const [buses] = await db.query("SELECT BIN_TO_UUID(BUS_ID) as busId, VEHICLE_NO, MODEL_NM, VEHICLE_PHOTOS_JSON FROM TB_BUS_DRIVER_VEHICLE WHERE USER_UUID = UUID_TO_BIN(?)", [userUuid]);
            console.log('Bus info:', buses);

            if (buses.length > 0) {
                 const [reservations] = await db.query("SELECT BIN_TO_UUID(RES_UUID) as resUuid, BIN_TO_UUID(BUS_UUID) as reservedBusUuid FROM TB_BUS_RESERVATION WHERE DRIVER_UUID = UUID_TO_BIN(?)", [userUuid]);
                 console.log('\nLatest Reservations for this driver:', reservations);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
