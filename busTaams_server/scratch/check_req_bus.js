const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });
        const [rows] = await connection.execute("SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = '0000000004'");
        console.log('TB_AUCTION_REQ_BUS rows:', rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
