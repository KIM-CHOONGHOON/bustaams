const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // 비밀번호가 비어있을 수 있으니 주의 (이전 로그 참고)
        database: 'bustaams'
    });

    try {
        console.log('--- TB_AUCTION_REQ Counts ---');
        const [reqRows] = await connection.execute('SELECT REQ_STAT, COUNT(*) as count FROM TB_AUCTION_REQ GROUP BY REQ_STAT');
        console.log(reqRows);

        console.log('\n--- TB_AUCTION_REQ_BUS Samples ---');
        const [busRows] = await connection.execute('SELECT BUS_TYPE_CD, COUNT(*) as count FROM TB_AUCTION_REQ_BUS GROUP BY BUS_TYPE_CD');
        console.log(busRows);

        console.log('\n--- TB_BUS_DRIVER_VEHICLE Samples ---');
        const [driverBusRows] = await connection.execute('SELECT SERVICE_CLASS, COUNT(*) as count FROM TB_BUS_DRIVER_VEHICLE GROUP BY SERVICE_CLASS');
        console.log(driverBusRows);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

check();
