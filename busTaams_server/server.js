const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { encrypt, decrypt } = require('./crypto');
// const { runDriverVerificationsForProfileSetup } = require('./driverVerification');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Global request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 1. Firebase Admin SDK Initialization
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
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not set or file does not exist in .env. Real SMS verification will be bypassed in development mode.');
    // To prevent total crashes, try initialize with default credentials
    try { admin.initializeApp(); } catch(e) {}
}

// 2. Google Cloud Storage Initialization
// Uses GOOGLE_APPLICATION_CREDENTIALS from environment variables automatically if present
const storage = new Storage(); 
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);

/** Firebase 서비스 계정이 있으면 true — 이 경우에만 클라이언트 Firebase ID 토큰 검증을 강제 */
function firebaseAdminConfigured() {
    return !!(process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)));
}

/**
 * 회원가입(`POST /api/auth/register`)·기사정보(`POST /api/driver/profile-setup`) 공통.
 * Admin 미설정: 검증 생략(로컬 개발). 설정됨: `verifyIdToken` 필수.
 */
async function verifyFirebasePhoneIdTokenIfRequired(idToken) {
    if (!firebaseAdminConfigured()) {
        return { ok: true };
    }
    if (!idToken || typeof idToken !== 'string') {
        return { ok: false, error: '휴대전화 인증을 완료해 주세요.' };
    }
    try {
        await admin.auth().verifyIdToken(idToken);
        return { ok: true };
    } catch (e) {
        console.error('Firebase ID token verification failed:', e.message);
        return { ok: false, error: '휴대전화 인증이 유효하지 않습니다. 다시 인증해 주세요.' };
    }
}

/** TB_DRIVER_INFO 테이블이 없으면 생성 (기사 프로필 API에서 INSERT 가능하도록) */
async function ensureDriverInfoTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_DRIVER_INFO (
            USER_UUID BINARY(16) NOT NULL,
            RRN_ENC VARCHAR(512) NOT NULL,
            LICENSE_TYPE VARCHAR(50) NULL,
            LICENSE_NO VARCHAR(100) NULL,
            LICENSE_SERIAL_NO VARCHAR(100) NULL COMMENT '면허 암호일련번호(진위검증용)',
            LICENSE_ISSUE_DT DATE NULL,
            LICENSE_EXPIRY_DT DATE NULL,
            QUAL_CERT_NO VARCHAR(100) NULL,
            QUAL_CERT_VERIFY_STATUS VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED'
                COMMENT '버스운전 자격번호 검증 상태: UNVERIFIED(미검증)/VERIFIED(검증성공)/SKIPPED(API비활성)',
            QUAL_CERT_VERIFY_DT DATETIME NULL COMMENT '자격 검증 완료 일시',
            QUAL_CERT_FILE_UUID BINARY(16) NULL,
            PROFILE_PHOTO_UUID BINARY(16) NULL,
            BIO_TEXT TEXT NULL,
            CREATE_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            UPDATE_DT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (USER_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** 기존 TB_DRIVER_INFO에 자격 검증 상태 컬럼이 없으면 추가 (마이그레이션) */
async function ensureDriverInfoQualVerifyColumns(connection) {
    const alters = [
        {
            sql: `ALTER TABLE TB_DRIVER_INFO ADD COLUMN QUAL_CERT_VERIFY_STATUS VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED'
                  COMMENT '버스운전 자격번호 검증 상태: UNVERIFIED/VERIFIED/SKIPPED'`,
            name: 'QUAL_CERT_VERIFY_STATUS'
        },
        {
            sql: `ALTER TABLE TB_DRIVER_INFO ADD COLUMN QUAL_CERT_VERIFY_DT DATETIME NULL COMMENT '자격 검증 완료 일시'`,
            name: 'QUAL_CERT_VERIFY_DT'
        }
    ];
    for (const { sql } of alters) {
        try {
            await connection.execute(sql);
        } catch (e) {
            if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') throw e;
            /* 이미 컬럼이 존재하면 무시 */
        }
    }
}

/** TB_FILE_MASTER — 프로필/자격증 파일 메타 저장용 (없으면 INSERT 실패) */
async function ensureTbFileMasterTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_FILE_MASTER (
            FILE_UUID BINARY(16) NOT NULL,
            FILE_CATEGORY VARCHAR(50) NOT NULL,
            GCS_BUCKET_NM VARCHAR(100) DEFAULT 'bustaams-secure-data',
            GCS_PATH VARCHAR(255) NOT NULL,
            ORG_FILE_NM VARCHAR(255) NULL,
            FILE_EXT VARCHAR(10) NULL,
            FILE_SIZE BIGINT NULL,
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (FILE_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** TB_DRIVER_INFO에 면허 암호일련번호 컬럼이 없으면 추가 (진위 검증 연동용) */
async function ensureDriverInfoLicenseSerialColumn(connection) {
    try {
        await connection.execute(
            `ALTER TABLE TB_DRIVER_INFO ADD COLUMN LICENSE_SERIAL_NO VARCHAR(100) NULL COMMENT '면허 암호일련번호(진위검증용)'`
        );
    } catch (e) {
        if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
}

/**
 * 회원가입·아이디 중복검사용 TB_USER — 로컬/신규 DB에 테이블이 없을 때 생성
 * (`POST /api/auth/register` INSERT 컬럼과 정합)
 */
async function ensureTbUserTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_USER (
            USER_UUID BINARY(16) NOT NULL,
            USER_ID_ENC VARCHAR(255) NOT NULL COMMENT '로그인 ID (AES 암호문)',
            PASSWORD VARCHAR(255) NOT NULL,
            USER_NM VARCHAR(255) NOT NULL,
            HP_NO VARCHAR(255) NOT NULL,
            SNS_TYPE VARCHAR(20) NOT NULL DEFAULT 'NONE',
            SMS_AUTH_YN CHAR(1) NOT NULL DEFAULT 'N',
            USER_TYPE VARCHAR(20) NOT NULL,
            JOIN_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            USER_STAT VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            PRIMARY KEY (USER_UUID),
            UNIQUE KEY UK_USER_ID (USER_ID_ENC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

function formatDateYmd(v) {
    if (v == null || v === undefined || v === '') return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 진위 검증 생략 비교용 — TB_DRIVER_INFO 기존 행 */
async function fetchDriverInfoRow(userUuid) {
    try {
        const [rows] = await pool.execute(
            `SELECT LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, LICENSE_EXPIRY_DT,
                    QUAL_CERT_NO, QUAL_CERT_VERIFY_STATUS
             FROM TB_DRIVER_INFO WHERE USER_UUID = UUID_TO_BIN(?)`,
            [userUuid]
        );
        return rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return null;
        throw e;
    }
}

/** TB_COMMON_CODE — 버스 종류 등 */
async function ensureTbCommonCodeTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_COMMON_CODE (
            GRP_CD VARCHAR(50) NOT NULL,
            DTL_CD VARCHAR(50) NOT NULL,
            CD_NM_KO VARCHAR(200) NOT NULL DEFAULT '',
            CD_DESC VARCHAR(500) NULL,
            USE_YN CHAR(1) NOT NULL DEFAULT 'Y',
            DISP_ORD INT NOT NULL DEFAULT 0,
            PRIMARY KEY (GRP_CD, DTL_CD),
            KEY IDX_COMMON_GRP_USE_ORD (GRP_CD, USE_YN, DISP_ORD)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function seedBusTypeCodesIfEmpty(connection) {
    const [rows] = await connection.execute(
        `SELECT COUNT(*) AS c FROM TB_COMMON_CODE WHERE GRP_CD = 'BUS_TYPE'`
    );
    if (rows[0].c > 0) return;
    const seeds = [
        ['BUS_TYPE', 'PREMIUM_GOLD', '프리미엄 골드', '21석 최상급 프라이빗 독립 시트', 'Y', 1],
        ['BUS_TYPE', 'PRESTIGE', '우등 버스', '28석 넓은 레그룸 전용 시트', 'Y', 2],
        ['BUS_TYPE', 'NORMAL', '일반 버스', '45석 표준 시트', 'Y', 3],
        ['BUS_TYPE', 'NIGHT_PREMIUM', '심야 우등', '야간 특화 시트', 'Y', 4],
        ['BUS_TYPE', 'V_VIP', 'V-VIP', '16석 리무진', 'Y', 5]
    ];
    for (const s of seeds) {
        await connection.execute(
            `INSERT IGNORE INTO TB_COMMON_CODE (GRP_CD, DTL_CD, CD_NM_KO, CD_DESC, USE_YN, DISP_ORD) VALUES (?, ?, ?, ?, ?, ?)`,
            s
        );
    }
}

async function ensureTbBusDriverVehicleFileHistTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_BUS_DRIVER_VEHICLE_FILE_HIST (
            HIST_UUID BINARY(16) NOT NULL PRIMARY KEY,
            BUS_ID BINARY(16) NOT NULL COMMENT 'FK TB_BUS_DRIVER_VEHICLE.BUS_ID',
            FILE_UUID BINARY(16) NOT NULL,
            FILE_CATEGORY VARCHAR(50) NOT NULL,
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY IDX_BUS_FILE (BUS_ID, FILE_UUID),
            KEY IDX_FILE_UUID (FILE_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** 기사 보유 버스 마스터 — ADAS(HAS_ADAS) 포함. 구명칭 TB_DRIVER_BUS 대체 */
async function ensureTbBusDriverVehicleSchema(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_BUS_DRIVER_VEHICLE (
            BUS_ID BINARY(16) NOT NULL PRIMARY KEY COMMENT '버스 고유 ID',
            USER_UUID BINARY(16) NOT NULL COMMENT '소유 기사 (TB_USER)',
            VEHICLE_NO VARCHAR(20) NOT NULL,
            MODEL_NM VARCHAR(100) NOT NULL,
            MANUFACTURE_YEAR VARCHAR(10),
            MILEAGE INT DEFAULT 0,
            SERVICE_CLASS VARCHAR(50) NOT NULL,
            AMENITIES JSON,
            HAS_ADAS CHAR(1) NOT NULL DEFAULT 'N' COMMENT 'ADAS Y/N',
            LAST_INSPECT_DT DATE,
            INSURANCE_EXP_DT DATE,
            BIZ_REG_FILE_UUID BINARY(16),
            TRANS_LIC_FILE_UUID BINARY(16),
            INS_CERT_FILE_UUID BINARY(16),
            VEHICLE_PHOTOS_JSON JSON NULL,
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY UK_VEHICLE_NO (VEHICLE_NO),
            KEY IDX_BUS_DRIVER_USER (USER_UUID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='기사 보유 차량·ADAS·서류 FK'
    `);
    const alters = [
        `ALTER TABLE TB_BUS_DRIVER_VEHICLE ADD COLUMN AMENITIES JSON NULL AFTER SERVICE_CLASS`,
        `ALTER TABLE TB_BUS_DRIVER_VEHICLE ADD COLUMN HAS_ADAS CHAR(1) NOT NULL DEFAULT 'N' COMMENT 'ADAS Y/N' AFTER AMENITIES`,
        `ALTER TABLE TB_BUS_DRIVER_VEHICLE ADD COLUMN VEHICLE_PHOTOS_JSON JSON NULL COMMENT '차량 사진 FILE_UUID 배열' AFTER INS_CERT_FILE_UUID`,
    ];
    for (const sql of alters) {
        try {
            await connection.execute(sql);
        } catch (e) {
            if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
    }
    await migrateLegacyTbDriverBusToBusDriverVehicle(connection);
}

/** 레거시 TB_DRIVER_BUS / TB_DRIVER_BUS_FILE_HIST 가 있으면 신규 테이블로 INSERT IGNORE 복사 */
async function migrateLegacyTbDriverBusToBusDriverVehicle(connection) {
    try {
        const [t] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_DRIVER_BUS'`
        );
        if (t.length === 0) return;
        try {
            await connection.execute(`
                INSERT IGNORE INTO TB_BUS_DRIVER_VEHICLE (
                    BUS_ID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS,
                    LAST_INSPECT_DT, INSURANCE_EXP_DT, BIZ_REG_FILE_UUID, TRANS_LIC_FILE_UUID, INS_CERT_FILE_UUID, VEHICLE_PHOTOS_JSON, REG_DT
                )
                SELECT BUS_UUID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES,
                    COALESCE(HAS_ADAS, 'N'), LAST_INSPECT_DT, INSURANCE_EXP_DT, BIZ_REG_FILE_UUID, TRANS_LIC_FILE_UUID, INS_CERT_FILE_UUID, VEHICLE_PHOTOS_JSON, REG_DT
                FROM TB_DRIVER_BUS
            `);
        } catch (e) {
            if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
                await connection.execute(`
                    INSERT IGNORE INTO TB_BUS_DRIVER_VEHICLE (
                        BUS_ID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS,
                        LAST_INSPECT_DT, INSURANCE_EXP_DT, BIZ_REG_FILE_UUID, TRANS_LIC_FILE_UUID, INS_CERT_FILE_UUID, VEHICLE_PHOTOS_JSON, REG_DT
                    )
                    SELECT BUS_UUID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, 'N',
                        LAST_INSPECT_DT, INSURANCE_EXP_DT, BIZ_REG_FILE_UUID, TRANS_LIC_FILE_UUID, INS_CERT_FILE_UUID, VEHICLE_PHOTOS_JSON, REG_DT
                    FROM TB_DRIVER_BUS
                `);
            } else {
                throw e;
            }
        }
    } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('migrateLegacy bus master:', e.message);
    }
    try {
        const [t] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_DRIVER_BUS_FILE_HIST'`
        );
        if (t.length === 0) return;
        await connection.execute(`
            INSERT IGNORE INTO TB_BUS_DRIVER_VEHICLE_FILE_HIST (HIST_UUID, BUS_ID, FILE_UUID, FILE_CATEGORY, REG_DT)
            SELECT HIST_UUID, BUS_UUID, FILE_UUID, FILE_CATEGORY, REG_DT FROM TB_DRIVER_BUS_FILE_HIST
        `);
    } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('migrateLegacy bus hist:', e.message);
    }
}

function parseDataUrlPayload(dataUrl, fileNameHint = 'file') {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) return null;
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    let ext = 'bin';
    if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    const safe = String(fileNameHint || 'file').replace(/[^a-zA-Z0-9._-가-힣]/g, '_');
    return { buffer: buf, ext, mime, orgName: safe };
}

async function insertBusFileAndHist(connection, {
    busUuidStr, fileUuidStr, category, gcsPath, buffer, orgFileNm, fileExt, fileSize, contentType
}) {
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(buffer, { metadata: { contentType: contentType || 'application/octet-stream' }, resumable: false });
    await connection.execute(
        `INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
         VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, NOW())`,
        [fileUuidStr, category, bucketName, gcsPath, orgFileNm, fileExt, fileSize]
    );
    const histUuid = randomUUID();
    await connection.execute(
        `INSERT INTO TB_BUS_DRIVER_VEHICLE_FILE_HIST (HIST_UUID, BUS_ID, FILE_UUID, FILE_CATEGORY, REG_DT)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, NOW())`,
        [histUuid, busUuidStr, fileUuidStr, category]
    );
}

async function fetchBusRowForUser(connection, userUuid) {
    const [rows] = await connection.execute(
        `SELECT BIN_TO_UUID(BUS_ID) AS busUuid, BIN_TO_UUID(USER_UUID) AS userUuid,
                VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS,
                DATE_FORMAT(LAST_INSPECT_DT, '%Y-%m-%d') AS lastInspectDt,
                DATE_FORMAT(INSURANCE_EXP_DT, '%Y-%m-%d') AS insuranceExpDt,
                BIN_TO_UUID(BIZ_REG_FILE_UUID) AS bizRegUuid,
                BIN_TO_UUID(TRANS_LIC_FILE_UUID) AS transLicUuid,
                BIN_TO_UUID(INS_CERT_FILE_UUID) AS insCertUuid,
                VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE USER_UUID = UUID_TO_BIN(?) LIMIT 1`,
        [userUuid]
    );
    return rows[0] || null;
}

async function fileMetaByUuid(connection, fileUuidStr) {
    if (!fileUuidStr) return null;
    const [rows] = await connection.execute(
        `SELECT BIN_TO_UUID(FILE_UUID) AS fileUuid, ORG_FILE_NM, FILE_EXT, FILE_SIZE
         FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
        [fileUuidStr]
    );
    return rows[0] || null;
}

/** 기사 소유 차량에 연결된 파일만 스트리밍 허용 */
/** TB_DRIVER_INFO.QUAL_CERT_FILE_UUID 소유 확인 */
async function canAccessQualCertFile(connection, userUuid, fileUuidStr) {
    const [rows] = await connection.execute(
        `SELECT 1 FROM TB_DRIVER_INFO
         WHERE USER_UUID = UUID_TO_BIN(?) AND QUAL_CERT_FILE_UUID = UUID_TO_BIN(?) LIMIT 1`,
        [userUuid, fileUuidStr]
    );
    return rows.length > 0;
}

async function canAccessBusFile(connection, userUuid, fileUuidStr) {
    const [buses] = await connection.execute(
        `SELECT BUS_ID, BIZ_REG_FILE_UUID, TRANS_LIC_FILE_UUID, INS_CERT_FILE_UUID, VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE USER_UUID = UUID_TO_BIN(?)`,
        [userUuid]
    );
    const target = Buffer.from(fileUuidStr.replace(/-/g, ''), 'hex');
    for (const b of buses) {
        const match = (buf) => buf && Buffer.compare(buf, target) === 0;
        if (match(b.BIZ_REG_FILE_UUID) || match(b.TRANS_LIC_FILE_UUID) || match(b.INS_CERT_FILE_UUID)) return true;
        let photos = b.VEHICLE_PHOTOS_JSON;
        if (typeof photos === 'string') {
            try { photos = JSON.parse(photos); } catch (e) { photos = []; }
        }
        if (Array.isArray(photos) && photos.some((p) => String(p).toLowerCase() === String(fileUuidStr).toLowerCase())) return true;
    }
    const [hist] = await connection.execute(
        `SELECT 1 FROM TB_BUS_DRIVER_VEHICLE_FILE_HIST h
         INNER JOIN TB_BUS_DRIVER_VEHICLE b ON b.BUS_ID = h.BUS_ID AND b.USER_UUID = UUID_TO_BIN(?)
         WHERE h.FILE_UUID = UUID_TO_BIN(?) LIMIT 1`,
        [userUuid, fileUuidStr]
    );
    return hist.length > 0;
}

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------

// API 1-0: 아이디 중복 검사
app.get('/api/auth/check-id', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

        connection = await pool.getConnection();
        await ensureTbUserTable(connection);

        // [보안] 아이디(이메일)는 DB에 암호화되어 있으므로, 전체 스캔 후 복호화 비교
        const [rows] = await connection.execute('SELECT USER_ID, USER_ID_ENC FROM TB_USER');
        const isDuplicate = rows.some((row) => {
            try {
                // USER_ID_ENC를 우선 확인하고, 없으면 USER_ID를 확인
                const encryptedId = row.USER_ID_ENC || row.USER_ID;
                if (!encryptedId) return false;
                return decrypt(encryptedId) === userId;
            } catch (e) {
                return false;
            }
        });

        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 사용 중인 아이디입니다.' });
        }
        return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
        console.error('Check ID error:', error.code || error.message, error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ isAvailable: true, message: '사용 가능한 아이디입니다.' });
        }
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            detail: process.env.NODE_ENV !== 'production' ? String(error.message) : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// API 1-2: 전화번호 중복 검사
app.get('/api/auth/check-phone', async (req, res) => {
    let connection;
    try {
        const { phoneNo } = req.query;
        if (!phoneNo) return res.status(400).json({ error: 'phoneNo query parameter is required' });

        connection = await pool.getConnection();
        await ensureTbUserTable(connection);

        // [보안] 휴대폰 번호는 DB에 암호화된 상태로 저장되므로, 전체 스캔 후 복호화 비교
        const [rows] = await connection.execute('SELECT HP_NO FROM TB_USER');
        const isDuplicate = rows.some((row) => {
            try {
                return decrypt(row.HP_NO) === phoneNo;
            } catch (e) {
                return false;
            }
        });
        if (isDuplicate) {
            return res.status(409).json({ isAvailable: false, message: '이미 가입된 휴대폰 번호입니다.' });
        }
        return res.status(200).json({ isAvailable: true });
    } catch (error) {
        console.error('Check phone error:', error.code || error.message, error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ isAvailable: true });
        }
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            detail: process.env.NODE_ENV !== 'production' ? String(error.message) : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// ── SMS 인증 코드 인메모리 저장소 (개발용, 실운영시 Redis 권장) ──────────────
const smsCodeStore = new Map(); // key: phoneNumber, value: { code, expiresAt }

// API 1-3: SMS 인증번호 전송
app.post('/api/auth/send-sms', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: '휴대폰 번호를 입력해주세요.' });
        const cleaned = phoneNumber.replace(/-/g, '');
        if (!/^01[016789]\d{7,8}$/.test(cleaned)) {
            return res.status(400).json({ error: '올바른 휴대폰 번호 형식이 아닙니다.' });
        }

        // 개발 모드: 고정 인증번호 123456 사용
        const code = '123456';
        const expiresAt = Date.now() + 3 * 60 * 1000; // 3분
        smsCodeStore.set(cleaned, { code, expiresAt });

        console.log(`[SMS] 인증번호 발송 (개발모드): ${cleaned} → ${code}`);

        // TODO: 실 운영시 Firebase Admin SMS 또는 외부 SMS API 연동
        // const message = { text: `[busTaams] 인증번호: ${code}`, phone: `+82${cleaned.slice(1)}` };

        return res.status(200).json({ message: `인증번호가 전송되었습니다. (개발모드: ${code})` });

    } catch (error) {
        console.error('SMS 전송 에러:', error.message);
        res.status(500).json({ error: 'SMS 전송 중 오류가 발생했습니다.' });
    }
});

// API 1-4: SMS 인증번호 확인
app.post('/api/auth/verify-sms', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) return res.status(400).json({ error: '휴대폰 번호와 인증번호를 입력해주세요.' });
        const cleaned = phoneNumber.replace(/-/g, '');

        const stored = smsCodeStore.get(cleaned);
        if (!stored) return res.status(400).json({ verified: false, error: '인증번호를 먼저 요청해주세요.' });
        if (Date.now() > stored.expiresAt) {
            smsCodeStore.delete(cleaned);
            return res.status(400).json({ verified: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
        }
        if (stored.code !== code.trim()) {
            return res.status(400).json({ verified: false, error: '인증번호가 일치하지 않습니다.' });
        }

        smsCodeStore.delete(cleaned); // 사용 후 삭제
        console.log(`[SMS] 인증 성공: ${cleaned}`);
        return res.status(200).json({ verified: true, message: '휴대폰 인증이 완료되었습니다.' });

    } catch (error) {
        console.error('SMS 인증 에러:', error.message);
        res.status(500).json({ error: 'SMS 인증 중 오류가 발생했습니다.' });
    }
});


// API 2: 최신 약관 목록 조회
app.get('/api/terms/active', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_TERMS_MASTER ORDER BY TERMS_ID ASC');
        if (rows.length > 0) {
            res.status(200).json({ status: 200, data: rows });
        } else {
            // DB에 데이터가 없어서 반환하는 Fallback Dummy Data (개발용)
            res.status(200).json({
                status: 200,
                data: [
                    { termsId: 1, type: "SVC", title: "통합이용약관", isRequired: "Y" },
                    { termsId: 2, type: "PRIVACY", title: "개인정보 처리방침", isRequired: "Y" },
                    { termsId: 3, type: "LOCATION", title: "위치정보 이용약관", isRequired: "Y" },
                    { termsId: 4, type: "MKT", title: "마케팅 정보 수신 동의서", isRequired: "N" },
                    { termsId: 5, type: "DRIVER", title: "파트너(기사님) 입점 계약서", isRequired: "Y" }
                ]
            });
        }
    } catch (error) {
        console.error('Terms fetch error (Will return dummy data for dev):', error.message);
        res.status(200).json({
            status: 200,
            data: [
                { termsId: 1, type: "SVC", title: "통합이용약관", isRequired: "Y" },
                { termsId: 2, type: "PRIVACY", title: "개인정보 처리방침", isRequired: "Y" },
                { termsId: 3, type: "LOCATION", title: "위치정보 이용약관", isRequired: "Y" },
                { termsId: 4, type: "MKT", title: "마케팅 정보 수신 동의서", isRequired: "N" },
                { termsId: 5, type: "DRIVER", title: "파트너(기사님) 입점 계약서", isRequired: "Y" }
            ]
        });
    }
});

// API 3: 회원 가입 및 서명 최종 전송 (Transaction)
app.post('/api/auth/register', async (req, res) => {
    let connection;
    try {
        const {
            userId, password, userName, phoneNo, userType,
            firebaseIdToken, mktAgreeYn, signatureBase64, agreedTerms
        } = req.body;

        if (!userId || !password || !userName || !phoneNo || !signatureBase64 || !agreedTerms || !userType) {
            console.error('Registration Failed: Missing fields', {
                userId: !!userId, password: !!password, userName: !!userName, 
                phoneNo: !!phoneNo, signatureBase64: !!signatureBase64, 
                agreedTerms: !!agreedTerms, userType: !!userType
            });
            return res.status(400).json({ error: '필수 항목이 누락되었습니다. (ID, 비밀번호, 이름, 전화번호, 서명, 약관동의, 사용자타입)' });
        }

        // 1. [보안] Firebase Phone 인증 ID 토큰 — Admin SDK 설정 시에만 검증 (기사 프로필 API와 동일 로직)
        const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(firebaseIdToken);
        if (!phoneVerify.ok) {
            return res.status(400).json({ error: phoneVerify.error });
        }
        const smsAuthYn = 'Y';

        // 2. [보안] 비밀번호 해싱 (bcrypt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. [스토리지] 서명 사진 적재 (GCS)
        const newUserUuid = randomUUID(); // 회원용 고정 UUID 생성
        const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const dateStr = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM format
        // [보안] 파일명에서도 이메일 누출 방지를 위해 UUID 사용
        const signFileUuid = randomUUID();
        const fileName = `${dateStr}/${signFileUuid}.png`;
        const gcsPath = `signatures/${fileName}`;
        const file = bucket.file(gcsPath);
        
        try {
            await file.save(buffer, {
                metadata: { contentType: 'image/png' },
                resumable: false
            });
        } catch(gcsError) {
            console.error('GCS Upload Failed. Perhaps credentials are not configured?', gcsError.message);
            // In dev environment, we might want to proceed without crashing if GCS is not set up perfectly yet.
            // If in production, we MUST throw.
            if(process.env.NODE_ENV === 'production') throw gcsError;
        }
        
        const gcsUrl = `https://storage.googleapis.com/${bucketName}/signatures/${fileName}`;

        // 4. DB 트랜잭션 시작
        connection = await pool.getConnection();
        await ensureTbUserTable(connection);
        await connection.beginTransaction();

        try {
            // [DB 트랜잭션] TB_USER INSERT
            const encryptedUserId = encrypt(userId);
            const encryptedUserName = encrypt(userName);
            const encryptedPhoneNo = encrypt(phoneNo);

            // UserType Mapping
            let mappedUserType = 'TRAVELER';
            if (userType === 'CONSUMER') mappedUserType = 'TRAVELER';
            else if (userType === 'SALES' || userType === 'SALESPERSON') mappedUserType = 'PARTNER';
            else if (userType === 'DRIVER') mappedUserType = 'DRIVER';

            const userQuery = `
                INSERT INTO TB_USER (
                    USER_UUID, USER_ID_ENC, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                    SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT
                ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, 'NONE', ?, ?, NOW(), 'ACTIVE')
            `;
            const [userResult] = await connection.execute(userQuery, [
                newUserUuid, encryptedUserId, hashedPassword, encryptedUserName, encryptedPhoneNo,
                smsAuthYn, mappedUserType
            ]);

            // [DB 트랜잭션] TB_FILE_MASTER INSERT (서명 파일 정보 등록)
            // TB_USER_TERMS_HIST의 SIGN_FILE_UUID가 이 테이블을 참조함 (F.K)
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (
                    FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                    ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                ) VALUES (UUID_TO_BIN(?), 'SIGNATURE', ?, ?, ?, 'png', ?, NOW())
            `;
            await connection.execute(fileQuery, [
                signFileUuid, bucketName, gcsPath, 'signature.png', buffer.length
            ]);

            // [DB 트랜잭션] TB_USER_TERMS_HIST 다중 INSERT
            if (agreedTerms.length > 0) {
                const histQuery = `
                    INSERT INTO TB_USER_TERMS_HIST (
                        USER_UUID, TERMS_TYPE, TERMS_VER, AGREE_YN, SIGN_FILE_UUID, AGREE_DT
                    ) VALUES (UUID_TO_BIN(?), ?, 'v1.0', 'Y', UUID_TO_BIN(?), NOW())
                `;
                
                const termsMapping = {
                    1: 'SERVICE',
                    2: 'PRIVACY',
                    3: 'MARKETING',
                    4: 'MARKETING'
                };

                for (const termId of agreedTerms) {
                    const type = termsMapping[termId];
                    if (type) {
                        try {
                            await connection.execute(histQuery, [newUserUuid, type, signFileUuid]);
                        } catch (histErr) {
                            console.error(`Terms Hist Insert Failed for ${type}:`, histErr.message);
                            // 히스토리 저장 실패가 전체 가입을 막게 할지 여부는 정책에 따라 다름. 
                            // 여기서는 트랜잭션이므로 에러를 던져 롤백하게 함.
                            throw histErr;
                        }
                    }
                }
            }

            await connection.commit();
            
            res.status(201).json({
                message: "회원가입이 성공적으로 완료되었습니다.",
                signFileUuid: signFileUuid 
            });

        } catch (dbError) {
            await connection.rollback();
            // GCS 업로드된 파일 롤백(삭제)
            file.delete().catch(e => console.error('GCS Rollback Delete Failed (Ignored):', e.message));
            throw dbError; // outer catch로 전달
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('회원가입 트랜잭션 에러:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: '이미 존재하는 사용자(아이디)입니다.' });
        }
        res.status(500).json({ error: '시스템 오류로 인해 처리에 실패했습니다.' });
    }
});
 
// 로그인 API (POST /api/auth/login 또는 /api/users/login - 팀원 호환성 유지용 별칭)
app.post(['/api/auth/login', '/api/users/login'], async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        // [보안] 아이디(이메일)는 암호화되어 있으므로, 전체 조회 시 BIN_TO_UUID 활용하여 조회
        const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as USER_UUID_STR, TB_USER.* FROM TB_USER');
        const user = rows.find((row) => {
            try {
                // USER_ID_ENC를 우선 확인하고, 없으면 USER_ID를 확인 (하위 호환성)
                const encryptedId = row.USER_ID_ENC || row.USER_ID;
                if (!encryptedId) return false;
                return decrypt(encryptedId) === userId;
            } catch (e) {
                return false;
            }
        });

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        let decryptedUserName = '';
        try { decryptedUserName = user.USER_NM ? decrypt(user.USER_NM) : ''; } catch(e) { decryptedUserName = user.USER_NM; }

        let decryptedPhoneNo = '';
        try { decryptedPhoneNo = user.HP_NO ? decrypt(user.HP_NO) : ''; } catch(e) { decryptedPhoneNo = user.HP_NO; }

        res.status(200).json({
            message: '로그인 성공',
            user: {
                userId: userId,
                userUuid: user.USER_UUID_STR || '',
                email: userId,
                userName: decryptedUserName,
                phoneNo: decryptedPhoneNo,
                phoneNumber: decryptedPhoneNo,
                userType: user.USER_TYPE
            }
        });

    } catch (error) {
        console.error('로그인 에러:', error ? error.stack : 'Unknown error');
        res.status(500).json({ error: '로그인 중 서버 오류가 발생했습니다.', details: error ? error.toString() : 'Unknown error' });
    }
});

// 기사님 프로필 저장/수정 API (POST /api/driver/profile)
app.post('/api/driver/profile', async (req, res) => {
    try {
        const {
            userId, licenseNo, profileImgBase64, licenseImgBase64,
            accidentFreeDoc, membershipType, bioDesc
        } = req.body;

        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }

        let profileImgUrl = '';
        let licenseImgUrl = '';

        // 1. 프로필 이미지 업로드 (Base64 -> GCS)
        if (profileImgBase64 && profileImgBase64.startsWith('data:image')) {
            const base64Data = profileImgBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `profile/${userId}_${Date.now()}.png`;
            const file = bucket.file(`certificates/${fileName}`);
            await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
            profileImgUrl = `https://storage.googleapis.com/${bucketName}/certificates/${fileName}`;
        }

        // 2. 면허증 이미지 업로드 (Base64 -> GCS)
        if (licenseImgBase64 && licenseImgBase64.startsWith('data:image')) {
            const base64Data = licenseImgBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `bus_licenses/${userId}_${Date.now()}.png`;
            const file = bucket.file(`certificates/${fileName}`);
            await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
            licenseImgUrl = `https://storage.googleapis.com/${bucketName}/certificates/${fileName}`;
        }

        // 3. DB 작업 (Transaction)
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const profileFileUuid = randomUUID();
            const licenseFileUuid = randomUUID();

            if (profileImgUrl) {
                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                    ) VALUES (UUID_TO_BIN(?), 'PROFILE_IMG', ?, ?, ?, 'png', 0, NOW())
                `;
                const profileGcsPath = profileImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [profileFileUuid, bucketName, profileGcsPath, 'profile.png']);
            }

            if (licenseImgUrl) {
                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT
                    ) VALUES (UUID_TO_BIN(?), 'DRIVER_LICENSE', ?, ?, ?, 'png', 0, NOW())
                `;
                const licenseGcsPath = licenseImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [licenseFileUuid, bucketName, licenseGcsPath, 'license.png']);
            }

            const query = `
                INSERT INTO TB_DRIVER_DETAIL (
                    USER_ID, LICENSE_NO, CERT_PHOTO_URL, ACCIDENT_FREE_DOC,
                    MEMBERSHIP_TYPE, BIO_DESC, PROFILE_IMG_URL, REG_ID, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    LICENSE_NO = VALUES(LICENSE_NO),
                    CERT_PHOTO_URL = IF(VALUES(CERT_PHOTO_URL) != '', VALUES(CERT_PHOTO_URL), CERT_PHOTO_URL),
                    ACCIDENT_FREE_DOC = VALUES(ACCIDENT_FREE_DOC),
                    MEMBERSHIP_TYPE = VALUES(MEMBERSHIP_TYPE),
                    BIO_DESC = VALUES(BIO_DESC),
                    PROFILE_IMG_URL = IF(VALUES(PROFILE_IMG_URL) != '', VALUES(PROFILE_IMG_URL), PROFILE_IMG_URL),
                    MOD_ID = VALUES(MOD_ID)
            `;

            const params = [
                userId, 
                licenseNo || '', 
                licenseImgUrl, 
                accidentFreeDoc || '',
                membershipType || 'NORMAL', 
                bioDesc || '', 
                profileImgUrl,
                userId, // REG_ID
                userId  // MOD_ID
            ];

            await connection.execute(query, params);
            await connection.commit();

            res.status(200).json({ 
                message: '기사님 프로필이 성공적으로 저장되었습니다.',
                profileImgUrl,
                licenseImgUrl
            });
        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('기사 프로필 저장 에러:', error);
        res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' });
    }
});
 
// API: 기사 프로필 조회 (폼 채우기)
app.get('/api/driver/profile-setup', async (req, res) => {
    try {
        const { userUuid } = req.query;
        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });

        const [uRows] = await pool.execute(
            `SELECT USER_NM, HP_NO FROM TB_USER WHERE USER_UUID = UUID_TO_BIN(?)`,
            [userUuid]
        );
        if (!uRows.length) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });

        const u = uRows[0];
        let userName = '';
        let phoneNo = '';
        try {
            userName = u.USER_NM ? decrypt(u.USER_NM) : '';
        } catch (_) {
            userName = '';
        }
        try {
            phoneNo = u.HP_NO ? decrypt(u.HP_NO) : '';
        } catch (_) {
            phoneNo = '';
        }

        let dRows;
        try {
            const [dr] = await pool.execute(
                `SELECT RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, LICENSE_EXPIRY_DT,
                        QUAL_CERT_NO, BIO_TEXT,
                        IFNULL(QUAL_CERT_VERIFY_STATUS, 'UNVERIFIED') AS QUAL_CERT_VERIFY_STATUS,
                        QUAL_CERT_VERIFY_DT,
                        BIN_TO_UUID(PROFILE_PHOTO_UUID) AS PROFILE_PHOTO_UUID_STR,
                        PROFILE_PHOTO_UUID,
                        BIN_TO_UUID(QUAL_CERT_FILE_UUID) AS QUAL_CERT_FILE_UUID_STR,
                        QUAL_CERT_FILE_UUID
                 FROM TB_DRIVER_INFO WHERE USER_UUID = UUID_TO_BIN(?)`,
                [userUuid]
            );
            dRows = dr;
        } catch (e) {
            if (e.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ exists: false, userName, phoneNo });
            }
            throw e;
        }

        if (!dRows.length) {
            return res.json({ exists: false, userName, phoneNo });
        }

        const d = dRows[0];
        let rrnFront = '';
        let rrnBack = '';
        try {
            const plain = d.RRN_ENC ? decrypt(d.RRN_ENC) : '';
            const parts = String(plain).trim().split('-');
            if (parts.length >= 2 && parts[0].length === 6) {
                rrnFront = parts[0];
                rrnBack = String(parts[1]).charAt(0) || '';
            }
        } catch (_) {
            /* ignore */
        }

        return res.json({
            exists: true,
            userName,
            phoneNo,
            rrnFront,
            rrnBack,
            licenseType: d.LICENSE_TYPE || '',
            licenseNo: d.LICENSE_NO || '',
            licenseSerialNo: d.LICENSE_SERIAL_NO || '',
            licenseIssueDt: formatDateYmd(d.LICENSE_ISSUE_DT),
            licenseExpiryDt: formatDateYmd(d.LICENSE_EXPIRY_DT),
            qualCertNo: d.QUAL_CERT_NO || '',
            bioText: d.BIO_TEXT || '',
            hasProfilePhoto: !!(d.PROFILE_PHOTO_UUID && d.PROFILE_PHOTO_UUID.length),
            profilePhotoUuid: d.PROFILE_PHOTO_UUID_STR || null,
            hasQualCertFile: !!(d.QUAL_CERT_FILE_UUID && d.QUAL_CERT_FILE_UUID.length),
            qualCertFileUuid: d.QUAL_CERT_FILE_UUID_STR || null,
            qualCertVerifyStatus: d.QUAL_CERT_VERIFY_STATUS || 'UNVERIFIED',
            qualCertVerifyDt: d.QUAL_CERT_VERIFY_DT
                ? new Date(d.QUAL_CERT_VERIFY_DT).toISOString()
                : null
        });
    } catch (error) {
        console.error('GET driver profile-setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

/** 프로필 사진 스트리밍 — TB_DRIVER_INFO.PROFILE_PHOTO_UUID로 본인 소유 확인 후 GCS에서 반환 */
app.get('/api/driver/profile-photo', async (req, res) => {
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });

        const [rows] = await pool.execute(
            `SELECT BIN_TO_UUID(PROFILE_PHOTO_UUID) AS fileUuidStr
             FROM TB_DRIVER_INFO
             WHERE USER_UUID = UUID_TO_BIN(?) AND PROFILE_PHOTO_UUID = UUID_TO_BIN(?)`,
            [userUuid, fileUuid]
        );
        if (!rows.length) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [fRows] = await pool.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (!fRows.length) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = fRows[0];

        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || 'png').toLowerCase();
        const ctMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const ct = ctMap[ext] || 'image/png';

        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'profile')}`);
        res.setHeader('Cache-Control', 'private, max-age=300');
        gcsFile.createReadStream()
            .on('error', (err) => { console.error('GCS profile-photo stream:', err); if (!res.headersSent) res.status(500).end(); })
            .pipe(res);
    } catch (error) {
        console.error('GET driver profile-photo error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 견적 요청 저장 (POST /api/auction/request)
app.post('/api/auction/request', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, tripTitle, startAddr, endAddr, startDt, endDt,
            passengerCnt, totalAmount, waypoints, vehicles
        } = req.body;

        if (!userUuid || !tripTitle || !startAddr || !endAddr || !startDt || !endDt) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const reqUuid = randomUUID();
            
            // 1. TB_AUCTION_REQ (Master) Insert
            const masterQuery = `
                INSERT INTO TB_AUCTION_REQ (
                    REQ_UUID, TRAVELER_UUID, TRIP_TITLE, START_ADDR, END_ADDR, 
                    START_DT, END_DT, PASSENGER_CNT, REQ_STAT, EXPIRE_DT, 
                    REQ_AMT, REG_DT, REG_ID
                ) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, 
                    ?, ?, ?, 'BIDDING', DATE_SUB(?, INTERVAL 1 DAY), 
                    ?, NOW(), ?
                )
            `;
            
            await connection.execute(masterQuery, [
                reqUuid, userUuid, tripTitle, startAddr, endAddr,
                startDt, endDt, passengerCnt || 0, startDt,
                totalAmount || 0, userUuid // REG_ID as userUuid for now
            ]);

            // 2. TB_AUCTION_REQ_BUS (Vehicles) Insert
            if (vehicles && vehicles.length > 0) {
                const busQuery = `
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_BUS_UUID, REQ_UUID, BUS_TYPE_CD, REQ_BUS_CNT, REG_DT, REG_ID
                    ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, NOW(), ?)
                `;
                for (const bus of vehicles) {
                    if (bus.qty > 0) {
                        const busBusUuid = randomUUID();
                        await connection.execute(busQuery, [
                            busBusUuid, reqUuid, bus.type, bus.qty, userUuid
                        ]);
                    }
                }
            }

            // 3. TB_AUCTION_REQ_VIA (Waypoints) Insert
            if (waypoints && waypoints.length > 0) {
                const viaQuery = `
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        VIA_UUID, REQ_UUID, VIA_ORD, VIA_ADDR, STOP_TIME_MIN, REG_DT, REG_ID
                    ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, NOW(), ?)
                `;
                for (let i = 0; i < waypoints.length; i++) {
                    const viaUnitUuid = randomUUID();
                    await connection.execute(viaQuery, [
                        viaUnitUuid, reqUuid, i + 1, waypoints[i].address, 0, userUuid
                    ]);
                }
            }

            await connection.commit();
            res.status(201).json({ message: '견적 요청이 성공적으로 등록되었습니다.', reqUuid });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Auction Request Error:', error);
        res.status(500).json({ error: '견적 요청 저장 중 오류가 발생했습니다.' });
    }
});

// 최근 견적 요청 조회 (GET /api/auction/recent/:userUuid)
app.get('/api/auction/recent/:userUuid', async (req, res) => {
    try {
        const { userUuid } = req.params;
        if (!userUuid) {
            return res.status(400).json({ error: 'userUuid is required' });
        }

        const query = `
            SELECT 
                BIN_TO_UUID(REQ_UUID) as REQ_UUID_STR, 
                TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_STAT, REQ_AMT
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_UUID = UUID_TO_BIN(?) 
            ORDER BY REG_DT DESC 
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(query, [userUuid]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: '최근 요청이 없습니다.' });
        }

        const recent = rows[0];

        // 차량 정보도 가져오기
        const busQuery = `
            SELECT BUS_TYPE_CD, REQ_BUS_CNT 
            FROM TB_AUCTION_REQ_BUS 
            WHERE REQ_UUID = UUID_TO_BIN(?)
        `;
        const [buses] = await pool.execute(busQuery, [recent.REQ_UUID_STR]);
        recent.vehicles = buses;

        res.status(200).json(recent);

    } catch (error) {
        console.error('Fetch Recent Request Error:', error);
        res.status(500).json({ error: '최근 요청 조회 중 오류가 발생했습니다.' });
    }
});

// 사용자의 모든 견적 요청 목록 조회 (GET /api/auction/user/:userUuid)
app.get('/api/auction/user/:userUuid', async (req, res) => {
    try {
        const { userUuid } = req.params;
        if (!userUuid) {
            return res.status(400).json({ error: 'userUuid is required' });
        }

        const query = `
            SELECT 
                BIN_TO_UUID(r.REQ_UUID) as REQ_UUID_STR, 
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, 
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.REQ_STAT, r.REQ_AMT,
                b.BUS_TYPE_CD, b.REQ_BUS_CNT
            FROM TB_AUCTION_REQ r
            LEFT JOIN TB_AUCTION_REQ_BUS b ON r.REQ_UUID = b.REQ_UUID
            WHERE r.TRAVELER_UUID = UUID_TO_BIN(?) AND r.REQ_STAT = 'BIDDING'
            ORDER BY r.REG_DT DESC
        `;
        
        const [rows] = await pool.execute(query, [userUuid]);
        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch User Requests Error:', error);
        res.status(500).json({ error: '사용자 예약 내역 조회 중 오류가 발생했습니다.' });
    }
});

// API: 기사 프로필 설정 (Profile Setup)
app.post('/api/driver/profile-setup', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, rrn, licenseType, licenseNo, licenseIssueDt, licenseExpiryDt,
            licenseSerialNo,
            qualCertNo, bioText, profilePhotoBase64, qualCertBase64,
            phoneIdToken,
            driverName
        } = req.body;

        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });

        const rrnNorm = (rrn || '').trim();
        if (!/^\d{6}-\d{1}$/.test(rrnNorm)) {
            return res.status(400).json({
                error: '주민등록번호는 앞 6자리와 뒤 1자리만 입력해 주세요. (예: 900101-1)'
            });
        }

        const phoneVerify = await verifyFirebasePhoneIdTokenIfRequired(phoneIdToken);
        if (!phoneVerify.ok) {
            return res.status(400).json({ error: phoneVerify.error });
        }

        const existingDriverRow = await fetchDriverInfoRow(userUuid);

        const extVerify = await runDriverVerificationsForProfileSetup({
            driverName: (driverName || '').trim(),
            rrn: rrnNorm,
            licenseNo,
            licenseSerialNo,
            qualCertNo,
            licenseType,
            licenseIssueDt,
            licenseExpiryDt,
            existingRow: existingDriverRow
        });
        if (!extVerify.ok) {
            return res.status(400).json({
                error: extVerify.message || '면허·자격 진위 확인에 실패했습니다.',
                detail: extVerify.detail
            });
        }

        // 자격번호 검증 상태 계산
        // tsOn=false(비활성) → SKIPPED, tsOn+unchanged → 기존 DB 값 유지, tsOn+신규/변경 검증 통과 → VERIFIED
        const tsOn = extVerify.results?.qual?.tsVerifyEnabled ?? false;
        const skipTs = extVerify.results?.qual?.skipped && extVerify.results?.qual?.reason === 'unchanged_from_db';
        let qualCertVerifyStatus;
        if (!tsOn) {
            qualCertVerifyStatus = 'SKIPPED';
        } else if (skipTs) {
            // 자격번호 변경 없음 — 기존 상태 유지 (없으면 VERIFIED로 간주: 이미 통과된 이력)
            qualCertVerifyStatus = existingDriverRow?.QUAL_CERT_VERIFY_STATUS || 'VERIFIED';
        } else {
            // TS API 실제 검증 통과
            qualCertVerifyStatus = 'VERIFIED';
        }
        const qualCertVerifyDt = qualCertVerifyStatus === 'VERIFIED' ? new Date() : null;

        connection = await pool.getConnection();

        /* DDL은 암시적 커밋이 있을 수 있어 트랜잭션 시작 전에 실행 */
        await ensureDriverInfoTable(connection);
        await ensureTbFileMasterTable(connection);
        await ensureDriverInfoLicenseSerialColumn(connection);
        await ensureDriverInfoQualVerifyColumns(connection);

        await connection.beginTransaction();

        try {
            const encryptedRrn = encrypt(rrnNorm);
            let profilePhotoUuid = null;
            let qualCertUuid = null;

            const ym = new Date().toISOString().slice(0, 7);

            // 1. 프로필 사진 — ARCHITECTURE: gs://bustaams-secure-data/profiles/driver/{YYYY-MM}/
            if (profilePhotoBase64 && profilePhotoBase64.startsWith('data:image')) {
                profilePhotoUuid = randomUUID();
                const buffer = Buffer.from(profilePhotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const gcsPath = `profiles/driver/${ym}/${profilePhotoUuid}.png`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'DRIVER_PROFILE_PHOTO', ?, ?, 'profile.png', 'png', ?, NOW())
                `, [profilePhotoUuid, bucketName, gcsPath, buffer.length]);
            }

            // 2. 운송종사자 자격증 사본 — ARCHITECTURE: gs://bustaams-secure-data/certificates/bus_licenses/
            if (qualCertBase64 && qualCertBase64.startsWith('data:')) {
                qualCertUuid = randomUUID();
                const isPdf = qualCertBase64.includes('pdf');
                const ext = isPdf ? 'pdf' : 'png';
                const buffer = Buffer.from(qualCertBase64.replace(/^data:[\w\/]+;base64,/, ""), 'base64');
                const gcsPath = `certificates/bus_licenses/${ym}/${qualCertUuid}.${ext}`;
                const file = bucket.file(gcsPath);
                await file.save(buffer, { metadata: { contentType: isPdf ? 'application/pdf' : 'image/png' }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (FILE_UUID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                    VALUES (UUID_TO_BIN(?), 'BUS_QUAL_CERT', ?, ?, ?, ?, ?, NOW())
                `, [qualCertUuid, bucketName, gcsPath, `qual_cert.${ext}`, ext, buffer.length]);
            }

            // 3. TB_DRIVER_INFO 저장 (Upsert)
            const driverQuery = `
                INSERT INTO TB_DRIVER_INFO (
                    USER_UUID, RRN_ENC, LICENSE_TYPE, LICENSE_NO, LICENSE_SERIAL_NO, LICENSE_ISSUE_DT, 
                    LICENSE_EXPIRY_DT, QUAL_CERT_NO, QUAL_CERT_VERIFY_STATUS, QUAL_CERT_VERIFY_DT,
                    QUAL_CERT_FILE_UUID, PROFILE_PHOTO_UUID, BIO_TEXT, UPDATE_DT
                ) VALUES (
                    UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ${qualCertUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
                    ${profilePhotoUuid ? 'UUID_TO_BIN(?)' : 'NULL'}, 
                    ?, NOW()
                )
                ON DUPLICATE KEY UPDATE 
                    RRN_ENC = VALUES(RRN_ENC),
                    LICENSE_TYPE = VALUES(LICENSE_TYPE),
                    LICENSE_NO = VALUES(LICENSE_NO),
                    LICENSE_SERIAL_NO = VALUES(LICENSE_SERIAL_NO),
                    LICENSE_ISSUE_DT = VALUES(LICENSE_ISSUE_DT),
                    LICENSE_EXPIRY_DT = VALUES(LICENSE_EXPIRY_DT),
                    QUAL_CERT_NO = VALUES(QUAL_CERT_NO),
                    QUAL_CERT_VERIFY_STATUS = VALUES(QUAL_CERT_VERIFY_STATUS),
                    QUAL_CERT_VERIFY_DT = IFNULL(VALUES(QUAL_CERT_VERIFY_DT), QUAL_CERT_VERIFY_DT),
                    QUAL_CERT_FILE_UUID = IFNULL(VALUES(QUAL_CERT_FILE_UUID), QUAL_CERT_FILE_UUID),
                    PROFILE_PHOTO_UUID = IFNULL(VALUES(PROFILE_PHOTO_UUID), PROFILE_PHOTO_UUID),
                    BIO_TEXT = VALUES(BIO_TEXT),
                    UPDATE_DT = NOW()
            `;
            
            const params = [
                userUuid,
                encryptedRrn,
                licenseType,
                licenseNo,
                licenseSerialNo || null,
                licenseIssueDt,
                licenseExpiryDt,
                qualCertNo,
                qualCertVerifyStatus,
                qualCertVerifyDt
            ];
            if (qualCertUuid) params.push(qualCertUuid);
            if (profilePhotoUuid) params.push(profilePhotoUuid);
            params.push(bioText);

            await connection.execute(driverQuery, params);

            // 방금 저장된 QUAL_CERT_FILE_UUID 조회 (문서 보기 버튼용)
            const [savedRows] = await connection.execute(
                `SELECT BIN_TO_UUID(QUAL_CERT_FILE_UUID) AS QUAL_CERT_FILE_UUID_STR FROM TB_DRIVER_INFO WHERE USER_UUID = UUID_TO_BIN(?)`,
                [userUuid]
            );
            const savedQualCertFileUuid = savedRows[0]?.QUAL_CERT_FILE_UUID_STR || null;

            await connection.commit();
            res.status(200).json({
                message: "기사 프로필 설정이 완료되었습니다.",
                qualCertVerifyStatus,
                qualCertFileUuid: savedQualCertFileUuid
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 공통코드 (버스 종류 등)
app.get('/api/common-codes', async (req, res) => {
    let connection;
    try {
        const { grpCd } = req.query;
        if (!grpCd) return res.status(400).json({ error: 'grpCd is required' });
        connection = await pool.getConnection();
        await ensureTbCommonCodeTable(connection);
        await seedBusTypeCodesIfEmpty(connection);
        const [rows] = await connection.execute(
            `SELECT DTL_CD AS dtlCd, CD_NM_KO AS cdNmKo, CD_DESC AS cdDescKo
             FROM TB_COMMON_CODE WHERE GRP_CD = ? AND USE_YN = 'Y' ORDER BY DISP_ORD ASC, DTL_CD ASC`,
            [grpCd]
        );
        res.json({ items: rows });
    } catch (e) {
        console.error('common-codes:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ─── 자격증 사본 파일 API (소유 기사 전용) ──────────────────────────────────────

/**
 * GET /api/driver/qual-cert/meta?userUuid=&fileUuid=
 * CommonView doc mode용 자격증 사본 메타 조회 (TB_DRIVER_INFO 소유 확인)
 */
app.get('/api/driver/qual-cert/meta', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT BIN_TO_UUID(FILE_UUID) AS fileUuid,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일 메타를 찾을 수 없습니다.' });
        const row = rows[0];
        const sizeBytes = Number(row.fileSizeBytes) || 0;
        const fileSizeLabel = sizeBytes >= 1048576
            ? `${(sizeBytes / 1048576).toFixed(1)}MB`
            : sizeBytes >= 1024
              ? `${(sizeBytes / 1024).toFixed(0)}KB`
              : `${sizeBytes}B`;
        res.json({
            fileUuid: row.fileUuid,
            fileCategory: row.fileCategory,
            orgFileNm: row.orgFileNm,
            fileExt: row.fileExt,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel: row.regDtLabel,
        });
    } catch (e) {
        console.error('qual-cert/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/driver/qual-cert/file?userUuid=&fileUuid=
 * 자격증 사본 파일 스트리밍 (TB_DRIVER_INFO 소유 확인)
 */
app.get('/api/driver/qual-cert/file', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';
        else if (ext === 'gif') ct = 'image/gif';
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'file')}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (qual-cert):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('qual-cert/file:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/driver/qual-cert/download?userUuid=&fileUuid=
 * 자격증 사본 파일 다운로드 (Content-Disposition: attachment)
 */
app.get('/api/driver/qual-cert/download', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const safeNm = `${ORG_FILE_NM || 'qual_cert'}.${FILE_EXT || 'file'}`;
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeNm)}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS download (qual-cert):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('qual-cert/download:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/** CommonView — 문서 뷰어 샘플 메타(JSON). 일반 모드용 */
app.get('/api/common-view/document', async (req, res) => {
    try {
        res.json({
            commonViewDocumentId: 'cv-doc-2024-contract-09',
            fileName: '2024_운행_계약서.pdf',
            fileType: 'PDF',
            fileSizeBytes: 1258291,
            fileSizeLabel: '1.2MB',
            authorName: '운영지원팀 김태영',
            createdAtLabel: '2024년 05월 12일',
            securityLevel: '대외비 (Internal Use)',
            reportNo: '2024-CONTRACT-09',
            totalPages: 12,
        });
    } catch (e) {
        console.error('common-view/document:', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * CommonView — 기사 서류 파일 메타 조회 (소유 기사 전용)
 * GET /api/common-view/bus-document/meta?userUuid=&fileUuid=
 */
app.get('/api/common-view/bus-document/meta', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);
        const ok = await canAccessBusFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT BIN_TO_UUID(FILE_UUID) AS fileUuid,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일 메타를 찾을 수 없습니다.' });
        const row = rows[0];
        const sizeBytes = Number(row.fileSizeBytes) || 0;
        const fileSizeLabel = sizeBytes >= 1048576
            ? `${(sizeBytes / 1048576).toFixed(1)}MB`
            : sizeBytes >= 1024
              ? `${(sizeBytes / 1024).toFixed(0)}KB`
              : `${sizeBytes}B`;
        res.json({
            fileUuid: row.fileUuid,
            fileCategory: row.fileCategory,
            orgFileNm: row.orgFileNm,
            fileExt: row.fileExt,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel: row.regDtLabel,
        });
    } catch (e) {
        console.error('common-view/bus-document/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * CommonView — 기사 서류 파일 다운로드 (소유 기사 전용)
 * GET /api/common-view/bus-document/download?userUuid=&fileUuid=
 * Content-Disposition: attachment — 파일명: ORG_FILE_NM.FILE_EXT
 */
app.get('/api/common-view/bus-document/download', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);
        const ok = await canAccessBusFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf')                     ct = 'application/pdf';
        else if (ext === 'png')                ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp')               ct = 'image/webp';

        const downloadName = `${ORG_FILE_NM || 'file'}.${ext}`;
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (download):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('common-view/bus-document/download:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// 기사 소유 차량 조회 (모달 기본값)
app.get('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const { userUuid } = req.query;
        if (!userUuid) return res.status(400).json({ error: 'userUuid is required' });
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        const row = await fetchBusRowForUser(connection, userUuid);
        if (!row) return res.json({ bus: null });

        const amenities = typeof row.AMENITIES === 'string' ? JSON.parse(row.AMENITIES || '{}') : (row.AMENITIES || {});
        let photoUuids = row.VEHICLE_PHOTOS_JSON;
        if (typeof photoUuids === 'string') {
            try { photoUuids = JSON.parse(photoUuids); } catch (e) { photoUuids = []; }
        }
        if (!Array.isArray(photoUuids)) photoUuids = [];

        const bizRegFile = await fileMetaByUuid(connection, row.bizRegUuid);
        const transLicFile = await fileMetaByUuid(connection, row.transLicUuid);
        const insCertFile = await fileMetaByUuid(connection, row.insCertUuid);

        res.json({
            bus: {
                busUuid: row.busUuid,
                vehicleNo: row.VEHICLE_NO,
                modelNm: row.MODEL_NM,
                manufactureYear: row.MANUFACTURE_YEAR,
                mileage: row.MILEAGE,
                serviceClass: row.SERVICE_CLASS,
                amenities,
                hasAdas: row.HAS_ADAS === 'Y',
                lastInspectDt: row.lastInspectDt || '',
                insuranceExpDt: row.insuranceExpDt || '',
                bizRegFile: bizRegFile ? { fileUuid: bizRegFile.fileUuid, orgFileNm: bizRegFile.ORG_FILE_NM, fileExt: bizRegFile.FILE_EXT } : null,
                transLicFile: transLicFile ? { fileUuid: transLicFile.fileUuid, orgFileNm: transLicFile.ORG_FILE_NM, fileExt: transLicFile.FILE_EXT } : null,
                insCertFile: insCertFile ? { fileUuid: insCertFile.fileUuid, orgFileNm: insCertFile.ORG_FILE_NM, fileExt: insCertFile.FILE_EXT } : null,
                vehiclePhotoFileUuids: photoUuids
            }
        });
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return res.json({ bus: null });
        console.error('GET driver/bus:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// 차량·서류 파일 스트리밍 (소유 기사)
app.get('/api/driver/bus-documents/file', async (req, res) => {
    let connection;
    try {
        const { userUuid, fileUuid } = req.query;
        if (!userUuid || !fileUuid) return res.status(400).json({ error: 'userUuid and fileUuid are required' });
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);
        const ok = await canAccessBusFile(connection, userUuid, fileUuid);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [rows] = await connection.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_UUID = UUID_TO_BIN(?)`,
            [fileUuid]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucket.file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';

        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ORG_FILE_NM || 'file')}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read:', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('bus-documents/file:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// CustomerDashboard API
app.get('/api/customer/active-request', async (req, res) => {
    const { uuid } = req.query;
    try {
        const [rows] = await pool.execute(`SELECT * FROM TB_BUS_REQUEST WHERE TRAVELER_UUID = UUID_TO_BIN(?) AND REQUEST_STATUS = 'OPEN' ORDER BY CREATE_DT DESC LIMIT 1`, [uuid]);
        if (rows.length === 0) return res.json(null);
        const r = rows[0];
        res.json({ id: r.REQUEST_UUID, route: `${r.DEPARTURE_LOC} → ${r.DESTINATION_LOC}`, subTitle: '대형 전세버스 패키지', startDt: '2024-10-24', description: `대형 · ${r.PASSENGER_CNT}명`, status: r.REQUEST_STATUS });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API: 버스 정보 등록 (신규)
app.post('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, vehicleNo, modelNm, manufactureYear, mileage,
            serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt,
            businessLicenseBase64, businessLicenseFileName,
            transportationLicenseBase64, transportationLicenseFileName,
            insurancePolicyBase64, insurancePolicyFileName,
            vehiclePhotos
        } = req.body;

        if (!userUuid || !vehicleNo) {
            return res.status(400).json({ error: 'userUuid and vehicleNo are required' });
        }
        if (!serviceClass) {
            return res.status(400).json({ error: 'serviceClass is required' });
        }

        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbFileMasterTable(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);

        const existing = await fetchBusRowForUser(connection, userUuid);
        if (existing) {
            return res.status(409).json({ error: '이미 등록된 차량이 있습니다. 수정 화면에서 변경해 주세요.' });
        }

        const busUuid = randomUUID();
        const ym = new Date().toISOString().slice(0, 7);
        const adasYn = hasAdas === true || hasAdas === 'Y' ? 'Y' : 'N';
        const amenObj = { ...(amenities || {}), adas: adasYn === 'Y' };

        await connection.beginTransaction();
        try {
            await connection.execute(
                `INSERT INTO TB_BUS_DRIVER_VEHICLE (
                    BUS_ID, USER_UUID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR,
                    MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS, LAST_INSPECT_DT, INSURANCE_EXP_DT
                ) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?
                )`,
                [
                    busUuid, userUuid, vehicleNo, modelNm || '', manufactureYear || '',
                    Number(mileage) || 0, serviceClass, JSON.stringify(amenObj), adasYn,
                    lastInspectDt || null, insuranceExpDt || null
                ]
            );

            const fileUuids = {};
            const docMap = [
                { key: 'biz', field: businessLicenseBase64, name: businessLicenseFileName, cat: 'Business_License', col: 'BIZ_REG_FILE_UUID' },
                { key: 'trans', field: transportationLicenseBase64, name: transportationLicenseFileName, cat: 'Transportation_Business_License', col: 'TRANS_LIC_FILE_UUID' },
                { key: 'ins', field: insurancePolicyBase64, name: insurancePolicyFileName, cat: 'Insurance_Policy', col: 'INS_CERT_FILE_UUID' }
            ];
            for (const d of docMap) {
                if (!d.field || typeof d.field !== 'string') continue;
                const parsed = parseDataUrlPayload(d.field, d.name || 'doc');
                if (!parsed) continue;
                const fid = randomUUID();
                const gcsPath = `vehicle_docs/${ym}/${fid}.${parsed.ext}`;
                await insertBusFileAndHist(connection, {
                    busUuidStr: busUuid,
                    fileUuidStr: fid,
                    category: d.cat,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm: parsed.orgName || `doc.${parsed.ext}`,
                    fileExt: parsed.ext,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime
                });
                fileUuids[d.key] = fid;
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET ${d.col} = UUID_TO_BIN(?) WHERE BUS_ID = UUID_TO_BIN(?)`,
                    [fid, busUuid]
                );
            }

            const photoUuidList = [];
            if (Array.isArray(vehiclePhotos) && vehiclePhotos.length > 0) {
                const slice = vehiclePhotos.slice(0, 8);
                for (const ph of slice) {
                    const raw = ph.base64 || ph.dataUrl;
                    const nm = ph.fileName || ph.name || 'photo';
                    if (!raw) continue;
                    const parsed = parseDataUrlPayload(typeof raw === 'string' && raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`, nm);
                    if (!parsed) continue;
                    const fid = randomUUID();
                    const gcsPath = `vehicle_docs/${ym}/bus_photo_${fid}.${parsed.ext}`;
                    await insertBusFileAndHist(connection, {
                        busUuidStr: busUuid,
                        fileUuidStr: fid,
                        category: 'BUS_PHOTO',
                        gcsPath,
                        buffer: parsed.buffer,
                        orgFileNm: parsed.orgName || `photo.${parsed.ext}`,
                        fileExt: parsed.ext,
                        fileSize: parsed.buffer.length,
                        contentType: parsed.mime
                    });
                    photoUuidList.push(fid);
                }
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = UUID_TO_BIN(?)`,
                    [JSON.stringify(photoUuidList), busUuid]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: '차량 등록이 완료되었습니다.',
                busUuid,
                fileUuids: Object.keys(fileUuids).length ? fileUuids : undefined,
                vehiclePhotoFileUuids: photoUuidList.length ? photoUuidList : undefined
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Bus Setup error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 버스 정보 수정 (스칼라 필드)
app.patch('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, busUuid, vehicleNo, modelNm, manufactureYear, mileage,
            serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt
        } = req.body;
        if (!userUuid || !busUuid) {
            return res.status(400).json({ error: 'userUuid and busUuid are required' });
        }
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        const row = await fetchBusRowForUser(connection, userUuid);
        if (!row || String(row.busUuid).toLowerCase() !== String(busUuid).toLowerCase()) {
            return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
        }
        const adasYn = hasAdas === undefined ? (row.HAS_ADAS === 'Y' ? 'Y' : 'N') : (hasAdas === true || hasAdas === 'Y' ? 'Y' : 'N');
        let prevAmen = row.AMENITIES;
        if (typeof prevAmen === 'string') {
            try { prevAmen = JSON.parse(prevAmen || '{}'); } catch (e) { prevAmen = {}; }
        } else if (!prevAmen || typeof prevAmen !== 'object') {
            prevAmen = {};
        }
        const amenObj = amenities !== undefined
            ? { ...amenities, adas: adasYn === 'Y' }
            : { ...prevAmen, adas: adasYn === 'Y' };

        await connection.execute(
            `UPDATE TB_BUS_DRIVER_VEHICLE SET
                VEHICLE_NO = COALESCE(?, VEHICLE_NO),
                MODEL_NM = COALESCE(?, MODEL_NM),
                MANUFACTURE_YEAR = COALESCE(?, MANUFACTURE_YEAR),
                MILEAGE = COALESCE(?, MILEAGE),
                SERVICE_CLASS = COALESCE(?, SERVICE_CLASS),
                AMENITIES = ?,
                HAS_ADAS = ?,
                LAST_INSPECT_DT = COALESCE(?, LAST_INSPECT_DT),
                INSURANCE_EXP_DT = COALESCE(?, INSURANCE_EXP_DT)
             WHERE BUS_ID = UUID_TO_BIN(?) AND USER_UUID = UUID_TO_BIN(?)`,
            [
                vehicleNo ?? null, modelNm ?? null, manufactureYear ?? null,
                mileage !== undefined ? Number(mileage) : null, serviceClass ?? null,
                JSON.stringify(amenObj), adasYn,
                lastInspectDt ?? null, insuranceExpDt ?? null,
                busUuid, userUuid
            ]
        );
        res.json({ message: '차량 정보가 수정되었습니다.' });
    } catch (e) {
        console.error('PATCH driver/bus:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 서류만 갱신
app.patch('/api/driver/bus/documents', async (req, res) => {
    let connection;
    try {
        const {
            userUuid, busUuid,
            businessLicenseBase64, businessLicenseFileName,
            transportationLicenseBase64, transportationLicenseFileName,
            insurancePolicyBase64, insurancePolicyFileName
        } = req.body;
        if (!userUuid || !busUuid) {
            return res.status(400).json({ error: 'userUuid and busUuid are required' });
        }
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbFileMasterTable(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);
        const row = await fetchBusRowForUser(connection, userUuid);
        if (!row || String(row.busUuid).toLowerCase() !== String(busUuid).toLowerCase()) {
            return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
        }

        const ym = new Date().toISOString().slice(0, 7);
        const fileUuids = {};
        const docMap = [
            { key: 'biz', field: businessLicenseBase64, name: businessLicenseFileName, cat: 'Business_License', col: 'BIZ_REG_FILE_UUID' },
            { key: 'trans', field: transportationLicenseBase64, name: transportationLicenseFileName, cat: 'Transportation_Business_License', col: 'TRANS_LIC_FILE_UUID' },
            { key: 'ins', field: insurancePolicyBase64, name: insurancePolicyFileName, cat: 'Insurance_Policy', col: 'INS_CERT_FILE_UUID' }
        ];

        await connection.beginTransaction();
        try {
            for (const d of docMap) {
                if (!d.field || typeof d.field !== 'string') continue;
                const parsed = parseDataUrlPayload(d.field, d.name || 'doc');
                if (!parsed) continue;
                const fid = randomUUID();
                const gcsPath = `vehicle_docs/${ym}/${fid}.${parsed.ext}`;
                await insertBusFileAndHist(connection, {
                    busUuidStr: busUuid,
                    fileUuidStr: fid,
                    category: d.cat,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm: parsed.orgName || `doc.${parsed.ext}`,
                    fileExt: parsed.ext,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime
                });
                fileUuids[d.key] = fid;
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET ${d.col} = UUID_TO_BIN(?) WHERE BUS_ID = UUID_TO_BIN(?)`,
                    [fid, busUuid]
                );
            }
            await connection.commit();
            res.json({ message: '서류가 갱신되었습니다.', fileUuids: Object.keys(fileUuids).length ? fileUuids : undefined });
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    } catch (e) {
        console.error('PATCH bus/documents:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 차량 사진 목록 교체
app.patch('/api/driver/bus/photos', async (req, res) => {
    let connection;
    try {
        const { userUuid, busUuid, vehiclePhotos } = req.body;
        if (!userUuid || !busUuid) {
            return res.status(400).json({ error: 'userUuid and busUuid are required' });
        }
        if (!Array.isArray(vehiclePhotos)) {
            return res.status(400).json({ error: 'vehiclePhotos array is required' });
        }
        connection = await pool.getConnection();
        await ensureTbBusDriverVehicleSchema(connection);
        await ensureTbFileMasterTable(connection);
        await ensureTbBusDriverVehicleFileHistTable(connection);
        const row = await fetchBusRowForUser(connection, userUuid);
        if (!row || String(row.busUuid).toLowerCase() !== String(busUuid).toLowerCase()) {
            return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
        }

        const ym = new Date().toISOString().slice(0, 7);
        const outList = [];

        await connection.beginTransaction();
        try {
            const slice = vehiclePhotos.slice(0, 8);
            for (const ph of slice) {
                if (ph && ph.fileUuid && !ph.base64 && !ph.dataUrl) {
                    outList.push(ph.fileUuid);
                    continue;
                }
                const raw = ph.base64 || ph.dataUrl;
                const nm = ph.fileName || ph.name || 'photo';
                if (!raw) continue;
                const dataUrl = typeof raw === 'string' && raw.startsWith('data:')
                    ? raw
                    : `data:image/jpeg;base64,${raw}`;
                const parsed = parseDataUrlPayload(dataUrl, nm);
                if (!parsed) continue;
                const fid = randomUUID();
                const gcsPath = `vehicle_docs/${ym}/bus_photo_${fid}.${parsed.ext}`;
                await insertBusFileAndHist(connection, {
                    busUuidStr: busUuid,
                    fileUuidStr: fid,
                    category: 'BUS_PHOTO',
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm: parsed.orgName || `photo.${parsed.ext}`,
                    fileExt: parsed.ext,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime
                });
                outList.push(fid);
            }
            await connection.execute(
                `UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = UUID_TO_BIN(?) AND USER_UUID = UUID_TO_BIN(?)`,
                [JSON.stringify(outList), busUuid, userUuid]
            );
            await connection.commit();
            res.json({ message: '차량 사진이 갱신되었습니다.', vehiclePhotoFileUuids: outList });
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    } catch (e) {
        console.error('PATCH bus/photos:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 하위 호환 리다이렉트 (구 경로)
app.get('/api/driver/quotation-requests', (req, res) => {
    res.redirect(301, `/api/list-of-traveler-quotations?userUuid=${req.query.uuid || req.query.userUuid || ''}`);
});
app.get('/api/quotation-requests', (req, res) => {
    res.redirect(301, `/api/list-of-traveler-quotations?userUuid=${req.query.uuid || req.query.userUuid || ''}`);
});

/**
 * 여행자 견적 목록 (역경매) — STATUS = 'OPEN' 목록 조회
 * GET /api/list-of-traveler-quotations
 *
 * TB_BID_REQUEST WHERE STATUS = 'OPEN'
 * + TB_BID_WAYPOINT 경유지 건수 LEFT JOIN
 */
app.get('/api/list-of-traveler-quotations', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [rows] = await connection.execute(
            `SELECT
                r.REQUEST_ID              AS requestId,
                r.USER_ID                 AS userId,
                r.BUS_TYPE                AS busType,
                r.BUS_CNT                 AS busCnt,
                r.PASSENGER_CNT           AS passengerCnt,
                r.START_DT                AS startDt,
                r.END_DT                  AS endDt,
                r.START_ADDR              AS startAddr,
                r.END_ADDR                AS endAddr,
                r.ROUND_TRIP_YN           AS roundTripYn,
                r.EST_TOTAL_SERVICE_PRICE AS estTotalServicePrice,
                r.COMMENT                 AS comment,
                r.STATUS                  AS status,
                r.REG_DT                  AS regDt,
                COUNT(w.WAYPOINT_ID)      AS waypointCount
             FROM TB_BID_REQUEST r
             LEFT JOIN TB_BID_WAYPOINT w ON w.REQUEST_ID = r.REQUEST_ID
             WHERE r.STATUS = 'OPEN'
             GROUP BY r.REQUEST_ID
             ORDER BY r.REG_DT DESC`
        );

        if (rows.length === 0) {
            return res.status(200).json({
                total: 2,
                items: [
                    {
                        requestId:            1,
                        userId:               'traveler_demo_01',
                        busType:              '대형 45인승',
                        busCnt:               1,
                        passengerCnt:         45,
                        startDt:              '2024-05-24T09:00:00',
                        endDt:                '2024-05-26T18:00:00',
                        startAddr:            '제주 국제공항',
                        endAddr:              '서귀포 중문 관광단지',
                        roundTripYn:          'N',
                        estTotalServicePrice: 2380000,
                        comment:              '전문 관광 기사 요청',
                        status:               'OPEN',
                        regDt:                '2024-05-20T10:00:00',
                        waypointCount:        2,
                    },
                    {
                        requestId:            2,
                        userId:               'traveler_demo_02',
                        busType:              '우등 28인승',
                        busCnt:               1,
                        passengerCnt:         28,
                        startDt:              '2024-06-01T07:00:00',
                        endDt:                '2024-06-01T21:00:00',
                        startAddr:            '서울 강남역',
                        endAddr:              '부산 해운대',
                        roundTripYn:          'Y',
                        estTotalServicePrice: 1200000,
                        comment:              null,
                        status:               'OPEN',
                        regDt:                '2024-05-28T09:00:00',
                        waypointCount:        0,
                    },
                ],
            });
        }

        res.status(200).json({ total: rows.length, items: rows });
    } catch (error) {
        console.error('list-of-traveler-quotations:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

const PORT = process.env.PORT || 8080;

/**
 * 입찰 요청 테이블 확인·생성
 * TB_BID_REQUEST (소비자 입찰 요청 메인) + TB_BID_WAYPOINT (경유지 상세)
 */
async function ensureBidTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_BID_REQUEST (
            REQUEST_ID              BIGINT        NOT NULL AUTO_INCREMENT COMMENT '요청 고유 ID',
            USER_ID                 VARCHAR(300)  NOT NULL COMMENT '소비자 ID',
            BUS_TYPE                VARCHAR(50)   NOT NULL COMMENT '희망 버스 종류',
            BUS_FUEL_EFF            DECIMAL(5,2)  DEFAULT 4.50 COMMENT '차량 평균 연비 (km/L)',
            PASSENGER_CNT           INT           NOT NULL DEFAULT 1 COMMENT '탑승 인원',
            CALC_BUS_CNT            INT           NOT NULL DEFAULT 1 COMMENT '계산된 필요 차량 대수',
            BUS_CNT                 INT           NOT NULL DEFAULT 1 COMMENT '필요 차량 대수',
            START_DT                DATETIME      NOT NULL COMMENT '출발 일시',
            END_DT                  DATETIME      NOT NULL COMMENT '도착 일시',
            ROUND_TRIP_YN           CHAR(1)       DEFAULT 'N' COMMENT '왕복 여부 (Y/N)',
            START_ADDR              TEXT          NOT NULL COMMENT '출발지 장소명',
            START_DETAIL_ADDR       TEXT          COMMENT '출발지 상세 주소',
            START_LAT               DECIMAL(18,10) DEFAULT NULL COMMENT '출발 위도',
            START_LNG               DECIMAL(18,10) DEFAULT NULL COMMENT '출발 경도',
            END_ADDR                TEXT          NOT NULL COMMENT '도착지 장소명',
            END_DETAIL_ADDR         TEXT          COMMENT '도착지 상세 주소',
            END_LAT                 DECIMAL(18,10) DEFAULT NULL COMMENT '도착 위도',
            END_LNG                 DECIMAL(18,10) DEFAULT NULL COMMENT '도착 경도',
            TOTAL_DISTANCE_KM       DECIMAL(10,2) DEFAULT 0.00 COMMENT '전체 운행 거리(km)',
            TOTAL_DURATION_MIN      INT           DEFAULT 0 COMMENT '예상 소요 시간(분)',
            REST_AREA_CNT           INT           DEFAULT 0 COMMENT '경로상 휴게소 총 개수',
            FUEL_PRICE_PER_L        DECIMAL(10,2) DEFAULT 1600.00 COMMENT '리터당 유가',
            EST_FUEL_COST           DECIMAL(15,2) DEFAULT 0.00 COMMENT '예상 유류 금액',
            TOTAL_TOLL_FEE          DECIMAL(15,2) DEFAULT 0.00 COMMENT '전체 통행료 합계',
            MEAL_PRICE              DECIMAL(15,2) DEFAULT 0.00 COMMENT '기사 식대 소계',
            LODGING_PRICE           DECIMAL(15,2) DEFAULT 0.00 COMMENT '기사 숙박비 소계',
            TIP_PRICE               DECIMAL(15,2) DEFAULT 0.00 COMMENT '기사 팁 소계',
            INCIDENTAL_SUBTOTAL     DECIMAL(15,2) DEFAULT 0.00 COMMENT '부대비용 소계',
            COMMENT                 TEXT          COMMENT '세부 요구사항',
            EST_TOTAL_SERVICE_PRICE DECIMAL(15,2) DEFAULT 0.00 COMMENT '개산 서비스 총액',
            STATUS                  VARCHAR(20)   DEFAULT 'OPEN' COMMENT '상태 코드',
            REG_DT                  DATETIME      DEFAULT CURRENT_TIMESTAMP,
            REG_ID                  VARCHAR(300)  DEFAULT NULL,
            MOD_DT                  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            MOD_ID                  VARCHAR(300)  DEFAULT NULL,
            PRIMARY KEY (REQUEST_ID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='소비자 입찰 요청 메인'
    `);

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_BID_WAYPOINT (
            WAYPOINT_ID          BIGINT        NOT NULL AUTO_INCREMENT,
            REQUEST_ID           BIGINT        NOT NULL COMMENT 'TB_BID_REQUEST 참조 FK',
            WAYPOINT_ADDR        TEXT          NOT NULL COMMENT '경유지 장소명',
            WAYPOINT_DETAIL_ADDR TEXT          COMMENT '경유지 상세 주소',
            LAT                  DECIMAL(18,10) DEFAULT NULL COMMENT '위도',
            LNG                  DECIMAL(18,10) DEFAULT NULL COMMENT '경도',
            SORT_ORDER           INT           NOT NULL COMMENT '방문 순서',
            DIST_FROM_PREV       DECIMAL(10,2) DEFAULT 0.00 COMMENT '이전 지점으로부터 거리(km)',
            TOLL_FROM_PREV       DECIMAL(15,2) DEFAULT 0.00 COMMENT '이전 지점으로부터 통행료',
            DURATION_FROM_PREV   INT           DEFAULT 0 COMMENT '이전 지점으로부터 소요시간(분)',
            REG_DT               DATETIME      DEFAULT CURRENT_TIMESTAMP,
            REG_ID               VARCHAR(300)  DEFAULT NULL,
            PRIMARY KEY (WAYPOINT_ID),
            KEY FK_WAYPOINT_REQ (REQUEST_ID),
            CONSTRAINT FK_WAYPOINT_REQ FOREIGN KEY (REQUEST_ID) REFERENCES TB_BID_REQUEST (REQUEST_ID) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='입찰 요청 경유지 상세'
    `);
}

/**
 * 여행자 견적 요청 상세 조회
 * GET /api/traveler-quote-request-details?requestId=
 * - TB_BID_REQUEST (마스터) + TB_BID_WAYPOINT (경유지) 조회
 * - 데이터 없을 경우 개발용 더미 데이터 반환
 */
app.get('/api/traveler-quote-request-details', async (req, res) => {
    let connection;
    try {
        const { requestId } = req.query;
        if (!requestId) return res.status(400).json({ error: 'requestId가 필요합니다.' });

        connection = await pool.getConnection();

        // 1. 마스터 조회
        const [rows] = await connection.execute(
            `SELECT
                r.REQUEST_ID              AS requestId,
                r.USER_ID                 AS userId,
                r.BUS_TYPE                AS busType,
                r.BUS_FUEL_EFF            AS busFuelEff,
                r.PASSENGER_CNT           AS passengerCnt,
                r.CALC_BUS_CNT            AS calcBusCnt,
                r.BUS_CNT                 AS busCnt,
                r.START_DT                AS startDt,
                r.END_DT                  AS endDt,
                r.ROUND_TRIP_YN           AS roundTripYn,
                r.START_ADDR              AS startAddr,
                r.START_DETAIL_ADDR       AS startDetailAddr,
                r.START_LAT               AS startLat,
                r.START_LNG               AS startLng,
                r.END_ADDR                AS endAddr,
                r.END_DETAIL_ADDR         AS endDetailAddr,
                r.END_LAT                 AS endLat,
                r.END_LNG                 AS endLng,
                r.TOTAL_DISTANCE_KM       AS totalDistanceKm,
                r.TOTAL_DURATION_MIN      AS totalDurationMin,
                r.REST_AREA_CNT           AS restAreaCnt,
                r.FUEL_PRICE_PER_L        AS fuelPricePerL,
                r.EST_FUEL_COST           AS estFuelCost,
                r.TOTAL_TOLL_FEE          AS totalTollFee,
                r.MEAL_PRICE              AS mealPrice,
                r.LODGING_PRICE           AS lodgingPrice,
                r.TIP_PRICE               AS tipPrice,
                r.INCIDENTAL_SUBTOTAL     AS incidentalSubtotal,
                r.COMMENT                 AS comment,
                r.EST_TOTAL_SERVICE_PRICE AS estTotalServicePrice,
                r.STATUS                  AS status,
                r.REG_DT                  AS regDt
             FROM TB_BID_REQUEST r
             WHERE r.REQUEST_ID = ?`,
            [requestId]
        );

        if (rows.length === 0) {
            return res.status(200).json({
                requestId:            Number(requestId),
                userId:               'traveler_demo_01',
                busType:              '대형 45인승',
                busFuelEff:           4.5,
                passengerCnt:         45,
                calcBusCnt:           1,
                busCnt:               1,
                startDt:              '2024-05-24T09:00:00',
                endDt:                '2024-05-26T18:00:00',
                roundTripYn:          'N',
                startAddr:            '제주 국제공항',
                startDetailAddr:      null,
                startLat:             33.5112,
                startLng:             126.4921,
                endAddr:              '서귀포 중문 관광단지',
                endDetailAddr:        null,
                endLat:               33.2534,
                endLng:               126.4123,
                totalDistanceKm:      98.5,
                totalDurationMin:     150,
                restAreaCnt:          2,
                fuelPricePerL:        1600,
                estFuelCost:          35000,
                totalTollFee:         12000,
                mealPrice:            30000,
                lodgingPrice:         80000,
                tipPrice:             0,
                incidentalSubtotal:   110000,
                comment:              '전문 관광 기사 요청, 영어 가능 선호',
                estTotalServicePrice: 2380000,
                status:               'OPEN',
                regDt:                '2024-05-20T10:00:00',
                waypoints: [
                    { waypointId: 1, waypointAddr: '성산일출봉', waypointDetailAddr: null, lat: 33.4583, lng: 126.9422, sortOrder: 1, distFromPrev: 45.2, tollFromPrev: 0, durationFromPrev: 60 },
                    { waypointId: 2, waypointAddr: '협재 해수욕장', waypointDetailAddr: null, lat: 33.3945, lng: 126.2393, sortOrder: 2, distFromPrev: 53.3, tollFromPrev: 0, durationFromPrev: 75 },
                ],
                priceGuide: { avgBid: null },
            });
        }

        const master = rows[0];

        // 2. 경유지 조회
        const [waypointRows] = await connection.execute(
            `SELECT
                w.WAYPOINT_ID          AS waypointId,
                w.WAYPOINT_ADDR        AS waypointAddr,
                w.WAYPOINT_DETAIL_ADDR AS waypointDetailAddr,
                w.LAT                  AS lat,
                w.LNG                  AS lng,
                w.SORT_ORDER           AS sortOrder,
                w.DIST_FROM_PREV       AS distFromPrev,
                w.TOLL_FROM_PREV       AS tollFromPrev,
                w.DURATION_FROM_PREV   AS durationFromPrev
             FROM TB_BID_WAYPOINT w
             WHERE w.REQUEST_ID = ?
             ORDER BY w.SORT_ORDER`,
            [requestId]
        );

        // 3. 가격 가이드 (TODO: TB_BID 낙찰 테이블 연동 시 MAX/AVG 집계로 교체)
        const priceGuide = { avgBid: null };

        res.status(200).json({
            ...master,
            waypoints: waypointRows,
            priceGuide,
        });
    } catch (error) {
        console.error('traveler-quote-request-details:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});



(async function startServer() {
    // ── 서버 시작 시 DB 스키마 마이그레이션 (테이블·컬럼 자동 생성·추가) ──
    let connection;
    try {
        connection = await pool.getConnection();

        await ensureTbUserTable(connection);
        console.log('✅ TB_USER 확인 완료');

        await ensureDriverInfoTable(connection);
        console.log('✅ TB_DRIVER_INFO 확인 완료');

        await ensureDriverInfoLicenseSerialColumn(connection);
        await ensureDriverInfoQualVerifyColumns(connection);
        console.log('✅ TB_DRIVER_INFO 마이그레이션 완료 (LICENSE_SERIAL_NO, QUAL_CERT_VERIFY_*)');

        await ensureTbFileMasterTable(connection);
        console.log('✅ TB_FILE_MASTER 확인 완료');

        await ensureTbBusDriverVehicleSchema(connection);
        console.log('✅ TB_BUS_DRIVER_VEHICLE 확인 완료');

        await ensureTbBusDriverVehicleFileHistTable(connection);
        console.log('✅ TB_BUS_DRIVER_VEHICLE_FILE_HIST 확인 완료');

        await ensureTbCommonCodeTable(connection);
        console.log('✅ TB_COMMON_CODE 확인 완료');

        await ensureBidTables(connection);
        console.log('✅ TB_BID_REQUEST / TB_BID_WAYPOINT 확인 완료');

    } catch (e) {
        console.error('⚠️ DB 부트스트랩 실패 (DB 연결·권한 확인):', e.message);
    } finally {
        if (connection) connection.release();
    }

    app.listen(PORT, () => {
        console.log(`🚀 busTaams REST API Server is running beautifully on http://localhost:${PORT}`);
    });
})();
