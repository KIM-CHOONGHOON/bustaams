const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertTestBus() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const driverUuid = '268f814f-da74-4890-9bb9-53677a194df2';
        await pool.execute(`
            INSERT INTO TB_DRIVER_BUS (
                BUS_UUID, USER_UUID, BUS_NO, BUS_MODEL, MANUFACTURE_YEAR, 
                TOTAL_SEATS, HAS_REFRIGERATOR, HAS_WIFI, HAS_USB_PORT, HAS_MONITOR
            ) VALUES (
                UUID_TO_BIN(UUID()), UUID_TO_BIN(?), '서울12가3456', '현대 뉴 프리미엄 유니버스', 2022, 
                45, 'Y', 'Y', 'Y', 'Y'
            )
        `, [driverUuid]);
        console.log('Test bus records inserted for driver:', driverUuid);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

insertTestBus();
