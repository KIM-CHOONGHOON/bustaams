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
        console.log("Scanning latest BUS_PHOTO entries for path validation...");
        const [rows] = await db.query(`
            SELECT 
                m.GCS_PATH, m.ORG_FILE_NM, m.FILE_EXT 
            FROM TB_FILE_MASTER m
            WHERE m.FILE_CATEGORY = 'BUS_PHOTO'
            ORDER BY m.REG_DT DESC
            LIMIT 20
        `);

        for (const row of rows) {
            const pth = row.GCS_PATH || '';
            const org = row.ORG_FILE_NM || '';
            const ext = row.FILE_EXT || '';

            // Test 1: Literal GCS_PATH
            const exists1 = await bucket.file(pth).exists().then(r => r[0]).catch(() => false);
            
            // Test 2: Combined (Dir of GCS_PATH + ORG_FILE_NM)
            const dir = pth.includes('/') ? pth.substring(0, pth.lastIndexOf('/') + 1) : '';
            const combined = `${dir}${org}${org.toLowerCase().endsWith('.' + ext.toLowerCase()) ? '' : '.' + ext}`;
            const exists2 = await bucket.file(combined).exists().then(r => r[0]).catch(() => false);

            if (exists1 || exists2) {
                console.log(`\nFile: ${org}`);
                console.log(`  - DB stored path: [${pth}] (Exists: ${exists1})`);
                console.log(`  - Logic combined path: [${combined}] (Exists: ${exists2})`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
