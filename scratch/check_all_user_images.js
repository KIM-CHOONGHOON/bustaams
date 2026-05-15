const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function checkAllUserImages() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_USER USER_IMAGE Check ---');
        const [users] = await connection.execute(
            "SELECT CUST_ID, USER_ID, USER_IMAGE, PROFILE_FILE_ID FROM TB_USER WHERE USER_IMAGE IS NOT NULL"
        );
        console.table(users);

        const relativeUsers = users.filter(u => u.USER_IMAGE && !u.USER_IMAGE.startsWith('http'));
        console.log('\n--- Relative User Images found ---');
        console.table(relativeUsers);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkAllUserImages();
