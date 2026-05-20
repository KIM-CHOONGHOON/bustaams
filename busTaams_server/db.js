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

const fs = require('fs');
const path = require('path');

// 모든 연결 세션에 타임존을 한국 시간(+09:00)으로 설정
pool.on('connection', (connection) => {
    connection.query('SET time_zone = "+09:00"');
});

/**
 * 테이블의 다음 가변 길이 0-패딩 숫자 ID를 생성하는 헬퍼 함수
 * @param {string} tableName 테이블 이름
 * @param {string} columnName ID 컬럼 이름
 * @param {number} length 패딩 길이
 * @param {object} [connection] 트랜잭션용 커넥션 (옵션)
 * @returns {Promise<string>} 패딩된 다음 ID
 */
async function getNextId(tableName, columnName, length, connection = null) {
    const executor = connection || pool;
    const [rows] = await executor.execute(`SELECT MAX(${columnName}) as maxVal FROM ${tableName}`);
    const maxVal = rows[0]?.maxVal || '0';
    
    // 숫자 부분 추출 후 1 증가
    const nextVal = parseInt(maxVal, 10) + 1;
    return String(nextVal).padStart(length, '0');
}

/**
 * 로컬 파일 스토리지 업로드 함수 (Cafe24 서버 저장 방식)
 * @param {object} file Multer 파일 객체
 * @param {string} folderName 저장할 하위 폴더 명 (signatures, profiles, documents, vehicles, legal)
 * @param {object} [connection] 트랜잭션용 커넥션 (옵션)
 * @returns {Promise<object>} 업로드 결과 객체 (fileId, url, ext, originalName, fileSize)
 */
async function uploadToLocal(file, folderName, connection = null) {
    if (!file) return null;
    
    // 1. FILE_ID 채번
    const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20, connection);
    const ext = path.extname(file.originalname).replace('.', '') || 'png';
    
    // 2. 폴더별 경로 지정 (예: uploads/profiles)
    const relativeFolder = path.join('uploads', folderName);
    const absoluteFolder = path.join(__dirname, relativeFolder);
    
    // 3. 디렉터리가 없으면 자동 생성
    if (!fs.existsSync(absoluteFolder)) {
        fs.mkdirSync(absoluteFolder, { recursive: true });
    }
    
    const fileName = `${fileId}.${ext}`;
    const absoluteFilePath = path.join(absoluteFolder, fileName);
    const relativeFilePath = path.join(relativeFolder, fileName).replace(/\\/g, '/'); // 윈도우 경로 구분자 변환
    
    // 4. 파일 버퍼 쓰기
    fs.writeFileSync(absoluteFilePath, file.buffer);
    
    return {
        fileId,
        url: relativeFilePath, // DB GCS_PATH 컬럼에 저장될 상대 경로
        ext,
        originalName: file.originalname,
        fileSize: file.size
    };
}

// Google Cloud Storage 설정
let storageInstance = null;
let gcsBucketInstance = null;
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';

/**
 * GCS 버킷 객체를 반환하는 헬퍼 함수 (지연 초기화 적용)
 * @returns {object|null} GCS Bucket 인스턴스 또는 null
 */
function getBucket() {
    if (!gcsBucketInstance) {
        try {
            const { Storage } = require('@google-cloud/storage');
            storageInstance = new Storage();
            gcsBucketInstance = storageInstance.bucket(bucketName);
        } catch (err) {
            console.warn('[Warning] Google Cloud Storage 초기화 실패 (로컬 스토리지 모드로 계속 진행):', err.message);
            return null;
        }
    }
    return gcsBucketInstance;
}

// 객체 형태로 pool과 모든 헬퍼 함수들을 함께 내보냅니다.
module.exports = {
    pool,
    getNextId,
    getBucket,
    bucketName,
    uploadToLocal
};
