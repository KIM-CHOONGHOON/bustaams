const mysql = require('mysql2/promise');
async function check() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'bustaams',
        port: 3307
    });
    try {
        const [rows] = await conn.execute('SELECT HEX(REQ_UUID) as reqUuid, BID_STAT, COUNT(*) as count FROM TB_BID GROUP BY REQ_UUID, BID_STAT');
        console.log('Bid Stats Summary:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}
check();
