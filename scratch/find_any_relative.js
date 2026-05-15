const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function findAnyRelative() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Searching for relative paths in TB_FILE_MASTER...');
        const [rows] = await connection.execute(
            "SELECT FILE_ID, GCS_PATH, FILE_CATEGORY FROM TB_FILE_MASTER WHERE GCS_PATH IS NOT NULL AND GCS_PATH NOT LIKE 'http%'"
        );
        
        if (rows.length > 0) {
            console.log(`Found ${rows.length} relative paths:`);
            console.table(rows);
        } else {
            console.log('No relative paths found in TB_FILE_MASTER.');
        }

        console.log('\nSearching for relative paths in TB_USER.USER_IMAGE...');
        const [userRows] = await connection.execute(
            "SELECT CUST_ID, USER_ID, USER_IMAGE FROM TB_USER WHERE USER_IMAGE IS NOT NULL AND USER_IMAGE NOT LIKE 'http%'"
        );

        if (userRows.length > 0) {
            console.log(`Found ${userRows.length} relative paths in TB_USER:`);
            console.table(userRows);
        } else {
            console.log('No relative paths found in TB_USER.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

findAnyRelative();
