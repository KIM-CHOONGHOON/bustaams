const pool = require('./db');

async function debugData() {
    try {
        console.log('--- TB_BUS_DRIVER_VEHICLE 데이터 확인 ---');
        const [vehicles] = await pool.execute('SELECT SERVICE_CLASS, BIN_TO_UUID(USER_UUID) as driverUuid FROM TB_BUS_DRIVER_VEHICLE LIMIT 10');
        console.table(vehicles);

        console.log('\n--- 최근 TB_AUCTION_REQ 데이터 확인 ---');
        const [requests] = await pool.execute('SELECT BIN_TO_UUID(REQ_UUID) as reqUuid, TRIP_TITLE, REG_DT FROM TB_AUCTION_REQ ORDER BY REG_DT DESC LIMIT 3');
        console.table(requests);

        if (requests.length > 0) {
            console.log('\n--- 최근 요청된 차종 확인 ---');
            const [reqBuses] = await pool.execute('SELECT BUS_TYPE_CD, REQ_BUS_CNT FROM TB_AUCTION_REQ_BUS WHERE REQ_UUID = UUID_TO_BIN(?)', [requests[0].reqUuid]);
            console.table(reqBuses);
        }

        console.log('\n--- TB_SMS_LOG 최근 데이터 확인 ---');
        const [logs] = await pool.execute('SELECT BIN_TO_UUID(LOG_UUID) as logUuid, RECEIVER_PHONE, MSG_CONTENT, SEND_STAT, REG_DT FROM TB_SMS_LOG ORDER BY REG_DT DESC LIMIT 5');
        console.table(logs);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        process.exit();
    }
}

debugData();
