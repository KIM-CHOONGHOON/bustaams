const mysql = require('mysql2/promise');
require('dotenv').config();

async function listTables() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams',
        port: 3307
    });

    try {
        const [rows] = await connection.execute("SHOW TABLES");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

listTables();
