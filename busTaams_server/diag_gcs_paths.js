const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const storage = new Storage();
    const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
    const bucket = storage.bucket(bucketName);

    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        // Get the latest vehicle photo
        const [rows] = await db.query(`
            SELECT 
                m.GCS_PATH, m.ORG_FILE_NM, m.FILE_EXT 
            FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h
            JOIN TB_FILE_MASTER m ON m.FILE_UUID = h.FILE_UUID
            ORDER BY h.REG_DT DESC 
            LIMIT 5
        `);

        if (rows.length === 0) {
            console.log("No vehicle photos found in DB.");
            return;
        }

        for (const row of rows) {
            console.log(`\nChecking DB row:`);
            console.log(`  GCS_PATH: ${row.GCS_PATH}`);
            console.log(`  ORG_FILE_NM: ${row.ORG_FILE_NM}`);
            console.log(`  FILE_EXT: ${row.FILE_EXT}`);

            // Test 1: Literal GCS_PATH
            const file1 = bucket.file(row.GCS_PATH);
            const [exists1] = await file1.exists().catch(() => [false]);
            console.log(`  - Exists as GCS_PATH? ${exists1}`);

            // Test 2: Combined path (GCS_PATH + ORG_FILE_NM)
            // If GCS_PATH ends with /, just append. Otherwise check if it's a folder.
            let combinedPath = row.GCS_PATH.endsWith('/') ? `${row.GCS_PATH}${row.ORG_FILE_NM}` : `${row.GCS_PATH}/${row.ORG_FILE_NM}`;
            // Remove leading slash if any
            combinedPath = combinedPath.replace(/^\//, '');
            
            const file2 = bucket.file(combinedPath);
            const [exists2] = await file2.exists().catch(() => [false]);
            console.log(`  - Exists as Combined Path (${combinedPath})? ${exists2}`);
            
            // Test 3: Maybe GCS_PATH + ORG_FILE_NM without slash
             const combinedPathNoSlash = `${row.GCS_PATH}${row.ORG_FILE_NM}`;
             const file3 = bucket.file(combinedPathNoSlash.replace(/^\//, ''));
             const [exists3] = await file3.exists().catch(() => [false]);
             console.log(`  - Exists as Combined Path No Slash (${combinedPathNoSlash})? ${exists3}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
