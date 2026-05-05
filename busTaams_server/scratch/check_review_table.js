const mysql = require('mysql2/promise');

async function checkTable() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        const [rows] = await connection.execute('DESCRIBE TB_TRIP_REVIEW');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkTable();
