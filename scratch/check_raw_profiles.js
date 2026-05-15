const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkRawProfiles() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_FILE_MASTER (FILE_CATEGORY = "USER_PROFILE") Raw Data ---');
        const [profiles] = await connection.execute(
            "SELECT FILE_ID, GCS_PATH, ORG_FILE_NM FROM TB_FILE_MASTER WHERE FILE_CATEGORY = 'USER_PROFILE'"
        );
        console.table(profiles);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkRawProfiles();
