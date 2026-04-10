const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTestData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const driverUuid = '268f814f-da74-4890-9bb9-53677a194df2';
        await pool.execute("UPDATE TB_DRIVER_BUS SET BUS_TYPE_CD = 'NORMAL_45' WHERE USER_UUID = UUID_TO_BIN(?)", [driverUuid]);
        console.log('Update success');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

updateTestData();
