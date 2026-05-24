const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    port: 3307,
    user: 'master',
    password: '!QAZ2wsx2026@',
    database: 'bustaams'
};

async function check() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SHOW COLUMNS FROM TB_USER_CANCEL_HIST');
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
