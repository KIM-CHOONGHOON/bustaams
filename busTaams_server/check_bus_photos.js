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
        console.log("Checking BUS_PHOTO entries...");
        const [rows] = await db.query(`
            SELECT 
                GCS_PATH, ORG_FILE_NM, FILE_EXT 
            FROM TB_FILE_MASTER 
            WHERE FILE_CATEGORY = 'BUS_PHOTO' 
            ORDER BY REG_DT DESC 
            LIMIT 5
        `);
        console.log(JSON.stringify(rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
