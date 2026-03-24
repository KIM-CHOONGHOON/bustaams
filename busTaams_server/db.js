const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bustaams',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+09:00'
});

// 모든 연결 세션에 타임존을 한국 시간(+09:00)으로 설정
pool.on('connection', (connection) => {
    connection.query('SET time_zone = "+09:00"');
});

module.exports = pool;
