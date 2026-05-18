const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    let connection;
    try {
        const dbHost = (process.env.DB_HOST || '127.0.0.1').split('#')[0].trim();
        const rawPort = String(process.env.DB_PORT ?? '').trim();
        const parsedPort = parseInt(rawPort, 10);
        const dbPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3306;

        const poolConfig = {
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bustaams',
        };

        if (dbHost.startsWith('/cloudsql/')) {
            poolConfig.socketPath = dbHost;
        } else {
            poolConfig.host = dbHost;
            poolConfig.port = dbPort;
        }

        connection = await mysql.createConnection(poolConfig);
        
        // REQ_BUS_SEQ가 0으로 잘못 들어간 예약들을 1로 강제 수정 (복구)
        const [result] = await connection.execute('UPDATE TB_BUS_RESERVATION SET REQ_BUS_SEQ = 1 WHERE REQ_BUS_SEQ = 0');
        console.log(`복구 완료! 잘못된 데이터 ${result.affectedRows}건을 수정했습니다.`);

    } catch (e) {
        console.error('SQL Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
})();
