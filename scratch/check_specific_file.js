const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkSpecificFile() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_FILE_MASTER for FILE_ID 00000000000000000020 ---');
        const [file] = await connection.execute(
            "SELECT * FROM TB_FILE_MASTER WHERE FILE_ID = '00000000000000000020'"
        );
        console.table(file);

        console.log('\n--- Checking for ANY relative paths in TB_FILE_MASTER again ---');
        const [allFiles] = await connection.execute(
            "SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE GCS_PATH IS NOT NULL AND GCS_PATH NOT LIKE 'http%'"
        );
        console.table(allFiles);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSpecificFile();
