/**
 * busTaams API Server
 * 2026-05-06 Merged: Clean Modular Routing + Live Chat & New Business Features
 */
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const { pool, getNextId } = require('./db');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// --- 1. 환경 설정 및 초기화 ---

// Firebase Admin SDK 초기화
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH))) {
    try {
        const serviceAccount = require(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to load Firebase Service Account Key:', e.message);
    }
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set or file does not exist.');
}

// Google Cloud Storage 설정
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

// 업로드 디렉토리 설정 (Cloud Run에서는 writable한 공간이 제한적일 수 있으나 보통 컨테이너 전체가 쓰기 가능)
const profileUploadDir = path.join(__dirname, 'uploads', 'profiles');
try {
    if (!fs.existsSync(profileUploadDir)){
        fs.mkdirSync(profileUploadDir, { recursive: true });
    }
} catch (e) {
    console.warn('⚠️ Could not create profile upload directory, falling back to OS temp.');
}

// --- 2. 미들웨어 설정 ---
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 3. 라우터 등록 ---

console.log('>>> Registering routers...');

// Helper for safe registration
function safeUse(path, modulePath) {
    try {
        app.use(path, require(modulePath));
    } catch (err) {
        console.error(`❌ Failed to register ${path}:`, err.message);
    }
}

// [V2/App Focus] - PRIORITIZE THIS
safeUse('/api/app/auth', './routes/appAuth');

// [V1/Shared]
safeUse('/api/customer', './routes/customer');
safeUse('/api/bid', './routes/bid');

// [Remaining V2]
safeUse('/api/app/customer', './routes/appCustomer');
safeUse('/api/app/auction', './routes/appAuction');
safeUse('/api/app/driver', './routes/appDriver');
safeUse('/api/app/chat', './routes/appChat');
safeUse('/api/common', './routes/common');

// [New Features - Function Export Style]
try {
    require('./routes/liveChatBusDriver')(pool, app);
    require('./routes/liveChatTraveler')(pool, app);
    require('./routes/userDeviceToken')(pool, app);
    require('./routes/travelerMyQuotationList')(pool, app);
    require('./routes/driverQuotationOpportunitiesList')(pool, app);
    require('./routes/busOperationCompletionList')(pool, app);
    require('./routes/busOperationCompletionDetails')(pool, app);
    require('./routes/auctionList')(pool, app);
    require('./routes/payment')(pool, app);
    console.log('✅ Function routers registered.');
} catch (err) {
    console.error('❌ Function Router Error:', err.message);
}

// --- 4. 서버 실행 ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', serverTime: new Date() }));

// Root path for testing
app.get('/', (req, res) => res.send('BusTaams API Server is running.'));

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 busTaams REST API Server running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`==================================================\n`);
});

module.exports = { pool };
