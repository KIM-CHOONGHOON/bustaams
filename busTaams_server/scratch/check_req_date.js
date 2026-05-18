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
        const [rows] = await connection.execute("SELECT REQ_ID, TRIP_TITLE, START_DT FROM TB_AUCTION_REQ ORDER BY REQ_ID DESC LIMIT 3");
        console.log('Recent Requests:', rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
