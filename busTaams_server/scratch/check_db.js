const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
        const [rows] = await connection.execute('SELECT * FROM TB_BUS_RESERVATION LIMIT 5');
        console.log('Sample TB_BUS_RESERVATION rows:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Check Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
