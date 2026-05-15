const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkDeeply() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_FILE_MASTER Sampling (All) ---');
        const [allFiles] = await connection.execute("SELECT FILE_ID, GCS_PATH, FILE_CATEGORY FROM TB_FILE_MASTER LIMIT 20");
        console.table(allFiles);

        console.log('\n--- TB_FILE_MASTER Relative Paths ---');
        const [relFiles] = await connection.execute("SELECT FILE_ID, GCS_PATH, FILE_CATEGORY FROM TB_FILE_MASTER WHERE GCS_PATH NOT LIKE 'http%'");
        console.table(relFiles);

        console.log('\n--- TB_USER USER_IMAGE Relative Paths ---');
        const [relUsers] = await connection.execute("SELECT CUST_ID, USER_ID, USER_IMAGE FROM TB_USER WHERE USER_IMAGE NOT LIKE 'http%' AND USER_IMAGE IS NOT NULL");
        console.table(relUsers);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkDeeply();
