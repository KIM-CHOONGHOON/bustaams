const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('DESCRIBE TB_USER');
        const hasUserUuid = rows.some(r => r.Field === 'USER_UUID');
        console.log(`TB_USER has USER_UUID: ${hasUserUuid}`);
        console.log('TB_USER columns:', rows.map(r => r.Field).join(', '));

        const tablesToCheck = ['TB_BUS_RESERVATION', 'TB_AUCTION_REQ', 'TB_DRIVER_BID', 'TB_REVIEW'];
        for (const tableName of tablesToCheck) {
            try {
                const [cols] = await connection.execute(`DESCRIBE ${tableName}`);
                console.log(`${tableName} columns:`, cols.map(c => c.Field).join(', '));
            } catch (e) {
                console.log(`${tableName} does not exist.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkSchema();
