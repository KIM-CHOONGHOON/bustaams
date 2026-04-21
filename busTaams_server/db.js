const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3307,
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

/**
 * [공통] 일련번호 기반 ID 생성 (MAX+1 및 '0' 패딩)
 */
async function getNextId(tableName, idColumnName, length) {
    try {
        const query = `SELECT MAX(${idColumnName}) as maxId FROM ${tableName} WHERE ${idColumnName} REGEXP '^[0-9]+$'`;
        const [rows] = await pool.execute(query);
        let nextNum = 1;
        if (rows[0] && rows[0].maxId) {
            nextNum = parseInt(rows[0].maxId, 10) + 1;
        }
        return nextNum.toString().padStart(length, '0');
    } catch (err) {
        console.error(`GetNextId Error (${tableName}.${idColumnName}):`, err);
        // 오류 시 랜덤하게라도 반환하여 중복 최소화 (비상용)
        return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    }
}

module.exports = { pool, getNextId };
