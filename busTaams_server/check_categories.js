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
        const [rows] = await db.query("SELECT DISTINCT FILE_CATEGORY FROM TB_FILE_MASTER");
        console.log('Categories:', rows);
        
        // Also check if any specific BUS_PHOTO exists
        const [rows2] = await db.query("SELECT FILE_UUID, GCS_PATH, FILE_CATEGORY FROM TB_FILE_MASTER WHERE FILE_CATEGORY LIKE '%PHOTO%' LIMIT 5");
        console.log('Sample Photos:', rows2);

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
