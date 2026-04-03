const mysql = require('mysql2/promise');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function listAllUsers() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as UUID, USER_ID, USER_NM, USER_TYPE FROM TB_USER');
        console.log(`Found ${rows.length} users:`);
        for (const row of rows) {
            try {
                const decId = decrypt(row.USER_ID);
                const decNm = decrypt(row.USER_NM);
                console.log(`- UUID: ${row.UUID}, ID: ${decId}, Name: ${decNm}, Type: ${row.USER_TYPE}`);
            } catch (e) {
                console.log(`- UUID: ${row.UUID}, ID: ${row.USER_ID} (could not decrypt), Type: ${row.USER_TYPE}`);
            }
        }
    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await pool.end();
    }
}

listAllUsers();
