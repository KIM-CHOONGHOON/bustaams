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
        console.log("--- TB_BUS_DRIVER_VEHICLE ---");
        const [rows] = await db.query("DESCRIBE TB_BUS_DRIVER_VEHICLE");
        console.log(rows);
        
        console.log("\n--- TB_BUS_DRIVER_VEHICLE_FILE_HIST ---");
        const [rows2] = await db.query("DESCRIBE TB_BUS_DRIVER_VEHICLE_FILE_HIST");
        console.log(rows2);

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
