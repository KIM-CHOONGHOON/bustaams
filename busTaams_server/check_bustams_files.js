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
        const uuids = [
            'abcf5f98-7d2d-4732-905d-33350e73b813',
            '7452f473-7e87-4172-af8f-d828e5964560',
            '43fac757-c81b-427b-b45e-718f853f1621'
        ];
        
        console.log("Checking file metadata for bustams1 photos...");
        const [rows] = await db.query(`
            SELECT BIN_TO_UUID(FILE_UUID) as uuid, ORG_FILE_NM, GCS_PATH, FILE_CATEGORY 
            FROM TB_FILE_MASTER 
            WHERE FILE_UUID IN (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))
        `, uuids);
        
        console.log(JSON.stringify(rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
