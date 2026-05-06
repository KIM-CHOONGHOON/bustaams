/**
 * busTaams API Server
 * 2026-05-06 Merged: Clean Modular Routing + Live Chat & New Business Features
 */

const express = require('express');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const { pool, getNextId } = require('./db');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// --- 1. 환경 설정 및 초기화 ---

// Firebase Admin SDK 초기화
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH))) {
    try {
        const serviceAccount = require(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to load Firebase Service Account Key:', e.message);
        try { admin.initializeApp(); } catch(err) {} 
    }
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set or file does not exist. Real SMS verification will be bypassed in dev.');
    try { admin.initializeApp(); } catch(e) {}
}

// Google Cloud Storage 설정
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

// 업로드 디렉토리 설정
const profileUploadDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(profileUploadDir)){
    fs.mkdirSync(profileUploadDir, { recursive: true });
}

// Multer 설정
const upload = multer({ 
    dest: profileUploadDir,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// --- 2. 유틸리티 함수 ---

function generateNextNumericId(maxId, length) {
    const numPart = maxId ? parseInt(maxId, 10) : 0;
    return (numPart + 1).toString().padStart(length, '0');
}

async function sendAlimTalkAndLog({ reqId, receiverId, receiverPhone, content, category }) {
    let connection;
    try {
        console.log(`[ALIMTALK SENDING] To: ${receiverPhone}, Category: ${category}`);
        connection = await pool.getConnection();
        const [[{ maxLogId }]] = await connection.execute("SELECT MAX(LOG_ID) AS maxLogId FROM TB_SMS_LOG WHERE LOG_ID REGEXP '^[0-9]+$'");
        const logId = generateNextNumericId(maxLogId || '0', 16);
        const query = `
            INSERT INTO TB_SMS_LOG (
                LOG_ID, REQ_ID, RECEIVER_ID, RECEIVER_PHONE, 
                MSG_CONTENT, MSG_TYPE, SEND_STAT, SEND_CATEGORY, REG_DT
            ) VALUES (?, ?, ?, ?, ?, 'ALIMTALK', 'SUCCESS', ?, NOW())
        `;
        await connection.execute(query, [logId, reqId || null, receiverId, receiverPhone, content, category]);
    } catch (err) {
        console.error('AlimTalk Log Error:', err);
    } finally {
        if (connection) connection.release();
    }
}

// --- 3. 미들웨어 설정 ---

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 4. 라우터 등록 ---

// [V1/Shared]
app.use('/api/customer', require('./routes/customer'));
app.use('/api/bid', require('./routes/bid'));

// [V2/App Focus]
app.use('/api/app/auth', require('./routes/appAuth'));
app.use('/api/app/customer', require('./routes/appCustomer'));
app.use('/api/app/auction', require('./routes/appAuction'));
app.use('/api/app/driver', require('./routes/appDriver'));
app.use('/api/app/chat', require('./routes/appChat'));

// [New Features - Function Export Style]
require('./routes/liveChatBusDriver')(pool, app);
require('./routes/liveChatTraveler')(pool, app);
require('./routes/userDeviceToken')(pool, app);
require('./routes/travelerMyQuotationList')(pool, app);
require('./routes/driverQuotationOpportunitiesList')(pool, app);
require('./routes/busOperationCompletionList')(pool, app);
require('./routes/busOperationCompletionDetails')(pool, app);
require('./routes/auctionList')(pool, app);

// --- 5. 서버 실행 ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', serverTime: new Date() }));

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 busTaams REST API Server running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`==================================================\n`);
});

module.exports = { pool, sendAlimTalkAndLog };
