const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
require('dotenv').config();
const path = require('path');

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
        const busId = 'f8f0fea4-ce17-42ad-9a41-d6a55883a7a9';
        const [rows] = await db.query('SELECT m.GCS_PATH, m.ORG_FILE_NM, m.FILE_EXT FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h JOIN TB_FILE_MASTER m ON m.FILE_UUID = h.FILE_UUID WHERE h.BUS_ID = UUID_TO_BIN(?)', [busId]);

        for (const row of rows) {
            console.log(`\nTesting for: ${row.ORG_FILE_NM}`);
            
            // Test A: UUID-based (Stored in GCS_PATH)
            const existsA = await bucket.file(row.GCS_PATH).exists().then(r => r[0]).catch(() => false);
            console.log(`  - GCS_PATH (Stored): ${row.GCS_PATH} -> ${existsA}`);

            // Test B: Combined (Dirname of GCS_PATH + ORG_FILE_NM)
            const dir = row.GCS_PATH.includes('/') ? row.GCS_PATH.substring(0, row.GCS_PATH.lastIndexOf('/')) : '';
            const combinedPath = dir ? `${dir}/${row.ORG_FILE_NM}` : row.ORG_FILE_NM;
            const existsB = await bucket.file(combinedPath).exists().then(r => r[0]).catch(() => false);
            console.log(`  - Combined (Dir+Org): ${combinedPath} -> ${existsB}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
