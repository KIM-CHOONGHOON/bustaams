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
        const busId = 'f8f0fea4-ce17-42ad-9a41-d6a55883a7a9';
        const [rows] = await db.query(`
            SELECT 
                m.GCS_PATH, m.ORG_FILE_NM, m.FILE_EXT 
            FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h 
            JOIN TB_FILE_MASTER m ON m.FILE_UUID = h.FILE_UUID 
            WHERE h.BUS_ID = UUID_TO_BIN(?)
        `, [busId]);

        for (const row of rows) {
            console.log(`\nAnalyzing: ${row.ORG_FILE_NM}`);
            
            // Method 1: Stored GCS_PATH
            const p1 = row.GCS_PATH;
            const e1 = await bucket.file(p1).exists().then(r => r[0]).catch(() => false);
            console.log(`  1. Literal GCS_PATH: [${p1}] -> ${e1}`);

            // Method 2: Literal Concat (GCS_PATH + ORG_FILE_NM + FILE_EXT?)
            // Note: ORG_FILE_NM often already contains the extension.
            const p2 = `${row.GCS_PATH}${row.ORG_FILE_NM}.${row.FILE_EXT}`;
            const e2 = await bucket.file(p2).exists().then(r => r[0]).catch(() => false);
            console.log(`  2. Concat (Path+Org+.+Ext): [${p2}] -> ${e2}`);

            // Method 3: Concat without dot (Maybe ORG_FILE_NM has it)
            const p3 = `${row.GCS_PATH}${row.ORG_FILE_NM}`;
            const e3 = await bucket.file(p3).exists().then(r => r[0]).catch(() => false);
            console.log(`  3. Concat (Path+Org): [${p3}] -> ${e3}`);

            // Method 4: Dir of Path + Org
            const dir = row.GCS_PATH.includes('/') ? row.GCS_PATH.substring(0, row.GCS_PATH.lastIndexOf('/') + 1) : '';
            const p4 = `${dir}${row.ORG_FILE_NM}`;
            const e4 = await bucket.file(p4).exists().then(r => r[0]).catch(() => false);
            console.log(`  4. Dir of Path + Org: [${p4}] -> ${e4}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
