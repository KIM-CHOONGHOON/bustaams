const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkPaths() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_FILE_MASTER Columns ---');
        const [columns] = await connection.execute("SHOW COLUMNS FROM TB_FILE_MASTER");
        console.table(columns.map(c => c.Field));

        console.log('\n--- TB_FILE_MASTER GCS_PATH Check (Relative) ---');
        const [fileMaster] = await connection.execute(
            "SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE GCS_PATH IS NOT NULL AND GCS_PATH NOT LIKE 'http%' LIMIT 10"
        );
        console.table(fileMaster);

        console.log('\n--- TB_USER Columns ---');
        const [userCols] = await connection.execute("SHOW COLUMNS FROM TB_USER");
        console.table(userCols.map(c => c.Field));

        console.log('\n--- TB_USER Profile Check (Relative) ---');
        // Let's search for any column that might contain profile images
        const [users] = await connection.execute(
            "SELECT * FROM TB_USER LIMIT 1"
        );
        console.log("First user record (to see data):", users[0]);

        const [totalRelative] = await connection.execute(
            "SELECT COUNT(*) as count FROM TB_FILE_MASTER WHERE GCS_PATH NOT LIKE 'http%' AND GCS_PATH IS NOT NULL"
        );
        console.log(`\nTotal relative paths in TB_FILE_MASTER: ${totalRelative[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkPaths();
