const pool = require('../busTaams_server/db');

async function checkData() {
    try {
        const [reqRows] = await pool.execute('SELECT BIN_TO_UUID(REQ_UUID) as uuid, TRIP_TITLE, REQ_STAT FROM TB_AUCTION_REQ');
        console.log('--- REQ Data ---');
        console.log(JSON.stringify(reqRows, null, 2));
        
        const [busRows] = await pool.execute('SELECT BIN_TO_UUID(REQ_BUS_UUID) as busUuid, BIN_TO_UUID(REQ_UUID) as reqUuid, BUS_TYPE_CD, REQ_BUS_CNT FROM TB_AUCTION_REQ_BUS');
        console.log('--- REQ_BUS Data ---');
        console.log(JSON.stringify(busRows, null, 2));

        const [driverBusRows] = await pool.execute('SELECT BIN_TO_UUID(BUS_ID) as busId, BIN_TO_UUID(USER_UUID) as userUuid, MODEL_NM, SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE');
        console.log('--- DRIVER VEHICLE Data ---');
        console.log(JSON.stringify(driverBusRows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
