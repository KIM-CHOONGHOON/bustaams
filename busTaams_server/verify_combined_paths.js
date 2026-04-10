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
        console.log("Checking recently registered vehicle photos...");
        const [rows] = await db.query(`
            SELECT 
                m.GCS_BUCKET_NM, 
                m.GCS_PATH,
                m.ORG_FILE_NM,
                m.FILE_EXT
            FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h
            JOIN TB_FILE_MASTER m ON m.FILE_UUID = h.FILE_UUID
            ORDER BY h.REG_DT DESC 
            LIMIT 5
        `);

        rows.forEach((p, i) => {
            console.log(`\nRow ${i + 1}:`);
            console.log(`  GCS_PATH: ${p.GCS_PATH}`);
            console.log(`  ORG_FILE_NM: ${p.ORG_FILE_NM}`);
            
            let pth = p.GCS_PATH || '';
            if (pth && p.ORG_FILE_NM && !pth.includes(p.ORG_FILE_NM)) {
                pth = pth.endsWith('/') ? `${pth}${p.ORG_FILE_NM}` : `${pth}/${p.ORG_FILE_NM}`;
                console.log(`  -> Combined needed: YES`);
            } else {
                console.log(`  -> Combined needed: NO (Path already contains file)`);
            }
            
            pth = pth.replace(/^\//, '');
            const encodedPath = pth.split('/').map(seg => encodeURIComponent(seg)).join('/');
            const url = `https://storage.googleapis.com/${p.GCS_BUCKET_NM}/${encodedPath}`;
            console.log(`  Final URL: ${url}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
