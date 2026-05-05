const mysql = require('mysql2/promise');

async function checkData() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        console.log('Checking TB_TRIP_REVIEW for RES_ID = 0000000001');
        const [rows] = await connection.execute('SELECT * FROM TB_TRIP_REVIEW WHERE RES_ID = "0000000001"');
        console.log('Results:', JSON.stringify(rows, null, 2));
        
        console.log('Checking all reviews:');
        const [allRows] = await connection.execute('SELECT * FROM TB_TRIP_REVIEW LIMIT 5');
        console.log('All Results:', JSON.stringify(allRows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
