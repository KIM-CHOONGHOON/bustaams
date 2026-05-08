console.log('>>> DB INITIALIZING...');
const mysql = require('mysql2/promise');
const { Storage } = require('@google-cloud/storage');
const { randomBytes } = require('crypto');
require('dotenv').config();

const rawPort = String(process.env.DB_PORT ?? '').trim();
const parsedPort = parseInt(rawPort, 10);
const dbPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3306;
const dbHost = (process.env.DB_HOST || '127.0.0.1').split('#')[0].trim();

const dbConfig = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bustaams',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    timezone: '+09:00'
};

if (dbHost.startsWith('/')) {
    dbConfig.socketPath = dbHost;
} else {
    dbConfig.host = dbHost;
    dbConfig.port = dbPort;
}

const pool = mysql.createPool(dbConfig);

if (process.env.DB_LOG_CONN !== '0') {
    const dbName = process.env.DB_NAME || 'bustaams';
    console.log(`[db] ${dbHost}:${dbPort} / ${dbName} (DB_PORT from env: ${rawPort || '—'} → used ${dbPort})`);
}

// 모든 연결 세션에 타임존을 한국 시간(+09:00)으로 설정
pool.on('connection', (connection) => {
    connection.query('SET time_zone = "+09:00"');
});

// Google Cloud Storage 설정 (Lazy initialization)
let storageInstance;
let bucketInstance;
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';

function getBucket() {
    if (!bucketInstance) {
        const { Storage } = require('@google-cloud/storage');
        storageInstance = new Storage();
        bucketInstance = storageInstance.bucket(bucketName);
    }
    return bucketInstance;
}

/**
 * [공통] 일련번호 기반 ID 생성 (MAX+1 및 '0' 패딩)
 */
async function getNextId(tableName, idColumnName, length, connection = null) {
    try {
        // 트랜잭션 내에서 호출될 경우 중복 방지를 위해 잠금 시도 고려 가능
        const query = `SELECT MAX(${idColumnName}) as maxId FROM ${tableName} WHERE ${idColumnName} REGEXP '^[0-9]+$'`;
        const executor = connection || pool;
        const [rows] = await executor.execute(query);
        let nextNum = 1;
        if (rows[0] && rows[0].maxId) {
            nextNum = parseInt(rows[0].maxId, 10) + 1;
        }
        return nextNum.toString().padStart(length, '0');
    } catch (err) {
        console.error(`GetNextId Error (${tableName}.${idColumnName}):`, err);
        // 에러 시 랜덤 텍스트로 폴백 (길이 충족)
        return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
    }
}

module.exports = { pool, getNextId, getBucket, bucketName };
