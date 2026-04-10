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
        const busId = 'f8f0fea4-ce17-42ad-9a41-d6a55883a7a9';
        const [rows] = await db.query(`
            SELECT 
                m.GCS_BUCKET_NM, 
                m.GCS_PATH,
                m.ORG_FILE_NM,
                m.FILE_EXT
            FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h
            JOIN TB_FILE_MASTER m ON m.FILE_UUID = h.FILE_UUID
            WHERE h.BUS_ID = UUID_TO_BIN(?)
              AND m.FILE_CATEGORY = 'BUS_PHOTO'
        `, [busId]);

        console.log(`Found ${rows.length} bus photos.`);
        rows.forEach((p, i) => {
            let pth = p.GCS_PATH || '';
            const orgNm = p.ORG_FILE_NM || '';
            const ext = p.FILE_EXT || '';

            if (pth && orgNm && !pth.includes(orgNm)) {
                let base = pth.endsWith('/') ? pth : `${pth}/`;
                if (orgNm.toLowerCase().endsWith('.' + ext.toLowerCase())) {
                    pth = `${base}${orgNm}`;
                } else {
                    pth = `${base}${orgNm}.${ext}`;
                }
            }

            pth = pth.replace(/^\//, '');
            const encodedPath = pth.split('/').map(seg => encodeURIComponent(seg)).join('/');
            const url = `https://storage.googleapis.com/${p.GCS_BUCKET_NM}/${encodedPath}`;
            console.log(`[${i+1}] ${url}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
