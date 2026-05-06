const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFileMaster() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'bustaams',
        password: process.env.DB_PASSWORD || 'bustaams123!',
        database: process.env.DB_NAME || 'bustaams',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('--- TB_FILE_MASTER Profile Records ---');
        const [rows] = await connection.execute("SELECT * FROM TB_FILE_MASTER WHERE FILE_CATEGORY = 'PROFILE' ORDER BY REG_DT DESC LIMIT 5");
        console.table(rows);

        console.log('\n--- Recent File Records (Any Category) ---');
        const [anyRows] = await connection.execute("SELECT FILE_ID, FILE_CATEGORY, REG_DT FROM TB_FILE_MASTER ORDER BY REG_DT DESC LIMIT 5");
        console.table(anyRows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkFileMaster();
