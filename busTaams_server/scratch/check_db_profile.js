const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'bustaams',
        password: process.env.DB_PASSWORD || 'bustaams123!',
        database: process.env.DB_NAME || 'bustaams',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('--- TB_USER Table Structure ---');
        const [columns] = await connection.execute('DESCRIBE TB_USER');
        console.table(columns);

        console.log('\n--- Latest 5 Users ---');
        const [users] = await connection.execute('SELECT CUST_ID, USER_ID, USER_NM, PROFILE_FILE_ID, JOIN_DT FROM TB_USER ORDER BY JOIN_DT DESC LIMIT 5');
        console.table(users);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkTable();
