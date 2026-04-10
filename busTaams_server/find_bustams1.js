const mysql = require('mysql2/promise');
require('dotenv').config();
const { decrypt } = require('./crypto');

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log("Fetching all users to find bustams1...");
        const [rows] = await db.query("SELECT BIN_TO_UUID(USER_UUID) as uuid, USER_ID_ENC FROM TB_USER");
        
        let found = null;
        for (const row of rows) {
            try {
                const decryptedId = decrypt(row.USER_ID_ENC);
                if (decryptedId === 'bustams1') {
                    found = row;
                    found.decryptedId = decryptedId;
                    break;
                }
            } catch (e) {
                // Not encrypted or wrong key
            }
        }

        if (found) {
            console.log('User found:', found);
            const userUuid = found.uuid;

            console.log(`\nChecking Bus for Driver [${userUuid}]:`);
            const [buses] = await db.query("SELECT BIN_TO_UUID(BUS_ID) as busId, VEHICLE_NO, MODEL_NM, VEHICLE_PHOTOS_JSON FROM TB_BUS_DRIVER_VEHICLE WHERE USER_UUID = UUID_TO_BIN(?)", [userUuid]);
            console.log('Bus info:', JSON.stringify(buses, null, 2));

            if (buses.length > 0) {
                 const [reservations] = await db.query("SELECT BIN_TO_UUID(RES_UUID) as resUuid, BIN_TO_UUID(BUS_UUID) as reservedBusUuid, BIN_TO_UUID(DRIVER_UUID) as driverUuid FROM TB_BUS_RESERVATION WHERE DRIVER_UUID = UUID_TO_BIN(?)", [userUuid]);
                 console.log('\nLatest Reservations for this driver:', JSON.stringify(reservations, null, 2));
            }
        } else {
            console.log("Driver 'bustams1' not found among decrypted users.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
