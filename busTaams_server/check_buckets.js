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
        const [rows] = await db.query("SELECT DISTINCT GCS_BUCKET_NM FROM TB_FILE_MASTER");
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
