require('./loadEnv');
const mysql = require('mysql2/promise');

const rawPort = String(process.env.DB_PORT ?? '').trim();
const parsedPort = parseInt(rawPort, 10);
const dbPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3306;
const dbHost = (process.env.DB_HOST || '127.0.0.1').split('#')[0].trim();

const poolConfig = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bustaams',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+09:00'
};

if (dbHost.startsWith('/cloudsql/')) {
    // 구글 클라우드 SQL 유닉스 소켓 연결 방식
    poolConfig.socketPath = dbHost;
} else {
    // 로컬 및 일반 IP 연결 방식
    poolConfig.host = dbHost;
    poolConfig.port = dbPort;
}

const pool = mysql.createPool(poolConfig);

if (process.env.DB_LOG_CONN !== '0') {
    const dbName = process.env.DB_NAME || 'bustaams';
    console.log(`[db] ${dbHost}:${dbPort} / ${dbName} (DB_PORT from env: ${rawPort || '—'} → used ${dbPort})`);
}

// 모든 연결 세션에 타임존을 한국 시간(+09:00)으로 설정
pool.on('connection', (connection) => {
    connection.query('SET time_zone = "+09:00"');
});

module.exports = pool;
