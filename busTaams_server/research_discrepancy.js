const mysql = require('mysql2/promise');
require('dotenv').config();

async function research() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [users] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as uuid, USER_NM FROM TB_USER');
        console.log('--- ALL USERS ---');
        console.table(users);

        const [busVehicle] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as userUuid, MODEL_NM, MANUFACTURE_YEAR FROM TB_BUS_DRIVER_VEHICLE');
        console.log('--- TB_BUS_DRIVER_VEHICLE ---');
        console.table(busVehicle);

        const [driverBus] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as userUuid, BUS_MODEL, MANUFACTURE_YEAR, TOTAL_SEATS FROM TB_DRIVER_BUS');
        console.log('--- TB_DRIVER_BUS ---');
        console.table(driverBus);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

research();
