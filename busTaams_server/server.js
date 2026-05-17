/**
 * busTaams API Server
 * 2026-05-06 Merged: Clean Modular Routing + Live Chat & New Business Features
 */
require('./loadEnv');
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const { pool, getNextId } = require('./db');
const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('./crypto');

/**
 * 가변 길이 0-패딩 숫자 ID 생성기
 */
function generateNextNumericId(currentMax, length = 10) {
    const nextVal = (parseInt(currentMax || 0, 10)) + 1;
    return String(nextVal).padStart(length, '0');
}

const {
    runDriverVerificationsForProfileSetup,
    isQualCertUnchanged,
} = require('./driverVerification');

const { canonicalFileMasterFileId, fileIdMatchCandidates, custIdMatchCandidates } = require('./lib/bustaamsIds');
const { parseDataUrlPayload, orgFileNmAndExt, joinOrgFileDisplayName } = require('./lib/bt_common_utils');
const {
    DRIVER_FEE_POLICY_DTL_CDS,
    DRIVER_FEE_POLICY_DTL_CDS_SQL_IN,
    normalizeDriverFeePolicyDtlCd,
    isCanonicalDriverFeePolicyDtlCd,
    sqlFeePolicyCntJoinOnP,
} = require('./lib/feePolicyDtl');

const createCommonLiveChatRouter = require('./routes/commonLiveChat');
const createLiveChatTravelerRouter = require('./routes/liveChatTraveler');
const createUserDeviceTokenRouter = require('./routes/userDeviceToken');
const { 
    buildPostLoginUserDto, 
    fetchCancelManageForUser, 
    fetchSubscriptionForDriver 
} = require('./lib/loginPayload');
const createAuthRouter = require('./routes/bt_auth_api');
const createAuctionTripRouter = require('./routes/bt_auction_trip_api');

const {
    canAccessDriverCancelProofFile,
    resolveGcsObjectKey,
} = require('./lib/driverCancelProofAccess');

const { BILLING_SUBSCRIPTION_ID } = require('./lib/billingSubscriptionId');
const { buildBillingSubscriptionPayload } = require('./lib/billingSubscriptionPayload');
const { applyMomMemberAfterBid } = require('./lib/driverBidMomMember');

const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 8080;
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// --- 1. 환경 설정 및 초기화 ---

// Global Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url, body, query } = req;
    console.log(`\n🚀 [REQ] ${method} ${url}`);
    if (query && Object.keys(query).length) console.log(`   🔍 Query:`, JSON.stringify(query));
    if (body && Object.keys(body).length) {
        const safeBody = { ...body };
        if (safeBody.password) safeBody.password = '********';
        console.log(`   📦 Body:`, JSON.stringify(safeBody));
    }
    next();
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// 업로드 디렉토리 설정
const profileUploadDir = path.join(__dirname, 'uploads', 'profiles');
try {
    if (!fs.existsSync(profileUploadDir)){
        fs.mkdirSync(profileUploadDir, { recursive: true });
    }
} catch (e) {
    console.warn('⚠️ Could not create profile upload directory, falling back to temp.');
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

/** `verify-sms` 성공 번호 보관 (회원가입/프로필설정 공유) */
const smsVerifiedPhoneStore = new Map();
const SMS_VERIFIED_TTL_MS = 15 * 60 * 1000;

// --- 2. 라우터 등록 ---
console.log('>>> Registering routers...');

// Helper for safe registration
function safeUse(path, modulePath) {
    try {
        app.use(path, require(modulePath));
    } catch (err) {
        console.error(`❌ Failed to register ${path}:`, err.message);
    }
}

// [V2/App Focus]
safeUse('/api/app/auth', './routes/appAuth');
safeUse('/api/app/customer', './routes/appCustomer');
safeUse('/api/app/auction', './routes/appAuction');
safeUse('/api/app/driver', './routes/appDriver');
safeUse('/api/app/chat', './routes/appChat');

// [V1/Shared]
safeUse('/api/customer', './routes/customer');
safeUse('/api/bid', './routes/bid');
safeUse('/api/common', './routes/common');

// Auth Router 설정
const authRouter = createAuthRouter(pool, admin, smsVerifiedPhoneStore, bucket, bucketName);
app.use('/api/auth', authRouter);
app.use('/api/users', authRouter); // 기존 호환용

// Auction/Trip Router 설정
const auctionTripRouter = createAuctionTripRouter(pool, admin, bucket, bucketName);
app.use('/api/auction', auctionTripRouter);
app.use('/api/traveler-quote-request-details', auctionTripRouter);

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
    require('./routes/notification')(pool, app);
    console.log('✅ Function routers registered.');
} catch (err) {
    console.error('❌ Function Router Error:', err.message);
}

// [DEBUG] 서버 생존 확인용 테스트 라우트
app.get('/api/debug-test', (req, res) => {
    res.json({ message: 'Server is ALIVE!', port: PORT, time: new Date().toLocaleString() });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', serverTime: new Date() }));





function formatDateYmd(v) {
    if (v == null || v === undefined || v === '') return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 진위 검증 생략 비교용 — TB_DRIVER_DETAIL 기존 행(면허·자격 컬럼, 스키마에 있는 컬럼만 SELECT) */
async function fetchDriverDetailLicenseRow(connection, custId) {
    const param = String(custId ?? '').trim();
    if (!param) return null;
    const ddMap = await driverDetailColumnMap(connection);
    const custK = ddCol(ddMap, 'CUST_ID');
    if (!custK) return null;
    const parts = [];
    for (const n of [
        'LICENSE_TYPE',
        'LICENSE_NO',
        'LICENSE_SERIAL_NO',
        'LICENSE_ISSUE_DT',
        'LICENSE_EXPIRY_DT',
        'QUAL_CERT_NO',
        'BIRTH_YMD',
        'SEX'
    ]) {
        const c = ddCol(ddMap, n);
        if (c) parts.push(`${c} AS ${n}`);
    }
    if (ddHas(ddMap, 'QUAL_CERT_VERIFY_STATUS')) {
        const s = ddCol(ddMap, 'QUAL_CERT_VERIFY_STATUS');
        parts.push(`IFNULL(${s}, 'UNVERIFIED') AS QUAL_CERT_VERIFY_STATUS`);
    }
    if (!parts.length) return null;
    const sql = `SELECT ${parts.join(', ')} FROM TB_DRIVER_DETAIL WHERE ${custK} = ? LIMIT 1`;
    try {
        const [rows] = await connection.execute(sql, [param]);
        return rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') return null;
        throw e;
    }
}

/** 프로필 저장 시 자격번호·생년 분기 — 실제 테이블에 있는 컬럼만 조회(DDL 없음) */
async function fetchDriverDetailQualBirthRow(connection, custId) {
    const param = String(custId ?? '').trim();
    if (!param) return null;
    const ddMap = await driverDetailColumnMap(connection);
    const custK = ddCol(ddMap, 'CUST_ID');
    if (!custK) return null;
    const parts = [];
    const qn = ddCol(ddMap, 'QUAL_CERT_NO');
    if (qn) parts.push(`${qn} AS QUAL_CERT_NO`);
    if (ddHas(ddMap, 'QUAL_CERT_VERIFY_STATUS')) {
        const s = ddCol(ddMap, 'QUAL_CERT_VERIFY_STATUS');
        parts.push(`IFNULL(${s}, 'UNVERIFIED') AS QUAL_CERT_VERIFY_STATUS`);
    }
    const by = ddCol(ddMap, 'BIRTH_YMD');
    if (by) parts.push(`${by} AS BIRTH_YMD`);
    const sx = ddCol(ddMap, 'SEX');
    if (sx) parts.push(`${sx} AS SEX`);
    if (!parts.length) return null;
    const sql = `SELECT ${parts.join(', ')} FROM TB_DRIVER_DETAIL WHERE ${custK} = ? LIMIT 1`;
    const [rows] = await connection.execute(sql, [param]);
    return rows[0] || null;
}

/** GET profile-setup용 — 존재하는 컬럼만 조회 */
async function selectDriverDetailForProfileSetup(connection, custId) {
    const param = String(custId ?? '').trim();
    if (!param) return null;
    const ddMap = await driverDetailColumnMap(connection);
    const custK = ddCol(ddMap, 'CUST_ID');
    if (!custK) return null;
    const parts = [];
    const pushBare = (u) => {
        const c = ddCol(ddMap, u);
        if (c) parts.push(`${c} AS ${u}`);
    };
    pushBare('ZIPCODE');
    pushBare('ADDRESS');
    pushBare('DETAIL_ADDRESS');
    pushBare('ADDR_TYPE');
    pushBare('ADDR_NAME');
    pushBare('BIRTH_YMD');
    pushBare('SEX');
    const si = ddCol(ddMap, 'SELF_INTRO');
    if (si) parts.push(`COALESCE(${si}, '') AS SELF_INTRO`);
    pushBare('LICENSE_TYPE');
    pushBare('LICENSE_NO');
    pushBare('LICENSE_SERIAL_NO');
    pushBare('LICENSE_ISSUE_DT');
    pushBare('LICENSE_EXPIRY_DT');
    pushBare('QUAL_CERT_NO');
    if (ddHas(ddMap, 'QUAL_CERT_VERIFY_STATUS')) {
        const s = ddCol(ddMap, 'QUAL_CERT_VERIFY_STATUS');
        parts.push(`IFNULL(${s}, 'UNVERIFIED') AS QUAL_CERT_VERIFY_STATUS`);
    }
    pushBare('QUAL_CERT_VERIFY_DT');
    pushBare('FEE_POLICY');
    if (!parts.length) return null;
    const sql = `SELECT ${parts.join(', ')} FROM TB_DRIVER_DETAIL WHERE ${custK} = ? LIMIT 1`;
    const [dr] = await connection.execute(sql, [param]);
    return dr[0] || null;
}

/** TB_DRIVER_DETAIL / TB_MOM_MEMBER 행에서 회원등급 원문 추출 (mysql2·ENUM·버퍼 대응) */
function pickFeePolicyRawFromRow(row) {
    if (!row) return '';
    const v =
        row.FEE_POLICY !== undefined && row.FEE_POLICY !== null && row.FEE_POLICY !== ''
            ? row.FEE_POLICY
            : row.fee_policy;
    if (v == null || v === '') return '';
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return v.toString('utf8').trim();
    return String(v).trim();
}

/**
 * 프로필 모달 회원등급: TB_DRIVER_DETAIL 우선, 없으면 TB_MOM_MEMBER 최신 월 행
 */
async function resolveDriverProfileFeePolicy(connection, resolvedCustId, detailRow) {
    const fromDetail = pickFeePolicyRawFromRow(detailRow);
    if (fromDetail) return normalizeDriverFeePolicyDtlCd(fromDetail);
    const custCands = custIdMatchCandidates(resolvedCustId);
    if (!custCands.length || !connection) return '';
    try {
        const inPh = custCands.map(() => '?').join(', ');
        const [mr] = await connection.execute(
            `SELECT FEE_POLICY FROM TB_MOM_MEMBER WHERE TRIM(CUST_ID) IN (${inPh}) ORDER BY YYYYMM DESC LIMIT 1`,
            custCands
        );
        return normalizeDriverFeePolicyDtlCd(pickFeePolicyRawFromRow(mr[0]));
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
            return '';
        }
        throw e;
    }
}

/** TB_COMMON_CODE DDL — 로컬 전용. 운영/Cloud SQL 앱 사용자는 보통 CREATE 권한이 없음. */
async function ensureTbCommonCodeTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS TB_COMMON_CODE (
            GRP_CD varchar(30) NOT NULL COMMENT '그룹 코드 (예: USER_STAT, BUS_TYPE)',
            DTL_CD varchar(30) NOT NULL COMMENT '상세 코드 (예: ACTIVE, PREMIUM_28)',
            CD_NM_KO varchar(100) NOT NULL COMMENT '코드 한글명',
            CD_NM_EN varchar(100) DEFAULT NULL COMMENT '코드 영문명',
            CD_FNUM decimal(13,3) DEFAULT 0.000 COMMENT '코드 시작값에 해당하는 참고숫자',
            CD_TNUM decimal(13,3) DEFAULT 0.000 COMMENT '코드 종료값에 해당하는 참고숫자',
            USE_YN enum('Y','N') DEFAULT 'Y' COMMENT '사용 여부',
            DISP_ORD int DEFAULT 0 COMMENT '출력 순서',
            CD_DESC text COMMENT '코드 상세 설명',
            REG_DT datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
            REG_ID varchar(30) DEFAULT NULL COMMENT '등록자 ID',
            MOD_DT datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
            MOD_ID varchar(30) DEFAULT NULL COMMENT '수정자 ID',
            PRIMARY KEY (GRP_CD, DTL_CD)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='시스템 공통 코드 관리 테이블'
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







const BUS_DOC_FILE_CATEGORY = {
    BIZ_REG: 'BIZ_REG',
    TRANSPORT_PERMIT: 'TRANSPORT_PERMIT',
    INSURANCE: 'INSURANCE',
};
const BUS_PHOTO_FILE_CATEGORY = 'VEHICLE_PHOTO';

/** GCS 업로드 + `TB_FILE_MASTER` 행 추가 (`BusTaams_Project 테이블 설계.md` 범위) */
async function insertBusFileMaster(connection, {
    fileId, category, gcsPath, buffer, orgFileNm, fileExt, fileSize, contentType
}) {
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(buffer, { metadata: { contentType: contentType || 'application/octet-stream' }, resumable: false });
    await connection.execute(
        `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [fileId, category, bucketName, gcsPath, orgFileNm, fileExt, fileSize]
    );
}


async function fetchBusRowForUser(connection, custId) {
    const [rows] = await connection.execute(
        `SELECT BUS_ID AS busId, CUST_ID AS custId,
                VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS,
                DATE_FORMAT(LAST_INSPECT_DT, '%Y-%m-%d') AS lastInspectDt,
                DATE_FORMAT(INSURANCE_EXP_DT, '%Y-%m-%d') AS insuranceExpDt,
                BIZ_REG_FILE_ID AS bizRegId,
                TRANS_LIC_FILE_ID AS transLicId,
                INS_CERT_FILE_ID AS insCertId,
                VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ? LIMIT 1`,
        [custId]
    );
    return rows[0] || null;
}

async function fileMetaById(connection, fileId) {
    if (!fileId) return null;
    const [rows] = await connection.execute(
        `SELECT FILE_ID AS fileId, ORG_FILE_NM, FILE_EXT, FILE_SIZE
         FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
        [fileId]
    );
    return rows[0] || null;
}

/** 기사 소유 차량에 연결된 파일만 스트리밍 허용 */
/** `TB_DRIVER_DOCS.DOC_TYPE` — 버스운전 자격증(운송종사) 사본 행. DDL ENUM:
 *  LICENSE, QUALIFICATION, APTITUDE, BIZ_REG, TRANSPORT_PERMIT, INSURANCE, DRIVER_PHOTO, VEHICLE_PHOTO,
 *  TERMS_OF_USE, PRIVACY_CONSENT, MARKETING_CONSENT, DRIVER_CONTRACT, TRAVELER_CONTRACT,
 *  PARTNER_CONTRACT, TERMS_INTEGRATED
 */
const QUALIFICATION_DOC_TYPE = 'QUALIFICATION';
const DRIVER_QUAL_GCS_BUCKET = 'bustaams-secure-data';

async function tableColumnExists(connection, tableName, columnName) {
    const [rows] = await connection.execute(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND LOWER(TABLE_NAME) = LOWER(?)
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );
    return rows.length > 0;
}

/** INFORMATION_SCHEMA 기준 실제 컬럼명 — 대문자 키 → DDL 원본 이름(대소문자 유지) */
async function driverDetailColumnMap(connection) {
    const [rows] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND LOWER(TABLE_NAME) = 'tb_driver_detail'`
    );
    const map = new Map();
    for (const r of rows) {
        const raw = String(r.COLUMN_NAME ?? '').trim();
        if (!raw) continue;
        map.set(raw.toUpperCase(), raw);
    }
    return map;
}

function qiMysqlIdent(raw) {
    return '`' + String(raw).replace(/`/g, '``') + '`';
}

function ddHas(ddMap, upperName) {
    return ddMap.has(String(upperName || '').toUpperCase());
}

function ddCol(ddMap, upperName) {
    const raw = ddMap.get(String(upperName || '').toUpperCase());
    return raw != null ? qiMysqlIdent(raw) : null;
}

/**
 * TB_DRIVER_DETAIL 프로필 UPSERT — 컬럼명은 스키마 실제 표기 사용(Linux 대소문자 이슈 방지).
 * @param {{ verifyDtCoalesce?: boolean }} opts — QUAL_CERT_VERIFY_DT 만료 시 COALESCE(VALUES, 기존값)
 */
async function executeDriverDetailProfileUpsert(connection, ddMap, keysUpper, valueByKey, opts = {}) {
    const cols = keysUpper.filter((k) => ddHas(ddMap, k));
    if (!cols.length || !cols.includes('CUST_ID')) {
        throw new Error('TB_DRIVER_DETAIL에 CUST_ID(또는 동일 PK) 컬럼이 없습니다.');
    }
    const insertSqlCols = cols.map((k) => ddCol(ddMap, k)).join(', ');
    const ph = cols.map(() => '?').join(', ');
    const updateCols = cols.filter((k) => {
        if (k === 'CUST_ID') return false;
        if (opts.verifyDtCoalesce && k === 'QUAL_CERT_VERIFY_DT') return false;
        return true;
    });
    const updates = updateCols.map((k) => `${ddCol(ddMap, k)} = VALUES(${ddCol(ddMap, k)})`);
    if (opts.verifyDtCoalesce && ddHas(ddMap, 'QUAL_CERT_VERIFY_DT')) {
        const qcd = ddCol(ddMap, 'QUAL_CERT_VERIFY_DT');
        updates.push(`${qcd} = COALESCE(VALUES(${qcd}), ${qcd})`);
    }
    if (ddHas(ddMap, 'MOD_DT')) updates.push(`${ddCol(ddMap, 'MOD_DT')} = NOW()`);
    const sql = `
                    INSERT INTO TB_DRIVER_DETAIL (${insertSqlCols})
                    VALUES (${ph})
                    ON DUPLICATE KEY UPDATE
                        ${updates.join(',\n                        ')}
                    `;
    const vals = cols.map((k) => valueByKey[k]);
    await connection.execute(sql, vals);
}

function formatCommonCodeFnumForLabel(v) {
    if (v == null || v === '') return '-';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v).trim();
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(n);
}

/** TB_DRIVER_DOCS — 운수종사 자격 사본: fileId = LPAD(DOC_TYPE_SEQ,20,\'0\') */
async function canAccessQualCertFile(connection, custId, fileId) {
    if (!custId || fileId === undefined || fileId === null) return false;
    const fid = String(fileId).trim();
    const [rows] = await connection.execute(
        `SELECT 1 FROM TB_DRIVER_DOCS
         WHERE CUST_ID = ? AND DOC_TYPE = ? AND LPAD(DOC_TYPE_SEQ, 20, '0') = ?
         LIMIT 1`,
        [custId, QUALIFICATION_DOC_TYPE, fid]
    );
    return rows.length > 0;
}

async function fetchQualCertDocRow(connection, custId, fileId) {
    const fid = String(fileId).trim();
    const [rows] = await connection.execute(
        `SELECT GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE, REG_DT
         FROM TB_DRIVER_DOCS
         WHERE CUST_ID = ? AND DOC_TYPE = ? AND LPAD(DOC_TYPE_SEQ, 20, '0') = ?
         LIMIT 1`,
        [custId, QUALIFICATION_DOC_TYPE, fid]
    );
    return rows[0] || null;
}

/**
 * TB_FILE_MASTER.GCS_PATH 정본은 버킷 **밖의** 객체 키 단독값.
 * 레거시: gs:// 또는 https://storage… URL 통째 저장, 선행 '/', 이스케이프 등 보정.
 * @returns {string} 버킷에 넘길 객체 키 (빈 문자열이면 무효)
 */
function normalizeGcsObjectPath(pathRaw) {
    if (pathRaw == null || pathRaw === undefined) return '';
    let p = Buffer.isBuffer(pathRaw) ? pathRaw.toString('utf8') : String(pathRaw);
    p = p.trim().replace(/\r?\n/g, '').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
    if (!p) return '';
    p = p.replace(/\\/g, '/');

    const gsMatch = /^gs:\/\/[^/]+\/(.+)$/i.exec(p);
    if (gsMatch) return gsMatch[1].replace(/^\/+/, '');

    const httpsMatch =
        /^https?:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/i.exec(p)
        || /^https?:\/\/storage\.cloud\.google\.com\/[^/]+\/(.+)$/i.exec(p);
    if (httpsMatch) {
        try {
            return decodeURIComponent(httpsMatch[1].replace(/^\/+/, ''));
        } catch (_) {
            return httpsMatch[1].replace(/^\/+/, '');
        }
    }

    p = p.replace(/^\/+/, '');
    try {
        if (/%[0-9A-Fa-f]{2}/.test(p)) {
            const d = decodeURIComponent(p);
            if (d) return d.replace(/^\/+/, '');
        }
    } catch (_) {
        /* keep p */
    }
    return p;
}

/** GCS exists() 순으로 시도할 객체 키 후보 (전체 URL 문자열은 객체 키가 아니므로 제외) */
function gcsObjectPathCandidates(pathRaw) {
    const raw = Buffer.isBuffer(pathRaw) ? pathRaw.toString('utf8') : pathRaw != null ? String(pathRaw) : '';
    const trimmed = raw.trim().replace(/\r?\n/g, '');
    const norm = normalizeGcsObjectPath(pathRaw);
    const baseList = [norm, trimmed.replace(/^\/+/, ''), norm ? norm.replace(/^\/+/, '') : ''].filter(Boolean);
    return [...new Set(baseList.filter((c) => c && !/^https?:\/\//i.test(c) && !/^gs:\/\//i.test(c)))];
}

/** 프로필 사진: 객체 키에 확장자 없이 저장된 레거시·FILE_EXT 조합 시도 */
function expandGcsKeysWithImageExt(pathCandidates, fileExt) {
    const ext = String(fileExt || '').replace(/^\./, '').trim().toLowerCase();
    const fallbacks = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const out = [];
    for (const key of pathCandidates) {
        if (!key || /^https?:\/\//i.test(key)) continue;
        out.push(key);
        if (/\.(jpe?g|png|webp|gif)$/i.test(key)) continue;
        const exts = ext ? [...new Set([ext, ...fallbacks])] : fallbacks;
        for (const e of exts) {
            if (e) out.push(`${key}.${e}`);
        }
    }
    return [...new Set(out)];
}

function bucketForName(name) {
    const n = (name || '').trim() || bucketName;
    return n === bucketName ? bucket : storage.bucket(n);
}

async function canAccessBusFile(connection, custId, fileId) {
    const fid = String(fileId ?? '').trim();
    if (!fid) return false;
    const [buses] = await connection.execute(
        `SELECT BUS_ID, BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID, VEHICLE_PHOTOS_JSON
         FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?`,
        [custId]
    );
    for (const b of buses) {
        if (
            String(b.BIZ_REG_FILE_ID ?? '').trim() === fid ||
            String(b.TRANS_LIC_FILE_ID ?? '').trim() === fid ||
            String(b.INS_CERT_FILE_ID ?? '').trim() === fid
        ) {
            return true;
        }
        let photos = b.VEHICLE_PHOTOS_JSON;
        if (typeof photos === 'string') {
            try { photos = JSON.parse(photos); } catch (e) { photos = []; }
        }
        if (Array.isArray(photos) && photos.some((p) => String(p ?? '').trim() === fid)) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// REST APIs
// ---------------------------------------------------------------------------


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
 
// 로그인 API (POST /api/auth/login 또는 /api/users/login - 팀원 호환성 유지용 별칭)

// 사용자 통합 정보 수정 API (이메일, 휴대폰, 비밀번호)
app.put('/api/user/profile', async (req, res) => {
    try {
        const { custId, email, phoneNo, currentPassword, newPassword, photoBase64, photoName } = req.body;
        console.log(`\n[STEP 1] Update Request Received: CUST_ID=${custId}, hasPhoto=${!!photoBase64}`);

        if (!custId || !currentPassword) {
            console.log('[STEP 2] Validation Failed: Missing custId or currentPassword');
            return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
        }

        // 1. 사용자 확인
        console.log('[STEP 3] Fetching user from DB...');
        let [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ?', [custId]);
        if (userRows.length === 0) {
            console.log('[STEP 3-ALT] Trying USER_ID search...');
            [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [custId]);
        }
        
        if (userRows.length === 0) {
            console.log('[STEP 4] User Not Found');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = userRows[0];
        console.log(`[STEP 5] Comparing Password for ${user.USER_NM}...`);
        const isMatch = await bcrypt.compare(currentPassword, user.PASSWORD);
        if (!isMatch) {
            console.log('[STEP 6] Password Mismatch');
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            let newProfileFileId = user.PROFILE_FILE_ID;

            // [STEP 6.1] 신규 프로필 사진 처리
            if (photoBase64) {
                const [maxFileRows] = await connection.execute("SELECT MAX(FILE_ID) as maxFileId FROM TB_FILE_MASTER WHERE FILE_ID REGEXP '^[0-9]+$'");
                const nextFileId = generateNextNumericId(maxFileRows[0].maxFileId || '0', 20);
                newProfileFileId = nextFileId;

                const photoData = photoBase64.replace(/^data:image\/\w+;base64,/, "");
                const photoBuffer = Buffer.from(photoData, 'base64');
                const photoMimeMatch = photoBase64.match(/^data:image\/([^;]+);base64,/);
                const rawMimeSub = photoMimeMatch?.[1] || 'png';
                const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
                const parsedLike = {
                    buffer: photoBuffer,
                    ext: rawMimeSub,
                    mime: `image/${rawMimeSub}`,
                    orgName: String(photoName || `profile_${nextFileId}`).replace(/[^a-zA-Z0-9._-가-힣]/g, '_'),
                };
                const { orgFileNm, fileExt } = orgFileNmAndExt(photoName, parsedLike);
                const photoFileName = `${nextFileId}.${fileExt}`;
                const photoGcsPathForDB = `https://storage.googleapis.com/${bucketName}/profiles/${photoFileName}`;
                const photoActualGcsPath = `profiles/${photoFileName}`;

                const photoGcsFile = bucket.file(photoActualGcsPath);
                await photoGcsFile.save(photoBuffer, { metadata: { contentType: `image/${rawMimeSub}` }, resumable: false });

                await connection.execute(`
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (?, 'PROFILE', ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                `, [nextFileId, bucketName, photoGcsPathForDB, orgFileNm, fileExt, photoBuffer.length, custId, custId]);
            }

            // 2. 동적 쿼리 생성
            console.log('[STEP 7] Building Dynamic Query...');
            const updateParts = [];
            const params = [];

            if (email !== undefined) { updateParts.push('EMAIL = ?'); params.push(email); }
            if (phoneNo !== undefined) { updateParts.push('HP_NO = ?'); params.push(phoneNo.replace(/-/g, '')); }

            if (newPassword && String(newPassword).trim() !== '') {
                console.log('[STEP 8] Hashing New Password...');
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                updateParts.push('PASSWORD = ?');
                params.push(hashedPassword);
            }

            if (photoBase64) {
                updateParts.push('PROFILE_FILE_ID = ?');
                params.push(newProfileFileId);
            }

            if (updateParts.length > 0) {
                updateParts.push('MOD_DT = NOW()');
                updateParts.push('MOD_ID = ?');
                params.push(custId);

                const sql = `UPDATE TB_USER SET ${updateParts.join(', ')} WHERE CUST_ID = ?`;
                params.push(custId);

                console.log('[STEP 9] Executing Update...');
                await connection.execute(sql, params);
            }

            await connection.commit();
            console.log('[STEP 10] Update Success');
            res.status(200).json({ 
                message: '회원 정보가 성공적으로 수정되었습니다.',
                profileFileId: newProfileFileId 
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ [UPDATE_ERROR]', error);
        res.status(500).json({ error: '정보 수정 중 서버 오류가 발생했습니다.', details: error.message });
    }
});

// 비밀번호 변경 API
app.put('/api/user/password', async (req, res) => {
    try {
        const { custId, currentPassword, newPassword, confirmPassword } = req.body;
        if (!custId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: '필수 비밀번호 정보가 누락되었습니다.' });
        }

        // 1. 현재 사용자 조회 (현재 비밀번호 가져오기)
        const [rows] = await pool.execute('SELECT PASSWORD FROM TB_USER WHERE CUST_ID = ?', [custId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];

        // 2. 현재 비밀번호 검증 (최우선 순위)
        const isMatch = await bcrypt.compare(currentPassword, user.PASSWORD);
        if (!isMatch) {
            return res.status(401).json({ error: '현재 비밀번호가 정확하지 않습니다.' });
        }

        // 3. 새 비밀번호 일치 여부 (현재 비밀번호가 맞을 경우에만 체크)
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: '새 비밀번호와 확인 비밀번호가 서로 일치하지 않습니다.' });
        }

        // 3. 새 비밀번호 해싱 및 업데이트
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = 'UPDATE TB_USER SET PASSWORD = ? WHERE CUST_ID = ?';
        await pool.execute(updateQuery, [hashedPassword, custId]);

        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ error: '비밀번호 변경 중 서버 오류가 발생했습니다.' });
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
            const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
            let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';

            if (profileImgUrl) {
                const profileFileId = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = profileFileId;

                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID
                    ) VALUES (?, 'PROFILE_IMG', ?, ?, ?, 'png', 0, NOW(), ?)
                `;
                const profileGcsPath = profileImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [profileFileId, bucketName, profileGcsPath, 'profile', userId]); // ORG_FILE_NM 확장자 제외
            }

            if (licenseImgUrl) {
                const licenseFileId = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = licenseFileId;

                const fileQuery = `
                    INSERT INTO TB_FILE_MASTER (
                        FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                        ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID
                    ) VALUES (?, 'DRIVER_LICENSE', ?, ?, ?, 'png', 0, NOW(), ?)
                `;
                const licenseGcsPath = licenseImgUrl.split(`${bucketName}/`)[1];
                await connection.execute(fileQuery, [licenseFileId, bucketName, licenseGcsPath, 'license', userId]);
            }

            const legCands = custIdMatchCandidates(String(userId).trim());
            const legPh = legCands.map(() => '?').join(', ');
            const [uLeg] = await connection.execute(
                `SELECT CUST_ID FROM TB_USER WHERE TRIM(CUST_ID) IN (${legPh}) LIMIT 1`,
                legCands
            );
            const u0 = uLeg[0];
            const ddValLeg = String(u0?.CUST_ID ?? '').trim();
            if (!ddValLeg) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'TB_USER 에서 기사를 찾을 수 없습니다.' });
            }

            const query = `
                INSERT INTO TB_DRIVER_DETAIL (
                    CUST_ID, LICENSE_NO, CERT_PHOTO_URL, ACCIDENT_FREE_DOC,
                    MEMBERSHIP_TYPE, SELF_INTRO, PROFILE_IMG_URL, REG_ID, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    LICENSE_NO = VALUES(LICENSE_NO),
                    CERT_PHOTO_URL = IF(VALUES(CERT_PHOTO_URL) != '', VALUES(CERT_PHOTO_URL), CERT_PHOTO_URL),
                    ACCIDENT_FREE_DOC = VALUES(ACCIDENT_FREE_DOC),
                    MEMBERSHIP_TYPE = VALUES(MEMBERSHIP_TYPE),
                    SELF_INTRO = VALUES(SELF_INTRO),
                    PROFILE_IMG_URL = IF(VALUES(PROFILE_IMG_URL) != '', VALUES(PROFILE_IMG_URL), PROFILE_IMG_URL),
                    MOD_ID = VALUES(MOD_ID)
            `;

            const params = [
                ddValLeg,
                licenseNo || '',
                licenseImgUrl, 
                accidentFreeDoc || '',
                membershipType || 'NORMAL', 
                bioDesc || '', 
                profileImgUrl,
                userId, // REG_ID (여기서 userId는 프론트엔드에서 넘어온 CUST_ID)
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
    let connection;
    try {
        const custIdParam = req.query.custId != null ? String(req.query.custId).trim() : '';
        if (!custIdParam) {
            return res.status(400).json({ error: 'custId is required' });
        }

        const custCands = custIdMatchCandidates(custIdParam);
        if (!custCands.length) return res.status(400).json({ error: 'custId is required' });

        const custIn = custCands.map(() => '?').join(', ');
        const [uRows] = await pool.execute(
            `SELECT CUST_ID, USER_ID, USER_NM, HP_NO, PROFILE_FILE_ID, RESIDENT_NO_ENC FROM TB_USER
             WHERE TRIM(CUST_ID) IN (${custIn}) LIMIT 1`,
            custCands
        );
        if (!uRows.length) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });

        const u = uRows[0];
        const resolvedCustId = String(u.CUST_ID ?? '').trim();
        const loginUserId = u.USER_ID;
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

        const profileCanon = canonicalFileMasterFileId(u.PROFILE_FILE_ID);

        connection = await pool.getConnection();

        let detail = null;
        try {
            detail = await selectDriverDetailForProfileSetup(connection, resolvedCustId);
        } catch (e) {
            if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR') detail = null;
            else throw e;
        }

        let qualDocRow = null;
        try {
            const hasDriverDocsFileSize = await tableColumnExists(connection, 'TB_DRIVER_DOCS', 'FILE_SIZE');
            const docSel = hasDriverDocsFileSize
                ? `SELECT DOC_TYPE_SEQ, ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE
                   FROM TB_DRIVER_DOCS
                   WHERE CUST_ID = ? AND DOC_TYPE = ? ORDER BY DOC_TYPE_SEQ DESC LIMIT 1`
                : `SELECT DOC_TYPE_SEQ, ORG_FILE_NM, ORG_FILE_EXT
                   FROM TB_DRIVER_DOCS
                   WHERE CUST_ID = ? AND DOC_TYPE = ? ORDER BY DOC_TYPE_SEQ DESC LIMIT 1`;
            const [qr] = await connection.execute(docSel, [resolvedCustId, QUALIFICATION_DOC_TYPE]);
            qualDocRow = qr[0] || null;
        } catch (_) {
            qualDocRow = null;
        }
        const latestQualSeq = qualDocRow?.DOC_TYPE_SEQ;
        const qualCertFileId = latestQualSeq != null ? String(latestQualSeq).padStart(20, '0') : null;
        const qualCertOrgFileNm =
            qualDocRow?.ORG_FILE_NM != null ? String(qualDocRow.ORG_FILE_NM).trim() : '';
        let qualCertFileExt = '';
        if (qualDocRow?.ORG_FILE_EXT != null) {
            qualCertFileExt = String(qualDocRow.ORG_FILE_EXT).replace(/^\./, '').trim().toLowerCase();
        }
        const qualCertExtras = {
            hasQualCertFile: !!qualCertFileId,
            qualCertFileId,
            qualCertOrgFileNm,
            qualCertFileExt,
            qualCertFileSize: qualDocRow?.FILE_SIZE != null ? Number(qualDocRow.FILE_SIZE) : null
        };

        let residentNoDisplay = '';
        try {
            const rPlain = u.RESIDENT_NO_ENC ? decrypt(u.RESIDENT_NO_ENC) : '';
            residentNoDisplay = formatResidentNoDisplayFromPlain(rPlain);
        } catch (_) {
            residentNoDisplay = '';
        }

        const baseExtras = {
            userName,
            phoneNo,
            residentNoDisplay,
            hasProfilePhoto: !!profileCanon,
            profilePhotoFileId: profileCanon,
            profilePhotoId: profileCanon,
            ...qualCertExtras
        };

        if (!detail) {
            const feePolicyResolved = await resolveDriverProfileFeePolicy(
                connection,
                resolvedCustId,
                null
            );
            return res.json({
                exists: false,
                ...baseExtras,
                feePolicy: feePolicyResolved,
                addrType: 'HOME',
                addrName: '',
                zipcode: '',
                address: '',
                detailAddress: '',
                bioText: ''
            });
        }

        const feePolicyResolved = await resolveDriverProfileFeePolicy(connection, resolvedCustId, detail);

        return res.json({
            exists: true,
            ...baseExtras,
            licenseType: detail.LICENSE_TYPE || '',
            licenseNo: detail.LICENSE_NO || '',
            licenseSerialNo: detail.LICENSE_SERIAL_NO || '',
            licenseIssueDt: formatDateYmd(detail.LICENSE_ISSUE_DT),
            licenseExpiryDt: formatDateYmd(detail.LICENSE_EXPIRY_DT),
            qualCertNo: detail.QUAL_CERT_NO || '',
            bioText: detail.SELF_INTRO || '',
            qualCertVerifyStatus: detail.QUAL_CERT_VERIFY_STATUS || 'UNVERIFIED',
            qualCertVerifyDt: detail.QUAL_CERT_VERIFY_DT
                ? new Date(detail.QUAL_CERT_VERIFY_DT).toISOString()
                : null,
            feePolicy: feePolicyResolved,
            addrType: detail.ADDR_TYPE || 'HOME',
            addrName: detail.ADDR_NAME || '',
            zipcode: detail.ZIPCODE || '',
            address: detail.ADDRESS || '',
            detailAddress: detail.DETAIL_ADDRESS || ''
        });
    } catch (error) {
        console.error('GET driver profile-setup error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/** 기사 프로필 — 회원등급(FEE_POLICY) 콤보: TB_COMMON_CODE FEE_POLICY + FEE_POLICY_CNT */
app.get('/api/driver/fee-policy-options', async (req, res) => {
    try {
        const inPh = DRIVER_FEE_POLICY_DTL_CDS_SQL_IN.map(() => '?').join(', ');
        const joinCond = sqlFeePolicyCntJoinOnP();
        const [rows] = await pool.execute(
            `SELECT p.DTL_CD AS dtlCd, p.CD_NM_KO AS cdNmKo, p.CD_FNUM AS feeFnum, p.DISP_ORD AS dispOrd,
                    c.CD_FNUM AS cntFnum
             FROM TB_COMMON_CODE p
             LEFT JOIN TB_COMMON_CODE c
               ON c.GRP_CD = 'FEE_POLICY_CNT' AND ${joinCond}
               AND (c.USE_YN = 'Y' OR c.USE_YN IS NULL)
             WHERE p.GRP_CD = 'FEE_POLICY'
               AND TRIM(p.DTL_CD) IN (${inPh})
               AND (p.USE_YN = 'Y' OR p.USE_YN IS NULL)
             ORDER BY p.DISP_ORD ASC, p.DTL_CD ASC`,
            [...DRIVER_FEE_POLICY_DTL_CDS_SQL_IN]
        );
        const bestByCanon = new Map();
        for (const r of rows || []) {
            const rawDtl =
                r.dtlCd != null
                    ? String(r.dtlCd).trim()
                    : r.DTL_CD != null
                      ? String(r.DTL_CD).trim()
                      : '';
            const canon = normalizeDriverFeePolicyDtlCd(rawDtl);
            if (!isCanonicalDriverFeePolicyDtlCd(canon)) continue;
            const dispOrd = Number(r.dispOrd ?? r.DISP_ORD ?? 1e9);
            const prev = bestByCanon.get(canon);
            let replace = !prev || dispOrd < prev.dispOrd;
            if (!replace && prev && dispOrd === prev.dispOrd) {
                if (prev.rawDtl === 'DRIVER_GENNERAL' && rawDtl === 'DRIVER_GENERAL') replace = true;
            }
            if (replace) {
                bestByCanon.set(canon, { r, rawDtl, dispOrd });
            }
        }
        const ordered = [...bestByCanon.entries()]
            .map(([canon, { r, dispOrd }]) => ({ canon, r, dispOrd }))
            .sort((a, b) =>
                a.dispOrd !== b.dispOrd ? a.dispOrd - b.dispOrd : a.canon.localeCompare(b.canon)
            );
        const items = ordered.map(({ canon, r }) => {
            const cdNmKo =
                r.cdNmKo != null
                    ? String(r.cdNmKo).trim()
                    : r.CD_NM_KO != null
                      ? String(r.CD_NM_KO).trim()
                      : '';
            const feeRaw = r.feeFnum !== undefined ? r.feeFnum : r.FEE_FNUM;
            const cntRaw = r.cntFnum !== undefined ? r.cntFnum : r.CNT_FNUM;
            const feePart = formatCommonCodeFnumForLabel(feeRaw);
            const cntPart = formatCommonCodeFnumForLabel(cntRaw);
            const label = `${cdNmKo} ( 월 회비 : ${feePart} 월 청약 건수 : ${cntPart} )`;
            return { dtlCd: canon, label };
        });
        res.json({ items });
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                error: 'TB_COMMON_CODE 테이블을 확인할 수 없습니다.',
                items: []
            });
        }
        console.error('fee-policy-options:', e);
        res.status(500).json({ error: e.message });
    }
});

/** 프로필 사진: 요청 custId와 일치하는 TB_USER 행에서 PROFILE_FILE_ID를 얻은 뒤,
 * TB_FILE_MASTER에서 GCS_BUCKET_NM·GCS_PATH를 조회해 버킷+객체 스트림으로 응답한다. */
app.get('/api/driver/profile-photo', async (req, res) => {
    try {
        const { custId, fileId } = req.query;
        if (!custId || fileId === undefined || fileId === null || String(fileId).trim() === '') {
            return res.status(400).json({ error: 'custId and fileId are required' });
        }

        const custCands = custIdMatchCandidates(custId);
        if (!custCands.length) {
            return res.status(400).json({ error: 'custId and fileId are required' });
        }

        const cand = fileIdMatchCandidates(fileId);
        if (!cand.length) {
            return res.status(400).json({ error: 'custId and fileId are required' });
        }
        const inList = cand.map(() => '?').join(', ');
        const custIn = custCands.map(() => '?').join(', ');
        const [rows] = await pool.execute(
            `SELECT 1 FROM TB_USER WHERE TRIM(CUST_ID) IN (${custIn}) AND PROFILE_FILE_ID IS NOT NULL
             AND TRIM(PROFILE_FILE_ID) IN (${inList}) LIMIT 1`,
            [...custCands, ...cand]
        );
        if (!rows.length) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [fRows] = await pool.execute(
            `SELECT GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER
             WHERE TRIM(FILE_ID) IN (${inList}) LIMIT 1`,
            cand
        );
        if (!fRows.length) {
            console.warn('[profile-photo] TB_FILE_MASTER 없음 fileId 후보=', cand.join(', '));
            return res.status(404).json({
                error: '파일을 찾을 수 없습니다.',
                code: 'FILE_MASTER_NOT_FOUND'
            });
        }

        let { GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT } = fRows[0];
        if (Buffer.isBuffer(GCS_PATH)) GCS_PATH = GCS_PATH.toString('utf8');
        if (Buffer.isBuffer(FILE_EXT)) FILE_EXT = FILE_EXT.toString('utf8');

        const bktNm = GCS_BUCKET_NM != null ? String(GCS_BUCKET_NM).trim() : '';
        const pathCandidates = expandGcsKeysWithImageExt(
            gcsObjectPathCandidates(GCS_PATH),
            FILE_EXT
        );
        let gcsFile = null;
        for (const key of pathCandidates) {
            const f = bucketForName(bktNm).file(key);
            try {
                const [ex] = await f.exists();
                if (ex) {
                    gcsFile = f;
                    break;
                }
            } catch (e) {
                console.warn('[profile-photo] GCS exists() 확인 실패:', key, e.message || e);
            }
        }
        if (!gcsFile) {
            console.warn('[profile-photo] GCS 객체 없음', {
                fileId: cand[0],
                bucket: bktNm || '(default)',
                pathRaw: String(GCS_PATH).slice(0, 220),
                tried: pathCandidates
            });
            return res.status(404).json({
                error: '스토리지에 파일이 없습니다.',
                code: 'GCS_OBJECT_NOT_FOUND'
            });
        }

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

// [신규] 사용자 프로필 이미지 조회 API (CUST_ID 제약 없이 FILE_ID로만 조회 - 범용)
app.get('/api/user/profile-image', async (req, res) => {
    try {
        const { fileId } = req.query;
        if (!fileId) return res.status(400).json({ error: 'fileId is required' });

        const [fRows] = await pool.execute(
            `SELECT GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (!fRows.length) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_PATH, ORG_FILE_NM, FILE_EXT } = fRows[0];
        let bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
        let relativePath = GCS_PATH;

        if (GCS_PATH && GCS_PATH.startsWith('http')) {
            const urlParts = GCS_PATH.split('/');
            // urlParts[3]가 버킷명
            if (urlParts[3]) bucketName = urlParts[3];
            relativePath = urlParts.slice(4).join('/');
        }
        const bucket = storage.bucket(bucketName);

        console.log(`\n[PHOTO_DEBUG] FileID: ${fileId}`);
        console.log(`[PHOTO_DEBUG] Original GCS_PATH: ${GCS_PATH}`);
        console.log(`[PHOTO_DEBUG] Extracted RelativePath: ${relativePath}`);
        console.log(`[PHOTO_DEBUG] Bucket: ${bucketName}`);

        const gcsFile = bucket.file(relativePath);
        
        try {
            const [exists] = await gcsFile.exists();
            if (!exists) {
                console.error(`[PHOTO_ERROR] File does not exist in GCS: ${relativePath}`);
                return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
            }
        } catch (gcsErr) {
            console.error(`[PHOTO_ERROR] GCS Access Denied or Error: ${gcsErr.message}`);
            return res.status(403).json({ error: 'GCS 접근 권한이 없거나 오류가 발생했습니다.', detail: gcsErr.message });
        }

        const ext = (FILE_EXT || 'png').toLowerCase();
        const ctMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const ct = ctMap[ext] || 'image/png';

        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        
        gcsFile.createReadStream()
            .on('error', (err) => {
                console.error('[PHOTO_STREAM_ERROR]', err);
            })
            .pipe(res);
    } catch (error) {
        console.error('GET user profile-image error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// REST APIs (Modularized to bt_auction_trip_api.js)
// ---------------------------------------------------------------------------

// Dashboard & Confirmation APIs (Modularized to bt_auction_trip_api.js)



// POST /api/auction/cancel-bus
app.post('/api/auction/cancel-bus', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq } = req.body;
        if (!reqId || !reqBusSeq) return res.status(400).json({ error: 'reqId and reqBusSeq are required' });

        connection = await pool.getConnection();
        
        // 1. TB_BUS_RESERVATION 테이블의 상태만 'TRAVELER_CANCEL'로 변경
        // REQ_ID와 REQ_BUS_SEQ(Sequence)를 통해 해당 차량과 매칭되는 확정된 입찰 건을 찾아 업데이트합니다.
        const [result] = await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_DT = NOW()
            WHERE REQ_ID = ?
              AND REQ_BUS_SEQ = LPAD(?, 10, '0')
              AND DATA_STAT = 'CONFIRM' 
        `, [reqId, reqBusSeq]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '해당 차량의 확정된 예약 정보를 찾을 수 없거나 이미 취소되었습니다.' });
        }

        // 2. TB_AUCTION_REQ_BUS 상태도 변경 (개별 차량 취소 반영)
        await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [reqId, reqBusSeq]);

        // 3. TB_USER_CANCEL_HIST 이력 삽입 (부분 취소)
        const [uRows] = await connection.execute('SELECT TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        if (uRows.length > 0) {
            const custId = uRows[0].TRAVELER_ID;
            const [maxHistRows] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [custId]);
            const nextHistSeq = (maxHistRows[0].maxSeq || 0) + 1;
            
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_HIST (
                    CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, 
                    CANCEL_REASON_TEXT, REG_DT, MOD_DT
                ) VALUES (?, ?, 'TRAVELER_CANCEL_REASON', 'PARTIAL_CANCEL', ?, NOW(), NOW())
            `, [custId, nextHistSeq, `차량 개별 취소 (SEQ: ${reqBusSeq})`]);

            // 4. TB_USER_CANCEL_MANAGE 카운트 업데이트 (부분 취소 카운트)
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_MANAGE (
                    CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, 
                    TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                    REG_ID, MOD_ID, REG_DT, MOD_DT
                ) VALUES (?, 1, 1, 'Y', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    CANCEL_CNT = CANCEL_CNT + 1,
                    CANCEL_TRAVELER_PARTIAL_BUS_CNT = CANCEL_TRAVELER_PARTIAL_BUS_CNT + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = CURDATE(),
                    TRADE_RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
                    MOD_ID = ?,
                    MOD_DT = NOW()
            `, [custId, custId, custId, custId]);
        }

        await connection.commit();
        res.status(200).json({ message: '해당 차량의 예약이 취소되었습니다.' });

    } catch (error) {
        console.error('Cancel Bus Error:', error);
        res.status(500).json({ error: '차량 취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 복합 예약 취소 (사유 입력 + 파일 업로드 + 이력 관리)
// POST /api/auction/complex-cancel
app.post('/api/auction/complex-cancel', async (req, res) => {
    let connection;
    try {
        // 유연한 파라미터 수신을 위해 여러 키 확인
        const { reasonCode, reasonText, fileData, fileName } = req.body;
        const reqId = req.body.reqId || req.body.REQ_ID;
        const custId = req.body.custId || req.body.travelerId || req.body.TRAVELER_ID;
        
        console.log('[DEBUG] Complex Cancel Request Body:', { reqId, custId, reasonCode });

        if (!reqId || !custId) {
            return res.status(400).json({ 
                error: 'reqId and custId are required', 
                received: { reqId, custId } 
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 파일 처리 (GCS 업로드 및 TB_FILE_MASTER 등록)
        let fileId = null;
        if (fileData) {
                const parsed = parseDataUrlPayload(fileData, fileName);
                if (parsed) {
                    // 새로운 FILE_ID 생성
                    const [maxRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
                    fileId = generateNextNumericId(maxRows[0].maxId || '0', 20);

                    const { orgFileNm, fileExt } = orgFileNmAndExt(fileName, parsed);
                    const gcsPath = `cancel_docs/${custId}/${fileId}_${orgFileNm}.${fileExt}`;
                    const gcsFile = bucket.file(gcsPath);

                    // GCS에 파일 저장
                    await gcsFile.save(parsed.buffer, {
                        metadata: { contentType: parsed.mime },
                        resumable: false
                    });

                    // TB_FILE_MASTER 기록
                    await connection.execute(`
                        INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                        VALUES (?, 'CANCEL_DOC', ?, ?, ?, ?, ?, NOW())
                    `, [fileId, bucketName, gcsPath, orgFileNm, fileExt, parsed.buffer.length]);
                }
        }

        // 2. TB_AUCTION_REQ 상태 확인 및 변경
        const [statusRows] = await connection.execute(
            'SELECT DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (statusRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '취소할 여정 요청을 찾을 수 없습니다.' });
        }

        const currentStatus = statusRows[0].DATA_STAT;
        if (!['AUCTION', 'BIDDING'].includes(currentStatus)) {
            await connection.rollback();
            return res.status(400).json({ 
                error: `현재 상태(${currentStatus})에서는 전체 취소가 불가능합니다. (경매 중 또는 응찰 중인 경우만 가능)` 
            });
        }

        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        // 3. 연결된 모든 입찰 건(TB_BUS_RESERVATION) 및 차량 상세(TB_AUCTION_REQ_BUS) 상태 변경
        await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS
            SET DATA_STAT = 'TRAVELER_CANCEL',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        // 4. TB_USER_CANCEL_HIST 이력 삽입
        const [maxHistRows] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [custId]);
        const nextHistSeq = (maxHistRows[0].maxSeq || 0) + 1;
        
        await connection.execute(`
            INSERT INTO TB_USER_CANCEL_HIST (
                CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, 
                CANCEL_REASON_TEXT, REASON_DOC_FILE_NM, REG_DT, MOD_DT
            ) VALUES (?, ?, 'TRAVELER_CANCEL_REASON', ?, ?, ?, NOW(), NOW())
        `, [custId, nextHistSeq, reasonCode, reasonText || '', fileId]); // FILE_ID를 파일명 컬럼에 저장 (참조용)

        // 5. TB_USER_CANCEL_MANAGE 카운트 업데이트 (Upsert)
        await connection.execute(`
            INSERT INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_ALL_CNT, 
                TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                REG_ID, MOD_ID, REG_DT, MOD_DT
            ) VALUES (?, 1, 1, 'Y', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                CANCEL_CNT = CANCEL_CNT + 1,
                CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                TRADE_RESTRICT_YN = 'Y',
                TRADE_RESTRICT_START_DT = CURDATE(),
                TRADE_RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
                MOD_ID = ?,
                MOD_DT = NOW()
        `, [custId, custId, custId, custId]);

        await connection.commit();
        res.status(200).json({ success: true, message: '예약 취소가 성공적으로 처리되었습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Complex Cancel Error:', error);
        res.status(500).json({ error: '취소 처리 중 시스템 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 예약 확정 처리 (지금 예약하기)
// POST /api/auction/confirm

// 버스 변경 API (POST /api/auction/bus-change)

// 버스 재등록 API (변경 후 새로운 버스 추가)
app.post('/api/auction/re-register-bus', async (req, res) => {
    let connection;
    try {
        const { reqId, vehicles, custId } = req.body;
        
        if (!reqId || !vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
            return res.status(400).json({ error: 'reqId and vehicles array are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 기존 버스 상태 확인 및 요청 존재 여부 체크
        const [reqRows] = await connection.execute(
            'SELECT DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (reqRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '해당 예약 요청을 찾을 수 없습니다.' });
        }

        // 2. 새로운 버스들 등록 (TB_AUCTION_REQ_BUS)
        for (const bus of vehicles) {
            // 시퀀스 번호 따기 (현재 최대값 + 1)
            const [seqRows] = await connection.execute(
                'SELECT IFNULL(MAX(REQ_BUS_SEQ), 0) + 1 as nextSeq FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
                [reqId]
            );
            const nextSeq = seqRows[0].nextSeq;

            await connection.execute(
                `INSERT INTO TB_AUCTION_REQ_BUS 
                (REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT, RES_BUS_AMT, REG_ID, MOD_ID) 
                VALUES (?, ?, ?, 'AUCTION', ?, ?, ?)`,
                [reqId, nextSeq, bus.type, bus.price, secureModId, secureModId]
            );
        }

        // 3. 새로운 버스들의 총 금액 합산
        const totalNewAmt = vehicles.reduce((sum, v) => sum + (Number(v.price) * (Number(v.qty) || 1)), 0);

        // 4. TB_AUCTION_REQ 상태 복구 및 금액 합산
        const [reRegUpdate] = await connection.execute(
            "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', REQ_AMT = REQ_AMT + ?, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
            [totalNewAmt, secureModId, reqId]
        );
        console.log(`[DEBUG] Master recovery (re-register): affectedRows=${reRegUpdate.affectedRows}, addedAmt=${totalNewAmt}`);

        await connection.commit();
        res.status(200).json({ message: '버스가 성공적으로 재등록되었습니다. 이제 다시 입찰을 받으실 수 있습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Re-registration Error:', error);
        res.status(500).json({ error: '버스 재등록 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// [신규] 버스 개별 가격 조정 API
app.post('/api/auction/update-bus-price', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, newPrice, custId } = req.body;
        
        if (!reqId || !reqBusSeq || newPrice === undefined) {
            return res.status(400).json({ error: 'reqId, reqBusSeq, and newPrice are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);
        const price = Number(newPrice);

        // 수수료 계산 (6.6%, 5.5%, 1.1%)
        const resFeeTotalAmt = Math.round(price * 0.066);
        const resFeeRefundAmt = Math.round(price * 0.055);
        const resFeeAttributionAmt = parseFloat((price * 0.011).toFixed(3));

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // [추가] 응찰한 기사가 있는지 확인 (응찰자가 있으면 가격 수정 불가)
        const [bidRows] = await connection.execute(`
            SELECT COUNT(*) as bidCount 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND CAST(REQ_BUS_SEQ AS UNSIGNED) = CAST(? AS UNSIGNED)
              AND DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CANCEL', 'BUS_CHANGE')
        `, [reqId, reqBusSeq]);

        if (bidRows[0].bidCount > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '이미 응찰한 기사가 있어 가격을 수정할 수 없습니다.' });
        }

        // 1. TB_AUCTION_REQ_BUS 업데이트 (상태가 'AUCTION'인 경우에만 가격 수정 허용)
        const [busUpdate] = await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS 
            SET RES_BUS_AMT = ?,
                RES_FEE_TOTAL_AMT = ?,
                RES_FEE_REFUND_AMT = ?,
                RES_FEE_ATTRIBUTION_AMT = ?,
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = 'AUCTION'
        `, [price, resFeeTotalAmt, resFeeRefundAmt, resFeeAttributionAmt, secureModId, reqId, reqBusSeq]);

        if (busUpdate.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ error: '기사가 응찰을 시작했거나 상태가 변경되어 가격을 수정할 수 없습니다.' });
        }

        // 2. TB_AUCTION_REQ (마스터) 총 금액 재계산 및 업데이트
        // 모든 버스의 RES_BUS_AMT 합계를 구함
        const [sumRows] = await connection.execute(
            'SELECT SUM(RES_BUS_AMT) as totalAmt FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'TRAVELER_CANCEL\', \'BUS_CANCEL\', \'CANCELED\')',
            [reqId]
        );
        const totalAmt = sumRows[0].totalAmt || 0;

        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET REQ_AMT = ?,
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [totalAmt, secureModId, reqId]);

        await connection.commit();
        res.status(200).json({ 
            success: true, 
            message: '가격이 성공적으로 변경되었습니다.',
            totalAmt: totalAmt
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update Bus Price Error:', error);
        res.status(500).json({ error: '가격 변경 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/auction/bus-change', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, custId } = req.body;
        
        if (!reqId || !reqBusSeq) {
            return res.status(400).json({ error: 'reqId and reqBusSeq are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 활성 버스 대수 확인 (취소되지 않은 버스)
        const [activeBuses] = await connection.execute(
            'SELECT REQ_BUS_SEQ, RES_BUS_AMT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'TRAVELER_CANCEL\', \'BUS_CANCEL\') FOR UPDATE',
            [reqId]
        );

        if (activeBuses.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '활성화된 버스 요청을 찾을 수 없습니다.' });
        }

        // 취소하려는 버스 찾기
        const busToCancel = activeBuses.find(b => b.REQ_BUS_SEQ === Number(reqBusSeq));
        if (!busToCancel) {
            await connection.rollback();
            return res.status(404).json({ error: '취소할 버스 정보를 찾을 수 없거나 이미 취소되었습니다.' });
        }

        const oldBusAmt = busToCancel.RES_BUS_AMT || 0;
        const remainingCount = activeBuses.length;

        // 2. TB_AUCTION_REQ 업데이트 (금액 차감 및 조건부 상태 변경)
        let masterStatusUpdate = '';
        if (remainingCount === 1) {
            masterStatusUpdate = ', DATA_STAT = \'TRAVELER_CANCEL\'';
        }

        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET BUS_CHANG_CNT = BUS_CHANG_CNT + 1, REQ_AMT = REQ_AMT - ?, MOD_ID = ?, MOD_DT = NOW() ${masterStatusUpdate} WHERE REQ_ID = ?`,
            [oldBusAmt, secureModId, reqId]
        );

        // 3. TB_AUCTION_REQ_BUS 업데이트 (상태를 TRAVELER_CANCEL로 변경)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?',
            [secureModId, reqId, reqBusSeq]
        );
        
        // 4. 연관된 확정 예약(TB_BUS_RESERVATION)이 있다면 함께 취소 처리
        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = \'CONFIRM\'',
            [reqId, reqBusSeq]
        );

        // 5. [추가] 취소 관리(TB_USER_CANCEL_MANAGE) 및 이력(TB_USER_CANCEL_HIST) 반영
        const [maxHistRows] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [secureModId]);
        const nextHistSeq = (maxHistRows[0].maxSeq || 0) + 1;

        if (remainingCount === 1) {
            // A. 버스가 1대뿐인 경우 -> 여정 전체 취소로 간주 (CANCEL_TRAVELER_ALL_CNT 증가)
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_HIST (CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, CANCEL_REASON_TEXT, REG_DT, MOD_DT)
                VALUES (?, ?, 'TRAVELER_CANCEL_REASON', 'FULL_CANCEL_BY_BUS', '마지막 남은 버스 취소로 인한 전체 취소', NOW(), NOW())
            `, [secureModId, nextHistSeq]);

            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_MANAGE (
                    CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_ALL_CNT, 
                    TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                    REG_ID, MOD_ID, REG_DT, MOD_DT
                ) VALUES (?, 1, 1, 'Y', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    CANCEL_CNT = CANCEL_CNT + 1,
                    CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = CURDATE(),
                    TRADE_RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
                    MOD_ID = ?, MOD_DT = NOW()
            `, [secureModId, secureModId, secureModId, secureModId]);
        } else {
            // B. 버스가 2대 이상인 경우 -> 부분 취소로 간주 (CANCEL_TRAVELER_PARTIAL_BUS_CNT 증가)
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_HIST (CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, CANCEL_REASON_TEXT, REG_DT, MOD_DT)
                VALUES (?, ?, 'TRAVELER_CANCEL_REASON', 'PARTIAL_CANCEL', ?, NOW(), NOW())
            `, [secureModId, nextHistSeq, `차량 개별 취소 (SEQ: ${reqBusSeq})`]);

            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_MANAGE (
                    CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, 
                    TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                    REG_ID, MOD_ID, REG_DT, MOD_DT
                ) VALUES (?, 1, 1, 'Y', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    CANCEL_CNT = CANCEL_CNT + 1,
                    CANCEL_TRAVELER_PARTIAL_BUS_CNT = CANCEL_TRAVELER_PARTIAL_BUS_CNT + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = CURDATE(),
                    TRADE_RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
                    MOD_ID = ?, MOD_DT = NOW()
            `, [secureModId, secureModId, secureModId, secureModId]);
        }

        await connection.commit();
        res.status(200).json({ 
            message: '버스 변경 요청이 성공적으로 처리되었습니다.'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Change Error:', error);
        res.status(500).json({ error: '버스 변경 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/auction/bus-cancel', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, custId } = req.body;
        
        if (!reqId || !reqBusSeq) {
            return res.status(400).json({ error: 'reqId and reqBusSeq are required' });
        }

        const secureModId = String(custId || 'SYSTEM').substring(0, 10);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 마스터 정보 조회 (기사 변경 횟수 확인)
        const [masterRows] = await connection.execute(
            'SELECT BUS_CHANG_CNT FROM TB_AUCTION_REQ WHERE REQ_ID = ? FOR UPDATE',
            [reqId]
        );

        if (masterRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '해당 여정 요청을 찾을 수 없습니다.' });
        }

        const master = masterRows[0];
        if (master.BUS_CHANG_CNT > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '기사 변경은 이미 1회 수행되었습니다. 더 이상 변경할 수 없습니다.' });
        }

        // 2. TB_AUCTION_REQ 업데이트 (상태를 AUCTION으로 되돌리고 횟수 증가, 금액 유지)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ SET DATA_STAT = \'AUCTION\', BUS_CHANG_CNT = BUS_CHANG_CNT + 1, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?',
            [secureModId, reqId]
        );

        // 3. TB_AUCTION_REQ_BUS 업데이트 (재응찰을 위해 상태를 AUCTION으로 변경)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'AUCTION\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?',
            [secureModId, reqId, reqBusSeq]
        );

        // 4. TB_BUS_RESERVATION 무효화 (기존 확정 데이터를 BUS_CHANGE로 변경)
        // 무효화 하기 전에 기사 정보를 가져와서 알림 발송 및 패널티 부여 준비
        const [driverInfoRows] = await connection.execute(
            `SELECT r.DRIVER_ID, u.HP_NO AS DRIVER_HP_ENC, u.USER_NM AS DRIVER_NM_ENC
             FROM TB_BUS_RESERVATION r
             INNER JOIN TB_USER u ON r.DRIVER_ID = u.CUST_ID
             WHERE r.REQ_ID = ? AND r.REQ_BUS_SEQ = ? AND r.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL')`,
            [reqId, String(reqBusSeq)]
        );

        if (driverInfoRows.length > 0) {
            // [정책 변경] 기사는 패널티 체크/부여 제외함 (사용자 요청)
        }

        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'BUS_CHANGE\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT NOT IN (\'BUS_CHANGE\', \'TRAVELER_CANCEL\')',
            [reqId, String(reqBusSeq)]
        );

        await connection.commit();

        // 5. 알림톡 발송 (트랜잭션 완료 후 비동기 처리)
        if (driverInfoRows.length > 0) {
            const driver = driverInfoRows[0];
            let driverPhone = '';
            let driverNm = '';
            try {
                driverPhone = driver.DRIVER_HP_ENC ? decrypt(driver.DRIVER_HP_ENC) : '';
            } catch (_) {
                driverPhone = '';
            }
            try {
                driverNm = driver.DRIVER_NM_ENC ? decrypt(driver.DRIVER_NM_ENC) : '';
            } catch (_) {
                driverNm = '';
            }
            try {
                await sendAlimTalkAndLog(pool, {
                    reqId: reqId,
                    receiverId: driver.DRIVER_ID,
                    receiverPhone: driverPhone,
                    content: `[busTaams] 예약 취소 안내\n\n기사님, 예약된 여정(요청번호: ${reqId})이 고객님의 요청으로 취소되었습니다.`,
                    category: 'DRIVER_CHANGE_NOTICE'
                });
                console.log(`[ALIMTALK] Driver Change notification sent to ${driverNm}(${driverPhone})`);
            } catch (alimError) {
                console.error('[ALIMTALK ERROR] Failed to send driver change notice:', alimError.message);
            }
        }
        res.status(200).json({ message: '기사 변경 요청이 완료되었습니다. 다시 경매가 진행됩니다.' });


    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bus Cancel Error:', error);
        res.status(500).json({ error: '버스 취소 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/auction/confirm', async (req, res) => {
    let connection;
    try {
        const { reqId, driverId, bidSeq } = req.body;
        if (!reqId || !driverId) {
            return res.status(400).json({ error: 'reqId and driverId are required' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 기사의 버스 정보 가져오기 (차량 타입 확인용)
        const busRow = await fetchBusRowForUser(connection, driverId);
        const busType = busRow ? busRow.SERVICE_CLASS : null;

        // 2. 해당 요청(reqId)에서 해당 차종에 맞는 비어있는 슬롯(REQ_BUS_SEQ) 찾기
        // (이미 확정된 차량은 제외하고 남은 슬롯 중 하나 선택)
        const [slots] = await connection.execute(`
            SELECT ab.REQ_BUS_SEQ
            FROM TB_AUCTION_REQ_BUS ab
            LEFT JOIN TB_BUS_RESERVATION res ON ab.REQ_ID = res.REQ_ID 
                AND LPAD(ab.REQ_BUS_SEQ, 10, '0') = res.REQ_BUS_SEQ
                AND res.DATA_STAT = 'CONFIRM'
            WHERE ab.REQ_ID = ? 
              AND (ab.BUS_TYPE_CD = ? OR ? IS NULL)
              AND res.RES_ID IS NULL
            LIMIT 1
        `, [reqId, busType, busType]);

        const targetBusSeq = slots.length > 0 ? slots[0].REQ_BUS_SEQ : null;

        // 3. 해당 기사의 특정 입찰(bidSeq)을 'CONFIRM'으로 변경하고 슬롯(REQ_BUS_SEQ) 할당
        const [resUpdate] = await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'CONFIRM',
                REQ_BUS_SEQ = LPAD(?, 10, '0'),
                MOD_DT = NOW()
            WHERE REQ_ID = ? 
              AND DRIVER_ID = ?
              AND BID_SEQ = ?
        `, [targetBusSeq, reqId, driverId, bidSeq || 1]);

        if (resUpdate.affectedRows === 0) {
            throw new Error('해당 입찰 정보를 찾을 수 없거나 이미 처리되었습니다.');
        }

        // 4. 상위 요청서 및 차량 상세 상태를 'CONFIRM'으로 변경
        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET DATA_STAT = 'CONFIRM',
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [reqId]);

        if (targetBusSeq) {
            await connection.execute(`
                UPDATE TB_AUCTION_REQ_BUS
                SET DATA_STAT = 'CONFIRM',
                    MOD_DT = NOW()
                WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
            `, [reqId, targetBusSeq]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: '예약이 확정되었습니다.', assignedBusSeq: targetBusSeq });


    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Confirm Reservation Error:', error);
        res.status(500).json({ error: error.message || '예약 확정 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 특정 경매 요청에 대한 견적 목록 조회 (최신 입찰 선별 로직 포함)
// GET /api/auction/bids/:reqId
app.get('/api/auction/bids/:reqId', async (req, res) => {
    let connection;
    try {
        const { reqId } = req.params;
        if (!reqId) return res.status(400).json({ error: 'reqId is required' });

        connection = await pool.getConnection();

        const query = `
            SELECT 
                res.RES_ID,
                res.REQ_ID,
                res.DRIVER_ID,
                res.BUS_ID,
                res.DRIVER_BIDDING_PRICE,
                res.DATA_STAT as RES_STAT,
                u.USER_NM as driverName,
                di.SELF_INTRO as driverBio,
                u.USER_STAT as verifyStatus,
                v.MODEL_NM as busModel,
                v.SERVICE_CLASS as busClass,
                v.VEHICLE_NO as busNo,
                v.MANUFACTURE_YEAR as manufactureYear,
                v.AMENITIES as amenitiesList,
                v.HAS_ADAS as hasAdas
            FROM TB_BUS_RESERVATION res
            INNER JOIN TB_AUCTION_REQ_BUS ab ON res.REQ_ID = ab.REQ_ID 
                AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
            LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_DRIVER_DETAIL di ON res.DRIVER_ID = di.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON res.BUS_ID = v.BUS_ID
            WHERE res.REQ_ID = ?
              AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM')
              AND ab.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CANCEL', 'BUS_CHANGE', 'CANCELED')
            ORDER BY res.REG_DT DESC
        `;

        const [rows] = await connection.execute(query, [reqId]);
        
        const sanitizedRows = rows.map(row => {
            let name = row.driverName || '이름 정보 없음';
            try {
                // 암호화된 경우 복호화 시도
                if (name.includes(':')) {
                    name = decrypt(name);
                }
            } catch (e) { /* ignore */ }

            return {
                ...row,
                driverName: name,
                bidId: row.RES_ID,
                driverId: row.DRIVER_ID,
                bidPrice: row.DRIVER_BIDDING_PRICE,
                busModel: row.busModel || '정보 미등록',
                busClass: row.busClass || 'STANDARD',
                manufactureYear: row.manufactureYear || '-'
            };
        });

        res.status(200).json(sanitizedRows);

    } catch (error) {
        console.error('CRITICAL BIDS ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// API: 내 여정 기록 조회 (완료 및 취소 내역 포함)
// GET /api/auction/history/:custId
app.get('/api/auction/history/:custId', async (req, res) => {
    let connection;
    try {
        const { custId } = req.params;
        if (!custId) return res.status(400).json({ error: 'custId is required' });

        connection = await pool.getConnection();
        
        console.log(`[DEBUG] Fetching history for custId: [${custId}]`);
        
        const query = `
            SELECT 
                r.REQ_ID, 
                ab.REQ_BUS_SEQ,
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.TRAVELER_ID,
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT,
                ab.BUS_TYPE_CD,
                ab.RES_BUS_AMT as UNIT_REQ_AMT,
                ab.DATA_STAT as BUS_STAT,
                (
                    SELECT res.DATA_STAT 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as RES_STAT,
                (
                    SELECT res.DRIVER_BIDDING_PRICE 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as FINAL_CONFIRM_AMT,
                (
                    SELECT u.USER_NM 
                    FROM TB_BUS_RESERVATION res 
                    LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as DRIVER_NM,
                (
                    SELECT u.PROFILE_FILE_ID
                    FROM TB_BUS_RESERVATION res 
                    LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as PROFILE_PHOTO_ID,
                (
                    SELECT res.DRIVER_ID 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as DRIVER_ID,
                (
                    SELECT res.RES_ID 
                    FROM TB_BUS_RESERVATION res 
                    WHERE res.REQ_ID = r.REQ_ID 
                      AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED)
                      AND res.DATA_STAT IN ('AUCTION', 'BIDDING', 'CONFIRM', 'DONE')
                    ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'DONE') THEN 0 ELSE 1 END ASC
                    LIMIT 1
                ) as RES_ID
            FROM TB_AUCTION_REQ r
            INNER JOIN TB_AUCTION_REQ_BUS ab ON r.REQ_ID = ab.REQ_ID
            WHERE r.TRAVELER_ID = ?
              AND r.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE')
              AND ab.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL', 'BUS_CANCEL')
            ORDER BY r.REG_DT DESC, ab.REQ_BUS_SEQ ASC
        `;

        const [rows] = await connection.execute(query, [custId]);
        console.log(`[DEBUG] History rows found: ${rows.length}`);

        // [보강] 기사 성함 복호화 처리
        for (let row of rows) {
            if (row.DRIVER_NM) {
                try {
                    // 암호화된 경우 복호화 (includes(':') 체크 없이 시도하여 유연성 확보)
                    if (row.DRIVER_NM.includes(':')) {
                        row.DRIVER_NM = decrypt(row.DRIVER_NM);
                    }
                } catch (e) {
                    console.error('Driver name decryption error:', e);
                }
            }
        }

        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch Trip History Error:', error);
        res.status(500).json({ error: '여정 기록 조회 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// [신규] 사용자의 전체 이용 내역 조회 (시간 제한 없음 - 이용 내역 모달용)
app.get('/api/auction/total-history/:custId', async (req, res) => {
    console.log(`[DEBUG] GET /api/auction/total-history/:custId called with id: [${req.params.custId}]`);
    let connection;
    try {
        const { custId } = req.params;
        if (!custId) return res.status(400).json({ error: 'custId is required' });

        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                r.REQ_ID, 
                r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.TRAVELER_ID,
                r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT, r.REQ_AMT,
                MAX(res.RES_ID) as RES_ID,
                MAX(res.DRIVER_ID) as DRIVER_ID,
                COALESCE(MAX(u.USER_NM), '기사 정보 없음') as DRIVER_NAME,
                MAX(u.USER_IMAGE) as DRIVER_PHOTO,
                MAX(rv.STAR_RATING) as STAR_RATING,
                MAX(rv.COMMENT_TEXT) as MY_COMMENT,
                MAX(rv.REPLY_TEXT) as DRIVER_REPLY,
                MAX(rv.REG_DT) as REVIEW_REG_DT,
                MAX(rv.REPLY_DT) as DRIVER_REPLY_DT
            FROM TB_AUCTION_REQ r
            LEFT JOIN TB_BUS_RESERVATION res ON TRIM(r.REQ_ID) = TRIM(res.REQ_ID)
            LEFT JOIN TB_USER u ON TRIM(res.DRIVER_ID) = TRIM(u.CUST_ID)
            LEFT JOIN TB_TRIP_REVIEW rv ON res.RES_ID = rv.RES_ID
            WHERE r.TRAVELER_ID = ?
              AND r.DATA_STAT IN ('DONE', 'TRAVELER_CANCEL', 'DRIVER_CANCEL', 'BUS_CHANGE', 'BUS_CANCEL')
            GROUP BY r.REQ_ID
            ORDER BY r.REG_DT DESC
        `;

        const [rows] = await connection.execute(query, [custId]);
        if (rows.length > 0) {
            console.log(`[DEBUG] First history row - DRIVER_ID: [${rows[0].DRIVER_ID}], NAME: [${rows[0].DRIVER_NAME}]`);
        }
        if (rows.length > 0) {
            console.log(`[DEBUG] First history row REQ_AMT: [${rows[0].REQ_AMT}]`);
        }
        res.status(200).json(rows);

    } catch (error) {
        console.error('Fetch Total History Error:', error);
        res.status(500).json({ error: '전체 여정 기록 조회 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 리뷰 저장 API
app.post('/api/review/submit', async (req, res) => {
    let { reqId, resId, driverId, writerId, rating, content, writerType } = req.body;
    
    // 데이터가 없는 경우를 대비한 대체 처리 (테스트용)
    const targetResId = resId || reqId; 
    const targetDriverId = driverId || 'SYSTEM';

    let connection;
    try {
        connection = await pool.getConnection();
        
        // 1. 해당 예약(RES_ID)에 대한 다음 리뷰 순번(REVIEW_SEQ) 조회
        const [seqResult] = await connection.execute(
            'SELECT COALESCE(MAX(REVIEW_SEQ), 0) + 1 as nextSeq FROM TB_TRIP_REVIEW WHERE RES_ID = ?',
            [targetResId]
        );
        const nextSeq = seqResult[0].nextSeq;

        // 2. 리뷰 저장
        const query = `
            INSERT INTO TB_TRIP_REVIEW (
                RES_ID, REVIEW_SEQ, WRITER_ID, DRIVER_ID, 
                STAR_RATING, COMMENT_TEXT, 
                REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?)
        `;

        await connection.execute(query, [
            targetResId, nextSeq, writerId, targetDriverId, 
            rating, content, writerId, writerId
        ]);

        res.status(200).json({ message: '리뷰가 성공적으로 등록되었습니다.', reviewSeq: nextSeq });

    } catch (error) {
        console.error('Submit Review Error:', error);
        res.status(500).json({ error: '리뷰 등록 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 특정 입찰(견적) 정보 상세 조회 (6개 테이블 조인)
// GET /api/auction/bid-detail/:bidId
app.get('/api/auction/bid-detail/:bidId', async (req, res) => {
    let connection;
    try {
        const { bidId } = req.params;
        if (!bidId) return res.status(400).json({ error: 'bidId is required' });

        connection = await pool.getConnection();

        const query = `
            SELECT 
                res.RES_ID as bidId,
                res.DRIVER_BIDDING_PRICE as bidPrice,
                res.DRIVER_ID as driverId,
                u.USER_NM as driverName,
                di.SELF_INTRO as driverBio,
                u.PROFILE_FILE_ID as driverProfilePhotoId,
                v.MODEL_NM as busModel,
                v.SERVICE_CLASS as busClass,
                v.VEHICLE_NO as busNo,
                v.VEHICLE_PHOTOS_JSON as busPhotos
            FROM TB_BUS_RESERVATION res
            JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_DRIVER_DETAIL di ON res.DRIVER_ID = di.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON res.BUS_ID = v.BUS_ID
            WHERE res.RES_ID = ?
        `;

        const [rows] = await connection.execute(query, [bidId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '견적 정보를 찾을 수 없습니다.' });
        }

        const row = rows[0];
        try {
            row.driverName = decrypt(row.driverName);
        } catch (e) { /* ignore */ }

        res.status(200).json(row);

    } catch (error) {
        console.error('Get Bid Detail Error:', error);
        res.status(500).json({ error: '견적 상세 조회 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

function graphemeSlices(s, max) {
    const a = [...String(s)];
    return a.slice(0, max).join('');
}

/**
 * TB_USER.RESIDENT_NO_ENC 복호화 평문 → 앞6·뒤7 후보 (진위·TB_DRIVER_DETAIL 채움용)
 * - 신규: 숫자 13자리 연속(앞6+뒤7)
 * - 호환: `XXXXXX-YYYYYYY`
 * - 레거시: `XXXXXX-Y`(뒤 한 자리만 저장) → 뒤 필드는 Y + 0패딩으로 7칸(정확한 뒷자리 복원 불가 — 재입력 권장)
 */
function splitResidentNoPlainForProfileSetup(plain) {
    const s = String(plain ?? '').trim();
    if (!s) return { rrnFront: '', rrnBack: '' };
    const digitsOnly = s.replace(/\D/g, '');
    if (/^\d{13}$/.test(digitsOnly)) {
        return { rrnFront: digitsOnly.slice(0, 6), rrnBack: digitsOnly.slice(6, 13) };
    }
    const fullHyphen = /^(\d{6})-(\d{7})$/.exec(s);
    if (fullHyphen) {
        return { rrnFront: fullHyphen[1], rrnBack: fullHyphen[2] };
    }
    const legacyOne = /^(\d{6})-(\d)$/.exec(s);
    if (legacyOne) {
        return { rrnFront: legacyOne[1], rrnBack: (legacyOne[2] + '000000').slice(0, 7) };
    }
    return { rrnFront: '', rrnBack: '' };
}

function isFullRrnSplitFromParts(split) {
    return (
        split &&
        /^\d{6}$/.test(String(split.rrnFront || '')) &&
        /^\d{7}$/.test(String(split.rrnBack || ''))
    );
}

/** 기사정보등록 화면 — `TB_USER.RESIDENT_NO_ENC` 복호 평문 기준 표시(전체 미노출): `YYMMDD-C●●●●●●` */
function formatResidentNoDisplayFromPlain(plain) {
    const split = splitResidentNoPlainForProfileSetup(plain);
    if (isFullRrnSplitFromParts(split)) {
        return `${split.rrnFront}-${String(split.rrnBack).charAt(0)}●●●●●●`;
    }
    const s = String(plain ?? '').trim();
    const legacyOne = /^(\d{6})-(\d)$/.exec(s);
    if (legacyOne) {
        return `${legacyOne[1]}-${legacyOne[2]}●●●●●●`;
    }
    if (/^\d{6}$/.test(split.rrnFront || '') && String(split.rrnBack || '').length >= 1) {
        return `${split.rrnFront}-${String(split.rrnBack).charAt(0)}●●●●●●`;
    }
    return '';
}

// API: 기사 프로필 설정 (Profile Setup)
app.post('/api/driver/profile-setup', async (req, res) => {
    let connection;
    try {
        const {
            userId: loginUserIdBody,
            licenseType,
            licenseNo,
            licenseIssueDt,
            licenseExpiryDt,
            licenseSerialNo,
            qualCertNo,
            bioText,
            qualCertBase64,
            qualCertFileName,
            driverName,
            addrType,
            addrName,
            zipcode,
            address,
            detailAddress
        } = req.body;

        const qualCertNoTrim = qualCertNo != null ? String(qualCertNo).trim() : '';

        const loginUserId = (loginUserIdBody || '').trim();
        if (!loginUserId) return res.status(400).json({ error: 'userId is required' });

        const feePolicyTrim = normalizeDriverFeePolicyDtlCd(
            req.body.feePolicy != null ? String(req.body.feePolicy).trim() : ''
        );
        if (!feePolicyTrim) {
            return res.status(400).json({ error: '회원등급(FEE_POLICY)을 선택해 주세요.' });
        }
        if (!DRIVER_FEE_POLICY_DTL_CDS.includes(feePolicyTrim)) {
            return res.status(400).json({ error: '유효하지 않은 회원등급(FEE_POLICY)입니다.' });
        }

        const [uResolve] = await pool.execute(
            `SELECT CUST_ID, USER_ID, RESIDENT_NO_ENC FROM TB_USER WHERE USER_ID = ? LIMIT 1`,
            [loginUserId]
        );
        if (!uResolve.length) {
            return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
        }
        const custId = uResolve[0].CUST_ID;

        let residentPlain = '';
        try {
            if (uResolve[0].RESIDENT_NO_ENC) {
                residentPlain = decrypt(uResolve[0].RESIDENT_NO_ENC);
            }
        } catch (_) {
            residentPlain = '';
        }
        const residentSplit = splitResidentNoPlainForProfileSetup(residentPlain);
        const hasDbFullRrn = isFullRrnSplitFromParts(residentSplit);

        const addrT = String(addrType || '').trim().toUpperCase();
        if (!['HOME', 'OFFICE', 'OTHER'].includes(addrT)) {
            return res.status(400).json({ error: 'addrType은 HOME, OFFICE, OTHER 중 하나여야 합니다.' });
        }
        const zipTrim = String(zipcode || '').trim();
        const addrRoad = String(address || '').trim();
        const detailRaw = detailAddress ?? '';
        const detailTrim = graphemeSlices(detailRaw, 100).trim();

        let addrNm = '';
        if (addrT === 'OTHER') {
            addrNm = graphemeSlices(addrName ?? '', 10).trim();
            if (!addrNm) return res.status(400).json({ error: '주소 구분이 OTHER일 때 주소구분명칭은 필수입니다(최대 10자).' });
        }

        connection = await pool.getConnection();
        const ddMap = await driverDetailColumnMap(connection);
        const hasDriverDocsFileSize = await tableColumnExists(connection, 'TB_DRIVER_DOCS', 'FILE_SIZE');
        const hasFullLicense = [
            'LICENSE_TYPE',
            'LICENSE_NO',
            'LICENSE_SERIAL_NO',
            'LICENSE_ISSUE_DT',
            'LICENSE_EXPIRY_DT'
        ].every((n) => ddHas(ddMap, n));
        const hasQualPair = ddHas(ddMap, 'QUAL_CERT_NO') && ddHas(ddMap, 'QUAL_CERT_VERIFY_STATUS');
        const hasQualVerifyDtCol = ddHas(ddMap, 'QUAL_CERT_VERIFY_DT');

        const licenseRowForVerify = hasFullLicense
            ? await fetchDriverDetailLicenseRow(connection, custId)
            : null;
        const qualBirthRow = await fetchDriverDetailQualBirthRow(connection, custId);
        const existingDriverRow = licenseRowForVerify || qualBirthRow;

        const qualUnchanged =
            qualBirthRow && isQualCertUnchanged(qualBirthRow, { qualCertNo: qualCertNoTrim });

        let rrnFront6;
        let rrnBack7;
        let rrnForVerify;
        let sexDigit;
        /** TB_DRIVER_DETAIL.BIRTH_YMD — varchar(6) YYMMDD */
        let birthYmdYyMmDd;

        /** 주민번호는 본 API에서 수정하지 않으며 `TB_USER.RESIDENT_NO_ENC`만 사용한다. */
        if (!qualUnchanged) {
            if (!hasDbFullRrn) {
                connection.release();
                connection = undefined;
                return res.status(400).json({
                    error:
                        '회원(TB_USER)에 등록된 주민등록번호가 없거나 형식이 올바르지 않습니다. 회원가입·본인인증 등 다른 경로에서 주민번호를 등록한 뒤 다시 시도해 주세요.',
                });
            }
            rrnFront6 = residentSplit.rrnFront;
            rrnBack7 = residentSplit.rrnBack;
            rrnForVerify = `${rrnFront6}-${rrnBack7}`;
            sexDigit = rrnBack7.charAt(0);
            birthYmdYyMmDd = rrnFront6;
        } else if (hasDbFullRrn) {
            rrnFront6 = residentSplit.rrnFront;
            rrnBack7 = residentSplit.rrnBack;
            rrnForVerify = `${rrnFront6}-${rrnBack7}`;
            sexDigit = rrnBack7.charAt(0);
            birthYmdYyMmDd = rrnFront6;
        } else {
            const birthSource = qualBirthRow || licenseRowForVerify;
            if (!birthSource) {
                connection.release();
                connection = undefined;
                return res.status(400).json({
                    error:
                        '저장된 기사 정보가 없고 회원 주민등록번호도 확인할 수 없습니다. 회원 정보에서 주민등록번호를 등록한 뒤 다시 시도해 주세요.',
                });
            }
            birthYmdYyMmDd = String(
                birthSource.BIRTH_YMD != null
                    ? birthSource.BIRTH_YMD
                    : birthSource.birth_ymd != null
                      ? birthSource.birth_ymd
                      : ''
            )
                .trim()
                .slice(0, 6);
            sexDigit = String(
                birthSource.SEX != null ? birthSource.SEX : birthSource.sex != null ? birthSource.sex : ''
            )
                .trim()
                .charAt(0);
            if (!/^\d{6}$/.test(birthYmdYyMmDd) || !sexDigit) {
                connection.release();
                connection = undefined;
                return res.status(400).json({
                    error:
                        '버스운전 자격번호를 변경하지 않은 경우 저장된 생년월일·성별 정보 또는 회원 주민등록번호가 필요합니다.',
                });
            }
            rrnBack7 = `${sexDigit}000000`;
            rrnForVerify = `${birthYmdYyMmDd}-${rrnBack7}`;
        }

        const extVerify = await runDriverVerificationsForProfileSetup({
            driverName: (driverName || '').trim(),
            rrn: rrnForVerify,
            licenseNo,
            licenseSerialNo,
            qualCertNo: qualCertNoTrim,
            licenseType,
            licenseIssueDt,
            licenseExpiryDt,
            existingRow: existingDriverRow
        });
        if (!extVerify.ok) {
            connection.release();
            return res.status(400).json({
                error: extVerify.message || '면허·자격 진위 확인에 실패했습니다.',
                detail: extVerify.detail
            });
        }

        const tsOn = extVerify.results?.qual?.tsVerifyEnabled ?? false;
        const qualSkipReason = extVerify.results?.qual?.reason;
        const skipTsWithoutCall =
            extVerify.results?.qual?.skipped &&
            (qualSkipReason === 'unchanged_from_db' || qualSkipReason === 'empty_qual_no_verify');
        let qualCertVerifyStatus;
        if (!tsOn) {
            qualCertVerifyStatus = 'SKIPPED';
        } else if (skipTsWithoutCall) {
            if (qualSkipReason === 'empty_qual_no_verify') {
                qualCertVerifyStatus = 'UNVERIFIED';
            } else {
                qualCertVerifyStatus = existingDriverRow?.QUAL_CERT_VERIFY_STATUS || 'VERIFIED';
            }
        } else {
            qualCertVerifyStatus = 'VERIFIED';
        }
        const qualCertVerifyDt = qualCertVerifyStatus === 'VERIFIED' ? new Date() : null;

        const ddPkVal = String(custId ?? '').trim();

        await connection.beginTransaction();

        try {
            let latestQualSeqPadded = null;

            const detailAddrNameDb = addrT === 'OTHER' ? addrNm : null;

            const KEYS_DD_MIN = [
                'CUST_ID',
                'ZIPCODE',
                'ADDRESS',
                'DETAIL_ADDRESS',
                'ADDR_TYPE',
                'ADDR_NAME',
                'BIRTH_YMD',
                'SEX',
                'SELF_INTRO',
                'FEE_POLICY'
            ];
            const KEYS_DD_LICENSE_EXTRA = [
                'LICENSE_TYPE',
                'LICENSE_NO',
                'LICENSE_SERIAL_NO',
                'LICENSE_ISSUE_DT',
                'LICENSE_EXPIRY_DT'
            ];
            const KEYS_DD_QUAL_PAIR = ['QUAL_CERT_NO', 'QUAL_CERT_VERIFY_STATUS'];
            const KEYS_DD_QUAL_DT = ['QUAL_CERT_VERIFY_DT'];

            const vkDd = {
                CUST_ID: ddPkVal,
                ZIPCODE: zipTrim || null,
                ADDRESS: addrRoad || null,
                DETAIL_ADDRESS: detailTrim || null,
                ADDR_TYPE: addrT,
                ADDR_NAME: detailAddrNameDb,
                BIRTH_YMD: birthYmdYyMmDd || null,
                SEX: sexDigit,
                SELF_INTRO: bioText ?? '',
                FEE_POLICY: feePolicyTrim,
                LICENSE_TYPE: licenseType,
                LICENSE_NO: licenseNo,
                LICENSE_SERIAL_NO: licenseSerialNo || null,
                LICENSE_ISSUE_DT: licenseIssueDt,
                LICENSE_EXPIRY_DT: licenseExpiryDt,
                QUAL_CERT_NO: qualCertNoTrim,
                QUAL_CERT_VERIFY_STATUS: qualCertVerifyStatus,
                QUAL_CERT_VERIFY_DT: qualCertVerifyDt
            };

            if (!hasFullLicense) {
                await executeDriverDetailProfileUpsert(connection, ddMap, KEYS_DD_MIN, vkDd);
            } else if (!hasQualPair) {
                await executeDriverDetailProfileUpsert(
                    connection,
                    ddMap,
                    [...KEYS_DD_MIN, ...KEYS_DD_LICENSE_EXTRA],
                    vkDd
                );
            } else if (!hasQualVerifyDtCol) {
                await executeDriverDetailProfileUpsert(
                    connection,
                    ddMap,
                    [...KEYS_DD_MIN, ...KEYS_DD_LICENSE_EXTRA, ...KEYS_DD_QUAL_PAIR],
                    vkDd
                );
            } else {
                await executeDriverDetailProfileUpsert(
                    connection,
                    ddMap,
                    [...KEYS_DD_MIN, ...KEYS_DD_LICENSE_EXTRA, ...KEYS_DD_QUAL_PAIR, ...KEYS_DD_QUAL_DT],
                    vkDd,
                    { verifyDtCoalesce: true }
                );
            }

            if (qualCertBase64 && String(qualCertBase64).startsWith('data:')) {
                const hintNm = qualCertFileName != null ? String(qualCertFileName).trim() : '';
                const parsed = parseDataUrlPayload(String(qualCertBase64), hintNm || 'qualification');
                if (parsed?.buffer?.length) {
                    const MAX_DOC = 10 * 1024 * 1024;
                    if (parsed.buffer.length > MAX_DOC) {
                        await connection.rollback();
                        return res.status(400).json({ error: '자격증 파일은 10MB를 초과할 수 없습니다.' });
                    }

                    let nextSeq = 1;
                    try {
                        const [sq] = await connection.execute(
                            `SELECT COALESCE(MAX(DOC_TYPE_SEQ), 0) + 1 AS n
                             FROM TB_DRIVER_DOCS WHERE CUST_ID = ? AND DOC_TYPE = ?`,
                            [custId, QUALIFICATION_DOC_TYPE]
                        );
                        nextSeq = sq[0]?.n != null ? Number(sq[0].n) : 1;
                    } catch (seqErr) {
                        console.error(seqErr);
                    }

                    const seqPadded = String(nextSeq).padStart(20, '0');
                    const { orgFileNm, fileExt } = orgFileNmAndExt(hintNm || undefined, parsed);
                    const gcsRelPath = `QUALIFICATION/${seqPadded}.${fileExt}`;

                    const qualBuckets = bucketForName(DRIVER_QUAL_GCS_BUCKET);
                    const gcsFile = qualBuckets.file(gcsRelPath);
                    await gcsFile.save(parsed.buffer, {
                        metadata: { contentType: parsed.mime || 'application/octet-stream' },
                        resumable: false
                    });

                    if (hasDriverDocsFileSize) {
                        await connection.execute(
                            `
                        INSERT INTO TB_DRIVER_DOCS (
                            CUST_ID, DOC_TYPE, DOC_TYPE_SEQ, GCS_BUCKET_NM, GCS_PATH,
                            ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE, REG_DT
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        `,
                            [
                                custId,
                                QUALIFICATION_DOC_TYPE,
                                nextSeq,
                                DRIVER_QUAL_GCS_BUCKET,
                                gcsRelPath,
                                orgFileNm,
                                fileExt,
                                parsed.buffer.length
                            ]
                        );
                    } else {
                        await connection.execute(
                            `
                        INSERT INTO TB_DRIVER_DOCS (
                            CUST_ID, DOC_TYPE, DOC_TYPE_SEQ, GCS_BUCKET_NM, GCS_PATH,
                            ORG_FILE_NM, ORG_FILE_EXT, REG_DT
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                        `,
                            [
                                custId,
                                QUALIFICATION_DOC_TYPE,
                                nextSeq,
                                DRIVER_QUAL_GCS_BUCKET,
                                gcsRelPath,
                                orgFileNm,
                                fileExt
                            ]
                        );
                    }
                    latestQualSeqPadded = seqPadded;
                }
            }

            if (!latestQualSeqPadded && qualCertBase64) {
                const [lq] = await connection.execute(
                    `SELECT DOC_TYPE_SEQ FROM TB_DRIVER_DOCS
                     WHERE CUST_ID = ? AND DOC_TYPE = ? ORDER BY DOC_TYPE_SEQ DESC LIMIT 1`,
                    [custId, QUALIFICATION_DOC_TYPE]
                );
                if (lq.length) latestQualSeqPadded = String(lq[0].DOC_TYPE_SEQ).padStart(20, '0');
            }

            await connection.commit();

            let qualCertFileIdOut = latestQualSeqPadded;
            if (!qualCertFileIdOut) {
                const [lqAfter] = await pool.execute(
                    `SELECT DOC_TYPE_SEQ FROM TB_DRIVER_DOCS
                     WHERE CUST_ID = ? AND DOC_TYPE = ? ORDER BY DOC_TYPE_SEQ DESC LIMIT 1`,
                    [custId, QUALIFICATION_DOC_TYPE]
                );
                if (lqAfter.length) qualCertFileIdOut = String(lqAfter[0].DOC_TYPE_SEQ).padStart(20, '0');
            }

            let qualPostMeta = {};
            if (qualCertFileIdOut) {
                try {
                    const metaSql = hasDriverDocsFileSize
                        ? `SELECT ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE FROM TB_DRIVER_DOCS
                         WHERE CUST_ID = ? AND DOC_TYPE = ? AND LPAD(DOC_TYPE_SEQ, 20, '0') = ? LIMIT 1`
                        : `SELECT ORG_FILE_NM, ORG_FILE_EXT FROM TB_DRIVER_DOCS
                         WHERE CUST_ID = ? AND DOC_TYPE = ? AND LPAD(DOC_TYPE_SEQ, 20, '0') = ? LIMIT 1`;
                    const [metaRows] = await pool.execute(metaSql, [
                        custId,
                        QUALIFICATION_DOC_TYPE,
                        qualCertFileIdOut
                    ]);
                    if (metaRows[0]) {
                        const ex = String(metaRows[0].ORG_FILE_EXT || '')
                            .replace(/^\./, '')
                            .trim()
                            .toLowerCase();
                        qualPostMeta = {
                            hasQualCertFile: true,
                            qualCertOrgFileNm:
                                metaRows[0].ORG_FILE_NM != null
                                    ? String(metaRows[0].ORG_FILE_NM).trim()
                                    : '',
                            qualCertFileExt: ex,
                            qualCertFileSize:
                                hasDriverDocsFileSize && metaRows[0].FILE_SIZE != null
                                    ? Number(metaRows[0].FILE_SIZE)
                                    : null
                        };
                    }
                } catch (_) {
                    /* ignore */
                }
            }

            res.status(200).json({
                message: '기사 프로필 설정이 완료되었습니다.',
                qualCertVerifyStatus,
                qualCertFileId: qualCertFileIdOut || null,
                custId,
                ...qualPostMeta
            });
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- KG 이니시스 결제 준비 (서명 생성) ---
app.get('/api/payment/ready', async (req, res) => {
    try {
        const { reqId, driverId, amount } = req.query;
        if (!reqId || !amount) {
            return res.status(400).json({ error: 'reqId and amount are required' });
        }

        const mid = (process.env.INI_MID || 'INIpayTest').trim();
        // 분석 결과: INIpayTest의 정식 PC웹표준 키는 아래 값이 확실합니다.
        const signKey = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'; 
        
        // 1. 금액에서 숫자만 남기기
        let cleanAmount = String(amount).replace(/[^0-9]/g, '');
        
        // [안전장치] 테스트 모드일 경우 사고 방지를 위해 금액을 1,000원으로 강제 고정
        if (mid === 'INIpayTest') {
            console.log(`[PAY_SAFETY_V2] Test mode detected. Forcing amount from ${cleanAmount} to 1000 KRW.`);
            cleanAmount = '1000';
        }

        // 2. 타임스탬프 문자열 변환
        const timestamp = String(new Date().getTime());
        const oid = `${reqId}_${timestamp}`;

        // 3. 이니시스 웹 표준 결제 서명 공식
        const crypto = require('crypto');
        const signatureStr = `oid=${oid}&price=${cleanAmount}&timestamp=${timestamp}`;
        
        // 인코딩 'utf8' 명시 및 대문자 변환 (이니시스 공식 가이드 최적화)
        const signature = crypto.createHash('sha256').update(signatureStr, 'utf8').digest('hex').toUpperCase();
        const mKey = crypto.createHash('sha256').update(signKey, 'utf8').digest('hex').toUpperCase();

        console.log(`[PAY_READY] Used SignKey: ${signKey}`);
        console.log(`[PAY_READY] OID: ${oid}, Price: ${cleanAmount}, TS: ${timestamp}`);
        console.log(`[PAY_READY] SigStr: ${signatureStr}`);
        console.log(`[PAY_READY] Sig(UPPER): ${signature}`);

        res.json({
            mid,
            oid,
            timestamp,
            amount: cleanAmount,
            signature,
            mKey,
            buyertel: '01012345678',
            buyername: '홍길동'
        });
    } catch (error) {
        console.error('Payment ready error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- KG 이니시스 결제 결과 수신 및 최종 승인 (Return URL) ---
app.post('/api/payment/return', async (req, res) => {
    let connection;
    try {
        const { resultCode, resultMsg, mid, authUrl, authToken, merchantData } = req.body;
        console.log('[PAY_RETURN] Received result:', resultCode, resultMsg);

        if (resultCode !== '0000') {
            return res.send(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"></head><body>
                <script>alert("결제 실패: ${resultMsg}"); window.location.href="http://localhost:5173/quotation-list";</script>
                </body></html>
            `);
        }

        // 1. 이니시스 승인 API (Server-to-Server) 호출 준비
        const timestamp = String(new Date().getTime());
        // 정식 PC웹표준 테스트 키
        const signKey = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
        const crypto = require('crypto');
        const signatureStr = `authToken=${authToken}&timestamp=${timestamp}`;
        const signature = crypto.createHash('sha256').update(signatureStr, 'utf8').digest('hex').toUpperCase();

        const authRes = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                mid,
                authToken,
                timestamp,
                signature,
                format: 'JSON'
            })
        });

        const authText = await authRes.text();
        console.log('[PAY_AUTH] Raw Result:', authText);

        let authData;
        try {
            authData = JSON.parse(authText);
        } catch (e) {
            console.error('[PAY_AUTH] Failed to parse Inicis response as JSON:', authText);
            return res.send(`
                <html><head><meta charset="utf-8"></head><body>
                <script>alert("결제 승인 처리 중 오류가 발생했습니다. (포맷 불일치)"); window.close();</script>
                </body></html>
            `);
        }
        console.log('[PAY_AUTH] Auth Result:', authData.resultCode, authData.resultMsg);

        if (authData.resultCode !== '0000') {
            return res.send(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"></head><body>
                <script>alert("최종 승인 실패: ${authData.resultMsg}"); window.location.href="http://localhost:5173/quotation-list";</script>
                </body></html>
            `);
        }

        // 2. 결제 성공 -> DB 업데이트 (트랜잭션 처리)
        let reqId, driverId;
        console.log('[PAY_SUCCESS] Raw MerchantData:', merchantData);

        if (merchantData && merchantData.includes(':')) {
            // 새로운 단순 문자열 형식 (reqId:driverId)
            const parts = merchantData.split(':');
            reqId = parts[0];
            driverId = parts[1];
        } else {
            // 기존 JSON 형식 (혹시 모를 호환성 유지)
            try {
                // HTML Entity (&quot; 등) 처리
                const unescapedData = merchantData.replace(/&quot;/g, '"');
                const mData = JSON.parse(unescapedData);
                reqId = mData.reqId;
                driverId = mData.driverId;
            } catch (e) {
                console.error('MerchantData parse error:', e);
            }
        }
        
        console.log(`[PAY_SUCCESS] Target - ReqId: ${reqId}, DriverId: ${driverId}`);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (reqId && driverId) {
            // 3. 상태 업데이트 로직
            // 예약 내역 확정 상태로 변경
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM', MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DRIVER_ID = ? AND DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE')`,
                [reqId, driverId]
            );

            // 전체 요청 상태를 'CONFIRM'으로 변경
            await connection.execute(
                `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM', MOD_DT = NOW() WHERE REQ_ID = ?`,
                [reqId]
            );
            
            console.log(`[PAY_SUCCESS] Updated status for REQ_ID: ${reqId}, DRIVER_ID: ${driverId}`);
        }
        
        await connection.commit();

        res.send(`
            <!DOCTYPE html>
            <html><head><meta charset="utf-8"></head><body>
            <script>alert("결제가 완료되어 예약이 확정되었습니다!"); window.location.href="http://localhost:5173/quotation-list";</script>
            </body></html>
        `);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Payment return error:', error);
        res.send(`
            <!DOCTYPE html>
            <html><head><meta charset="utf-8"></head><body>
            <script>alert("결제 처리 중 오류 발생: ${error.message}"); window.location.href="http://localhost:5173/quotation-list";</script>
            </body></html>
        `);
    } finally {
        if (connection) connection.release();
    }
});

// --- 기사 상세 정보 및 리뷰 조회 ---
app.get('/api/driver/detail/:driverId', async (req, res) => {
    let connection;
    try {
        const { driverId } = req.params;
        connection = await pool.getConnection();

        // 1. 기사 핵심 정보 조회 (TB_USER + TB_BUS_DRIVER_VEHICLE + TB_DRIVER_DETAIL)
        const [driverRows] = await connection.execute(
            `SELECT 
                u.USER_NM as userNm, 
                u.PROFILE_FILE_ID as profilePhotoId,
                v.VEHICLE_NO as busNo,
                dd.SELF_INTRO as selfIntro
             FROM TB_USER u
             LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON u.CUST_ID = v.CUST_ID
             LEFT JOIN TB_DRIVER_DETAIL dd ON u.CUST_ID = dd.CUST_ID
             WHERE u.CUST_ID = ?`,
            [driverId]
        );

        if (driverRows.length === 0) {
            return res.status(404).json({ error: '기사 정보를 찾을 수 없습니다.' });
        }

        // 2. 해당 기사의 리뷰 목록 조회 (명칭 포함 조인)
        const [reviewRows] = await connection.execute(
            `SELECT 
                r.STAR_RATING as starRating,
                r.COMMENT_TEXT as commentText,
                r.REG_DT as regDt,
                u.USER_NM as writerName,
                aq.TRIP_TITLE as tripTitle
             FROM TB_TRIP_REVIEW r
             LEFT JOIN TB_USER u ON r.WRITER_ID = u.CUST_ID
             LEFT JOIN TB_BUS_RESERVATION br ON r.RES_ID = br.RES_ID
             LEFT JOIN TB_AUCTION_REQ aq ON br.REQ_ID = aq.REQ_ID
             WHERE r.DRIVER_ID = ?
             ORDER BY r.REG_DT DESC`,
            [driverId]
        );

        res.json({
            driver: driverRows[0],
            reviews: reviewRows
        });

    } catch (error) {
        console.error('[DRIVER_DETAIL_ERR]', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- 여행자의 기사 선택 취소 (거절 및 경매 재개) ---
app.post('/api/reservation/refuse-driver', async (req, res) => {
    let connection;
    try {
        const { reqId, driverId, travelerId } = req.body;
        if (!reqId || !driverId || !travelerId) {
            return res.status(400).json({ error: 'Missing required parameters (reqId, driverId, travelerId)' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log(`[REFUSE_DRIVER] Processing cancellation for REQ_ID: ${reqId}, DRIVER_ID: ${driverId}, Traveler: ${travelerId}`);

        // 1. 전체 경매 요청 상태를 다시 'AUCTION'으로 복구
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', MOD_DT = NOW(), MOD_ID = ? WHERE REQ_ID = ?`,
            [travelerId, reqId]
        );

        // 2. 해당 기사와의 예약 상세 상태를 'BUS_CANCEL'로 변경
        await connection.execute(
            `UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'BUS_CANCEL', MOD_DT = NOW(), MOD_ID = ? 
             WHERE REQ_ID = ? AND DRIVER_ID = ?`,
            [travelerId, reqId, driverId]
        );

        // 3. 여행자의 기사 취소 누적 횟수 증가 (TB_USER_CANCEL_MANAGE)
        // 설계서에 따라 여행자의 부분 취소(PARTIAL_BUS_CNT)를 기록함
        const [manageRows] = await connection.execute(
            `UPDATE TB_USER_CANCEL_MANAGE 
             SET CANCEL_TRAVELER_PARTIAL_BUS_CNT = CANCEL_TRAVELER_PARTIAL_BUS_CNT + 1, 
                 CANCEL_CNT = CANCEL_CNT + 1,
                 MOD_DT = NOW(), MOD_ID = ? 
             WHERE CUST_ID = ?`,
            [travelerId, travelerId]
        );

        // 만약 관리 레코드가 없다면 생성
        if (manageRows.affectedRows === 0) {
            await connection.execute(
                `INSERT INTO TB_USER_CANCEL_MANAGE (CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, REG_ID, MOD_ID) 
                 VALUES (?, 1, 1, ?, ?)`,
                [travelerId, travelerId, travelerId]
            );
        }

        await connection.commit();

        // 4. 기사에게 알림톡(SMS) 발송 예약 (TB_SMS_LOG)
        try {
            await pool.execute(
                `INSERT INTO TB_SMS_LOG (REQ_ID, SEND_CATEGORY, SENDER_ID, RECEIVER_ID, MSG_CONTENT, MSG_TYPE, SEND_STAT, REG_ID) 
                 VALUES (?, 'CANCEL_NOTICE', 'SYSTEM', ?, ?, 'SMS', 'PENDING', 'SYSTEM')`,
                [
                    reqId, 
                    driverId, 
                    `[BusTaams] 고객님의 요청으로 REQ_ID:${reqId} 견적 제안이 취소되었습니다.`,
                    'SYSTEM'
                ]
            );
            console.log(`[REFUSE_DRIVER] Notification queued for Driver: ${driverId}`);
        } catch (smsErr) {
            console.error('[REFUSE_DRIVER_SMS_ERR]', smsErr);
            // 알림 발송 실패는 전체 트랜잭션 실패로 간주하지 않음
        }

        res.json({ success: true, message: '기사 선택이 취소되고 경매가 재개되었습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[REFUSE_DRIVER_ERR]', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// 공통코드 (버스 종류 등)
app.get('/api/common-codes', async (req, res) => {
    let connection;
    try {
        const { grpCd } = req.query;
        if (!grpCd) return res.status(400).json({ error: 'grpCd is required' });
        connection = await pool.getConnection();
        const autoEnsure =
            ['1', 'true', 'yes'].includes(String(process.env.BUSTAAMS_AUTO_ENSURE_TABLES || '').toLowerCase());
        if (autoEnsure) {
            try {
                await ensureTbCommonCodeTable(connection);
            } catch (e) {
                const denied =
                    e.errno === 1142 ||
                    e.code === 'ER_TABLEACCESS_DENIED_ERROR' ||
                    (e.sqlMessage || e.message || '').includes('CREATE command denied');
                if (!denied) throw e;
                console.warn(
                    '[api/common-codes] ensureTbCommonCodeTable skipped (no CREATE privilege):',
                    e.sqlMessage || e.message
                );
            }
        }
        await seedBusTypeCodesIfEmpty(connection);
        const [rows] = await connection.execute(
            `SELECT DTL_CD AS dtlCd, CD_NM_KO AS cdNmKo, CD_FNUM AS cdFnum
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
 * GET /api/driver/qual-cert/meta?custId=&fileId=
 * CommonView doc mode용 자격증 사본 메타 조회 (TB_DRIVER_DOCS 소유 확인)
 */
app.get('/api/driver/qual-cert/meta', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const doc = await fetchQualCertDocRow(connection, custId, fileId);
        if (!doc) return res.status(404).json({ error: '파일 메타를 찾을 수 없습니다.' });
        const sizeBytes = Number(doc.FILE_SIZE) || 0;
        const ext = (doc.ORG_FILE_EXT || '').toLowerCase().replace(/^\./, '');
        const fileSizeLabel = sizeBytes >= 1048576
            ? `${(sizeBytes / 1048576).toFixed(1)}MB`
            : sizeBytes >= 1024
              ? `${(sizeBytes / 1024).toFixed(0)}KB`
              : `${sizeBytes}B`;
        let regDtLabel = '';
        if (doc.REG_DT && !Number.isNaN(new Date(doc.REG_DT).getTime())) {
            const dt = new Date(doc.REG_DT);
            regDtLabel = `${dt.getFullYear()}년 ${String(dt.getMonth() + 1).padStart(2, '0')}월 ${String(dt.getDate()).padStart(2, '0')}일`;
        }
        res.json({
            fileId: String(fileId),
            fileCategory: 'BUS_QUAL_CERT',
            orgFileNm: doc.ORG_FILE_NM || '',
            fileExt: ext,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel
        });
    } catch (e) {
        console.error('qual-cert/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/driver/qual-cert/file?custId=&fileId=
 * 자격증 사본 파일 스트리밍 (TB_DRIVER_DOCS 소유 확인)
 */
app.get('/api/driver/qual-cert/file', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const doc = await fetchQualCertDocRow(connection, custId, fileId);
        if (!doc) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, ORG_FILE_EXT } = doc;
        const gcsFile = bucketForName(GCS_BUCKET_NM).file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const extRaw = ((ORG_FILE_EXT || '').startsWith('.') ? (ORG_FILE_EXT || '').slice(1) : (ORG_FILE_EXT || '')).toLowerCase();
        const ext = extRaw.replace(/^\./, '');
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
 * GET /api/driver/qual-cert/download?custId=&fileId=
 * 자격증 사본 파일 다운로드 (Content-Disposition: attachment)
 */
app.get('/api/driver/qual-cert/download', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessQualCertFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const doc = await fetchQualCertDocRow(connection, custId, fileId);
        if (!doc) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, ORG_FILE_EXT } = doc;
        const gcsFile = bucketForName(GCS_BUCKET_NM).file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });
        const safeNm = joinOrgFileDisplayName(ORG_FILE_NM || 'qual_cert', (ORG_FILE_EXT || '').replace(/^\./, '') || 'file');
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
 * GET /api/common-view/bus-document/meta?custId=&fileId=
 */
app.get('/api/common-view/bus-document/meta', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT FILE_ID AS fileId,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
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
            fileId: row.fileId,
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
 * GET /api/common-view/bus-document/download?custId=&fileId=
 * Content-Disposition: attachment — 파일명: ORG_FILE_NM.FILE_EXT
 */
app.get('/api/common-view/bus-document/download', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucketForName(GCS_BUCKET_NM).file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf')                     ct = 'application/pdf';
        else if (ext === 'png')                ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp')               ct = 'image/webp';

        const downloadName = joinOrgFileDisplayName(ORG_FILE_NM || 'file', ext);
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

// 기사 소유 차량 조회
app.get('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const { custId } = req.query;
        if (!custId) return res.status(400).json({ error: 'custId is required' });
        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row) return res.json({ bus: null });

        const amenities = typeof row.AMENITIES === 'string' ? JSON.parse(row.AMENITIES || '{}') : (row.AMENITIES || {});
        let photoFileIds = row.VEHICLE_PHOTOS_JSON;
        if (typeof photoFileIds === 'string') {
            try { photoFileIds = JSON.parse(photoFileIds); } catch (e) { photoFileIds = []; }
        }
        if (!Array.isArray(photoFileIds)) photoFileIds = [];

        const bizRegFile = await fileMetaById(connection, row.bizRegId);
        const transLicFile = await fileMetaById(connection, row.transLicId);
        const insCertFile = await fileMetaById(connection, row.insCertId);

        res.json({
            bus: {
                busId: row.busId,
                custId: row.custId,
                vehicleNo: row.VEHICLE_NO,
                modelNm: row.MODEL_NM,
                manufactureYear: row.MANUFACTURE_YEAR,
                mileage: row.MILEAGE,
                serviceClass: row.SERVICE_CLASS,
                amenities,
                hasAdas: row.HAS_ADAS === 'Y',
                lastInspectDt: row.lastInspectDt || '',
                insuranceExpDt: row.insuranceExpDt || '',
                bizRegFile: bizRegFile ? { fileId: bizRegFile.fileId, orgFileNm: bizRegFile.ORG_FILE_NM, fileExt: bizRegFile.FILE_EXT } : null,
                transLicFile: transLicFile ? { fileId: transLicFile.fileId, orgFileNm: transLicFile.ORG_FILE_NM, fileExt: transLicFile.FILE_EXT } : null,
                insCertFile: insCertFile ? { fileId: insCertFile.fileId, orgFileNm: insCertFile.ORG_FILE_NM, fileExt: insCertFile.FILE_EXT } : null,
                vehiclePhotoFileIds: photoFileIds
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
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessBusFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [rows] = await connection.execute(
            `SELECT GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const { GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT } = rows[0];
        const gcsFile = bucketForName(GCS_BUCKET_NM).file(GCS_PATH);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';

        res.setHeader('Content-Type', ct);
        res.setHeader(
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(joinOrgFileDisplayName(ORG_FILE_NM || 'file', ext))}`
        );
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

/**
 * CommonView — 청약 취소 증빙 메타 (최신 TB_USER_CANCEL_HIST 의 REASON_DOC_FILE_NM 에 등록된 파일만)
 * GET /api/common-view/driver-cancel-proof/meta?custId=&fileId=
 */
app.get('/api/common-view/driver-cancel-proof/meta', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessDriverCancelProofFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT FILE_ID AS fileId,
                    FILE_CATEGORY AS fileCategory,
                    ORG_FILE_NM  AS orgFileNm,
                    FILE_EXT     AS fileExt,
                    FILE_SIZE    AS fileSizeBytes,
                    DATE_FORMAT(REG_DT, '%Y년 %m월 %d일') AS regDtLabel
             FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
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
            fileId: row.fileId,
            fileCategory: row.fileCategory,
            orgFileNm: row.orgFileNm,
            fileExt: row.fileExt,
            fileSizeBytes: sizeBytes,
            fileSizeLabel,
            regDtLabel: row.regDtLabel,
        });
    } catch (e) {
        console.error('common-view/driver-cancel-proof/meta:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * CommonView — 청약 취소 증빙 다운로드
 * GET /api/common-view/driver-cancel-proof/download?custId=&fileId=
 */
app.get('/api/common-view/driver-cancel-proof/download', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessDriverCancelProofFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });
        const [rows] = await connection.execute(
            `SELECT GCS_BUCKET_NM, GCS_PATH, FILE_CATEGORY, ORG_FILE_NM, FILE_EXT FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const row = rows[0];
        const objectKey = resolveGcsObjectKey(row, fileId);
        const gcsFile = bucketForName(row.GCS_BUCKET_NM).file(objectKey);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (row.FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';

        const downloadName = joinOrgFileDisplayName(row.ORG_FILE_NM || 'file', ext);
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (driver-cancel-proof download):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('common-view/driver-cancel-proof/download:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 청약 취소 증빙 스트리밍 (CommonView iframe/img)
 * GET /api/driver/driver-cancel-proof/file?custId=&fileId=
 */
app.get('/api/driver/driver-cancel-proof/file', async (req, res) => {
    let connection;
    try {
        const { custId, fileId } = req.query;
        if (!custId || !fileId) return res.status(400).json({ error: 'custId and fileId are required' });
        connection = await pool.getConnection();
        const ok = await canAccessDriverCancelProofFile(connection, custId, fileId);
        if (!ok) return res.status(403).json({ error: '접근할 수 없는 파일입니다.' });

        const [rows] = await connection.execute(
            `SELECT GCS_PATH, FILE_CATEGORY, ORG_FILE_NM, FILE_EXT, GCS_BUCKET_NM FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
            [fileId]
        );
        if (rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        const row = rows[0];
        const objectKey = resolveGcsObjectKey(row, fileId);
        const gcsFile = bucketForName(row.GCS_BUCKET_NM).file(objectKey);
        const [exists] = await gcsFile.exists();
        if (!exists) return res.status(404).json({ error: '스토리지에 파일이 없습니다.' });

        const ext = (row.FILE_EXT || '').toLowerCase();
        let ct = 'application/octet-stream';
        if (ext === 'pdf') ct = 'application/pdf';
        else if (ext === 'png') ct = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') ct = 'image/jpeg';
        else if (ext === 'webp') ct = 'image/webp';

        res.setHeader('Content-Type', ct);
        res.setHeader(
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(joinOrgFileDisplayName(row.ORG_FILE_NM || 'file', ext))}`
        );
        gcsFile.createReadStream().on('error', (err) => {
            console.error('GCS read (driver-cancel-proof):', err);
            if (!res.headersSent) res.status(500).end();
        }).pipe(res);
    } catch (e) {
        console.error('driver-cancel-proof/file:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// CustomerDashboard API
app.get('/api/customer/active-request', async (req, res) => {
    const { custId } = req.query;
    if (!custId) return res.status(400).json({ error: 'custId is required' });
    try {
        const safeCustId = String(custId || '').padStart(10, '0');
        
        // 1. 패널티 정보 조회
        const [penaltyRows] = await pool.execute(
            `SELECT TRADE_RESTRICT_YN FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?`,
            [safeCustId]
        );
        
        const isRestricted = penaltyRows.length > 0 && penaltyRows[0].TRADE_RESTRICT_YN === 'Y';
        console.log(`[DEBUG] Dashboard Penalty Check - CUST_ID: ${safeCustId}, isRestricted: ${isRestricted}`);
        const tradeRestrictYn = isRestricted ? 'Y' : 'N';

        // 2. 활성 요청 조회
        const [rows] = await pool.execute(
            `SELECT REQ_ID, TRIP_TITLE, START_ADDR, END_ADDR, PASSENGER_CNT, DATA_STAT, START_DT
             FROM TB_AUCTION_REQ
             WHERE TRAVELER_ID = ? AND DATA_STAT = 'AUCTION'
             ORDER BY REG_DT DESC LIMIT 1`,
            [safeCustId]
        );

        const penaltyInfo = {
            tradeRestrictYn
        };

        if (rows.length === 0) {
            return res.json({ ...penaltyInfo });
        }

        const r = rows[0];
        res.json({
            id: r.REQ_ID,
            route: `${r.START_ADDR} → ${r.END_ADDR}`,
            subTitle: r.TRIP_TITLE,
            startDt: formatDateYmd(r.START_DT),
            description: `대형 · ${r.PASSENGER_CNT}명`,
            status: r.DATA_STAT,
            ...penaltyInfo
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API: 버스 정보 등록 (신규)
app.post('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const {
            custId, vehicleNo, modelNm, manufactureYear, mileage,
            serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt,
            businessLicenseBase64, businessLicenseFileName,
            transportationLicenseBase64, transportationLicenseFileName,
            insurancePolicyBase64, insurancePolicyFileName,
            vehiclePhotos
        } = req.body;

        if (!custId || !vehicleNo) {
            return res.status(400).json({ error: 'custId and vehicleNo are required' });
        }
        if (!serviceClass) {
            return res.status(400).json({ error: 'serviceClass is required' });
        }

        connection = await pool.getConnection();

        const existing = await fetchBusRowForUser(connection, custId);
        if (existing) {
            return res.status(409).json({ error: '이미 등록된 차량이 있습니다. 수정 화면에서 변경해 주세요.' });
        }

        // [ID 생성] 최신 BUS_ID 가져오기
        const [maxRows] = await connection.execute('SELECT MAX(BUS_ID) as maxId FROM TB_BUS_DRIVER_VEHICLE');
        const busId = generateNextNumericId(maxRows[0].maxId || '0', 10);

        const adasYn = hasAdas === true || hasAdas === 'Y' ? 'Y' : 'N';
        const amenObj = { ...(amenities || {}), adas: adasYn === 'Y' };

        await connection.beginTransaction();
        try {
            await connection.execute(
                `INSERT INTO TB_BUS_DRIVER_VEHICLE (
                    BUS_ID, CUST_ID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR,
                    MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS, LAST_INSPECT_DT, INSURANCE_EXP_DT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    busId, custId, vehicleNo, modelNm || '', manufactureYear || '',
                    Number(mileage) || 0, serviceClass, JSON.stringify(amenObj), adasYn,
                    lastInspectDt || null, insuranceExpDt || null
                ]
            );

            const fileIds = {};
            const docMap = [
                { key: 'biz', field: businessLicenseBase64, name: businessLicenseFileName, cat: BUS_DOC_FILE_CATEGORY.BIZ_REG, col: 'BIZ_REG_FILE_ID' },
                { key: 'trans', field: transportationLicenseBase64, name: transportationLicenseFileName, cat: BUS_DOC_FILE_CATEGORY.TRANSPORT_PERMIT, col: 'TRANS_LIC_FILE_ID' },
                { key: 'ins', field: insurancePolicyBase64, name: insurancePolicyFileName, cat: BUS_DOC_FILE_CATEGORY.INSURANCE, col: 'INS_CERT_FILE_ID' },
            ];

            const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
            let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';

            for (const d of docMap) {
                if (!d.field || typeof d.field !== 'string') continue;
                const parsed = parseDataUrlPayload(d.field, d.name || 'doc');
                if (!parsed) continue;

                const fid = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = fid;
                const { orgFileNm, fileExt } = orgFileNmAndExt(d.name, parsed);
                const gcsPath = `${d.cat}/${custId}/${fid}.${fileExt}`;

                await insertBusFileMaster(connection, {
                    fileId: fid,
                    category: d.cat,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm,
                    fileExt,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime,
                });
                fileIds[d.key] = fid;
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET ${d.col} = ? WHERE BUS_ID = ?`,
                    [fid, busId]
                );
            }

            const photoIdList = [];
            if (Array.isArray(vehiclePhotos) && vehiclePhotos.length > 0) {
                const slice = vehiclePhotos.slice(0, 8);
                for (const ph of slice) {
                    const raw = ph.base64 || ph.dataUrl;
                    const nm = ph.fileName || ph.name || 'photo';
                    if (!raw) continue;
                    const parsed = parseDataUrlPayload(typeof raw === 'string' && raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`, nm);
                    if (!parsed) continue;

                    const fid = generateNextNumericId(currentMaxFileId, 20);
                    currentMaxFileId = fid;
                    const { orgFileNm, fileExt } = orgFileNmAndExt(nm, parsed);
                    const gcsPath = `${BUS_PHOTO_FILE_CATEGORY}/${custId}/${fid}.${fileExt}`;

                    await insertBusFileMaster(connection, {
                        fileId: fid,
                        category: BUS_PHOTO_FILE_CATEGORY,
                        gcsPath,
                        buffer: parsed.buffer,
                        orgFileNm,
                        fileExt,
                        fileSize: parsed.buffer.length,
                        contentType: parsed.mime,
                    });
                    photoIdList.push(fid);
                }
                await connection.execute(
                    `UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = ?`,
                    [JSON.stringify(photoIdList), busId]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: '차량 등록이 완료되었습니다.',
                busId: busId,
                fileIds: Object.keys(fileIds).length ? fileIds : undefined,
                vehiclePhotoFileIds: photoIdList.length ? photoIdList : undefined
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


// PATCH: 차량 기본 정보(스칼라) 수정
app.patch('/api/driver/bus', async (req, res) => {
    let connection;
    try {
        const { custId, busId, vehicleNo, modelNm, manufactureYear, mileage, serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt } =
            req.body || {};
        if (!custId) return res.status(400).json({ error: 'custId is required' });
        if (!busId) return res.status(400).json({ error: 'busId is required' });
        if (!vehicleNo || !serviceClass) {
            return res.status(400).json({ error: 'vehicleNo and serviceClass are required' });
        }

        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row || String(row.busId) !== String(busId)) {
            return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
        }

        const adasYn = hasAdas === true || hasAdas === 'Y' ? 'Y' : 'N';
        const amenObj = { ...(amenities || {}), adas: adasYn === 'Y' };

        await connection.execute(
            `UPDATE TB_BUS_DRIVER_VEHICLE
             SET VEHICLE_NO = ?, MODEL_NM = ?, MANUFACTURE_YEAR = ?, MILEAGE = ?, SERVICE_CLASS = ?,
                 AMENITIES = ?, HAS_ADAS = ?, LAST_INSPECT_DT = ?, INSURANCE_EXP_DT = ?
             WHERE BUS_ID = ? AND CUST_ID = ?`,
            [
                vehicleNo,
                modelNm || '',
                manufactureYear || '',
                Number(mileage) || 0,
                serviceClass,
                JSON.stringify(amenObj),
                adasYn,
                lastInspectDt || null,
                insuranceExpDt || null,
                busId,
                custId,
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


// PATCH: 차량 서류만 갱신
app.patch('/api/driver/bus/documents', async (req, res) => {
    let connection;
    try {
        const {
            custId,
            busId,
            businessLicenseBase64,
            businessLicenseFileName,
            transportationLicenseBase64,
            transportationLicenseFileName,
            insurancePolicyBase64,
            insurancePolicyFileName,
        } = req.body || {};
        if (!custId || !busId) return res.status(400).json({ error: 'custId and busId are required' });

        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row || String(row.busId) !== String(busId)) {
            return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
        }

        const docMap = [
            { field: businessLicenseBase64, name: businessLicenseFileName, cat: BUS_DOC_FILE_CATEGORY.BIZ_REG, col: 'BIZ_REG_FILE_ID' },
            { field: transportationLicenseBase64, name: transportationLicenseFileName, cat: BUS_DOC_FILE_CATEGORY.TRANSPORT_PERMIT, col: 'TRANS_LIC_FILE_ID' },
            { field: insurancePolicyBase64, name: insurancePolicyFileName, cat: BUS_DOC_FILE_CATEGORY.INSURANCE, col: 'INS_CERT_FILE_ID' },
        ];

        const hasAny = docMap.some((d) => d.field && typeof d.field === 'string');
        if (!hasAny) return res.status(400).json({ error: '갱신할 서류(base64)가 없습니다.' });

        const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
        let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';
        const fileIds = {};

        await connection.beginTransaction();
        try {
            for (const d of docMap) {
                if (!d.field || typeof d.field !== 'string') continue;
                const parsed = parseDataUrlPayload(d.field, d.name || 'doc');
                if (!parsed) continue;
                const fid = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = fid;
                const { orgFileNm, fileExt } = orgFileNmAndExt(d.name, parsed);
                const gcsPath = `${d.cat}/${custId}/${fid}.${fileExt}`;
                await insertBusFileMaster(connection, {
                    fileId: fid,
                    category: d.cat,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm,
                    fileExt,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime,
                });
                if (d.col === 'BIZ_REG_FILE_ID') fileIds.biz = fid;
                if (d.col === 'TRANS_LIC_FILE_ID') fileIds.trans = fid;
                if (d.col === 'INS_CERT_FILE_ID') fileIds.ins = fid;
                await connection.execute(`UPDATE TB_BUS_DRIVER_VEHICLE SET ${d.col} = ? WHERE BUS_ID = ?`, [fid, busId]);
            }
            await connection.commit();
            res.json({ message: '차량 서류가 갱신되었습니다.', fileIds: Object.keys(fileIds).length ? fileIds : undefined });
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    } catch (e) {
        console.error('PATCH driver/bus/documents:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});


// API: 차량 사진 목록 교체
app.patch('/api/driver/bus/photos', async (req, res) => {
    let connection;
    try {
        const { custId, busId, vehiclePhotos } = req.body;
        if (!custId || !busId) return res.status(400).json({ error: 'custId and busId are required' });
        connection = await pool.getConnection();
        const row = await fetchBusRowForUser(connection, custId);
        if (!row || String(row.busId) !== String(busId)) return res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });

        const outList = [];
        const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
        let currentMaxFileId = maxFileRows[0].maxId || '00000000000000000000';
        await connection.beginTransaction();
        try {
            for (const ph of (vehiclePhotos || []).slice(0, 8)) {
                if (ph.fileId && !ph.base64 && !ph.dataUrl) {
                    outList.push(String(ph.fileId));
                    continue;
                }
                const parsed = parseDataUrlPayload(ph.base64 || ph.dataUrl, ph.fileName || 'photo');
                if (!parsed) continue;
                const fid = generateNextNumericId(currentMaxFileId, 20);
                currentMaxFileId = fid;
                const { orgFileNm, fileExt } = orgFileNmAndExt(ph.fileName || 'photo', parsed);
                const gcsPath = `${BUS_PHOTO_FILE_CATEGORY}/${custId}/${fid}.${fileExt}`;
                await insertBusFileMaster(connection, {
                    fileId: fid,
                    category: BUS_PHOTO_FILE_CATEGORY,
                    gcsPath,
                    buffer: parsed.buffer,
                    orgFileNm,
                    fileExt,
                    fileSize: parsed.buffer.length,
                    contentType: parsed.mime,
                });
                outList.push(fid);
            }
            await connection.execute(`UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_PHOTOS_JSON = ? WHERE BUS_ID = ?`, [JSON.stringify(outList), busId]);
            await connection.commit();
            res.json({ message: '차량 사진이 갱신되었습니다.', vehiclePhotoFileIds: outList });
        } catch (err) { await connection.rollback(); throw err; }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { if (connection) connection.release(); }
});

// ─── 여행자 견적 요청 상세 — 입찰 등록/수정 · 입찰 취소(선택 API) ───────────────────

app.put('/api/traveler-quote-request-details/bid', async (req, res) => {
    const REQ_BUS_NOT_AUCTION_MSG = '버스 요청 상태가 아닙니다. 여행자 견적 목록 조회후 견적 응찰하세요';
    let connection;
    try {
        const { reqId, custId, reqBusSeq } = req.body;
        const busSeqNum = Number(reqBusSeq);
        if (!reqId || !custId) return res.status(400).json({ error: 'reqId와 custId가 필요합니다.' });
        if (reqBusSeq === undefined || reqBusSeq === null || Number.isNaN(busSeqNum) || busSeqNum < 0) {
            return res.status(400).json({ error: 'reqBusSeq가 필요합니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [auctionRows] = await connection.execute(
            `SELECT TRAVELER_ID AS travelerId FROM TB_AUCTION_REQ WHERE REQ_ID = ? LIMIT 1`,
            [reqId]
        );
        const auction = auctionRows[0];
        if (!auction) {
            await connection.rollback();
            return res.status(404).json({ error: '견적 요청을 찾을 수 없습니다.' });
        }

        const [busRows] = await connection.execute(
            `SELECT REQ_BUS_SEQ AS reqBusSeq, DATA_STAT AS dataStat,
                    COALESCE(RES_BUS_AMT, 0) AS resBusAmt,
                    COALESCE(RES_FEE_TOTAL_AMT, 0) AS resFeeTotalAmt,
                    COALESCE(RES_FEE_REFUND_AMT, 0) AS resFeeRefundAmt,
                    COALESCE(RES_FEE_ATTRIBUTION_AMT, 0) AS resFeeAttributionAmt
               FROM TB_AUCTION_REQ_BUS
              WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
            [reqId, busSeqNum]
        );
        if (busRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '요청 차량 정보(TB_AUCTION_REQ_BUS)가 없습니다.' });
        }
        const br = busRows[0];

        const [existingRes] = await connection.execute(
            `SELECT RES_ID AS resId, DATA_STAT AS dataStat
               FROM TB_BUS_RESERVATION
              WHERE REQ_ID = ? AND DRIVER_ID = ?
              ORDER BY REG_DT DESC
              LIMIT 1`,
            [reqId, custId]
        );
        const cur = existingRes[0];
        const editableStats = new Set(['BIDDING', 'AUCTION', 'REQ']);
        const isUpdate = cur != null && editableStats.has(cur.dataStat);

        if (br.dataStat !== 'AUCTION') {
            await connection.rollback();
            return res.status(409).json({
                error: REQ_BUS_NOT_AUCTION_MSG,
                code: 'REQ_BUS_NOT_AUCTION',
            });
        }

        const drvVehicle = await fetchBusRowForUser(connection, custId);
        const busIdFromSpec = drvVehicle?.SERVICE_CLASS != null ? String(drvVehicle.SERVICE_CLASS) : null;
        const driverBiddingPrice = Number(br.resBusAmt) || 0;
        const feeTotal = Number(br.resFeeTotalAmt) || 0;
        const feeRefund = Number(br.resFeeRefundAmt) || 0;
        const feeAttr = Number(br.resFeeAttributionAmt) || 0;

        let outResId;
        let okMessage;
        let isNewReservation = false;

        const modId = String(custId).trim();

        if (isUpdate) {
            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS
                    SET DATA_STAT = 'BIDDING', MOD_DT = NOW(), MOD_ID = ?
                  WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                [modId, reqId, busSeqNum]
            );
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION SET
                    DRIVER_BIDDING_PRICE = ?,
                    RES_FEE_TOTAL_AMT = ?, RES_FEE_REFUND_AMT = ?, RES_FEE_ATTRIBUTION_AMT = ?,
                    BUS_ID = ?, MOD_DT = NOW(), MOD_ID = ?
                  WHERE RES_ID = ?`,
                [driverBiddingPrice, feeTotal, feeRefund, feeAttr, busIdFromSpec, modId, cur.resId]
            );
            outResId = cur.resId;
            okMessage = '입찰 정보가 갱신되었습니다.';
        } else {
            const blockNewBid = new Set(['CONFIRM', 'DONE', 'TRAVELER_CANCEL', 'BUS_CHANGE', 'BUS_CANCEL']);
            if (cur && blockNewBid.has(cur.dataStat)) {
                await connection.rollback();
                return res.status(409).json({ error: `현재 상태(${cur.dataStat})에서는 입찰를 등록할 수 없습니다.`, resStat: cur.dataStat });
            }

            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS
                    SET DATA_STAT = 'BIDDING', MOD_DT = NOW(), MOD_ID = ?
                  WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                [modId, reqId, busSeqNum]
            );

            const [maxNumRows] = await connection.execute(
                `SELECT COALESCE(MAX(CAST(RES_ID AS UNSIGNED)), 0) AS maxNum FROM TB_BUS_RESERVATION`
            );
            const maxRowNum = maxNumRows[0]?.maxNum ?? 0;
            const newResId = generateNextNumericId(maxRowNum, 10);

            await connection.execute(
                `INSERT INTO TB_BUS_RESERVATION (
                    RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, BUS_ID,
                    DRIVER_BIDDING_PRICE, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                    DATA_STAT, REG_DT, REG_ID, MOD_DT, MOD_ID
                 ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'BIDDING', NOW(), ?, NOW(), ?)`,
                [
                    newResId,
                    reqId,
                    auction.travelerId,
                    custId,
                    busIdFromSpec,
                    driverBiddingPrice,
                    feeTotal,
                    feeRefund,
                    feeAttr,
                    modId,
                    modId,
                ]
            );
            outResId = newResId;
            okMessage = '입찰 정보가 등록되었습니다.';
            isNewReservation = true;
        }

        const [cntAggRows] = await connection.execute(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN DATA_STAT = 'BIDDING' THEN 1 ELSE 0 END) AS biddingCnt
               FROM TB_AUCTION_REQ_BUS
              WHERE REQ_ID = ?`,
            [reqId]
        );
        const cntAgg = cntAggRows[0];
        if (Number(cntAgg.total) > 0 && Number(cntAgg.biddingCnt) === Number(cntAgg.total)) {
            await connection.execute(
                `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'BIDDING', MOD_DT = NOW(), MOD_ID = ? WHERE REQ_ID = ?`,
                [modId, reqId]
            );
        }

        const momR = await applyMomMemberAfterBid(connection, custId);
        if (!momR.ok) {
            await connection.rollback();
            return res.status(momR.status).json({
                error: momR.lines.join('\n'),
                errorCode: momR.code,
                modalLines: momR.lines,
            });
        }

        await connection.commit();
        res.json({
            success: true,
            message: okMessage,
            resId: outResId,
            isNewReservation,
            momMember: momR.payload,
        });
    } catch (e) {
        if (connection) {
            try { await connection.rollback(); } catch (_) { /* noop */ }
        }
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/** (화면 미노출) 기사 입찰 철회 — 설계 ENUM 기준 DRIVER_CANCEL */
app.put('/api/traveler-quote-request-details/bid-cancel', async (req, res) => {
    let connection;
    try {
        const { reqId, custId } = req.body;
        if (!reqId || !custId) return res.status(400).json({ error: 'reqId와 custId가 필요합니다.' });
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT RES_ID, DATA_STAT FROM TB_BUS_RESERVATION
              WHERE REQ_ID = ? AND DRIVER_ID = ?
              ORDER BY REG_DT DESC LIMIT 1`,
            [reqId, custId]
        );
        const row = rows[0];
        if (!row) return res.status(404).json({ error: '입찰 정보를 찾을 수 없습니다.' });
        if (row.DATA_STAT !== 'BIDDING' && row.DATA_STAT !== 'AUCTION') {
            return res.status(409).json({ error: `현재 상태(${row.DATA_STAT})에서는 취소할 수 없습니다.` });
        }
        await connection.execute(
            `UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'DRIVER_CANCEL', MOD_DT = NOW() WHERE RES_ID = ?`,
            [row.RES_ID]
        );
        res.json({ success: true, message: '입찰이 취소되었습니다.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * `BusTaams_Project 테이블 설계.md`: TB_BUS_RESERVATION.DRIVER_ID = TB_USER.CUST_ID.
 */
async function resolveDriverCustIdForReservations(connection, raw) {
    const cands = custIdMatchCandidates(String(raw || '').trim());
    if (!cands.length) return '';
    const inPh = cands.map(() => '?').join(', ');
    const [rows] = await connection.execute(
        `SELECT TRIM(CUST_ID) AS CUST_ID FROM TB_USER WHERE TRIM(CUST_ID) IN (${inPh}) LIMIT 1`,
        cands
    );
    if (rows[0]?.CUST_ID != null && String(rows[0].CUST_ID).trim() !== '') {
        return String(rows[0].CUST_ID).trim();
    }
    return '';
}

/**
 * TB_BUS_RESERVATION.DRIVER_ID 가 CUST_ID(0패딩 10자) / 숫자만 등으로 혼재할 수 있어 IN 매칭에 사용한다.
 */
function collectDriverReservationIdVariants(...candidates) {
    const out = new Set();
    for (const c of candidates) {
        const s = c != null ? String(c).trim() : '';
        if (!s) continue;
        out.add(s);
        if (/^[0-9]+$/.test(s)) {
            const n = parseInt(s, 10);
            if (Number.isFinite(n)) {
                out.add(String(n));
                out.add(String(n).padStart(10, '0'));
            }
        }
    }
    return [...out];
}

async function driverReservationDriverKeys(connection, raw) {
    const custId = await resolveDriverCustIdForReservations(connection, raw);
    if (!custId) return [];
    return collectDriverReservationIdVariants(...custIdMatchCandidates(custId));
}

/**
 * 여행자 견적 목록 (역경매)
 * GET /api/list-of-traveler-quotations?driverId=
 * - TB_AUCTION_REQ.DATA_STAT = 'AUCTION', waypointCount = VIA IN (START_WAY, END_WAY)
 */
app.get('/api/list-of-traveler-quotations', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { driverId } = req.query;

        const sameDayBlock = driverId
            ? ` AND NOT EXISTS (
                SELECT 1
                  FROM TB_BUS_RESERVATION res
                  INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res.REQ_ID
                 WHERE res.DRIVER_ID = ?
                   AND res.DATA_STAT = 'CONFIRM'
                   AND DATE(ar.START_DT) = DATE(r.START_DT)
                   AND ar.REQ_ID <> r.REQ_ID
              )`
            : '';

        const params = driverId ? [driverId] : [];

        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                         AS reqId,
                r.TRIP_TITLE                     AS tripTitle,
                r.START_ADDR                     AS startAddr,
                r.END_ADDR                       AS endAddr,
                r.START_DT                       AS startDt,
                r.END_DT                         AS endDt,
                r.PASSENGER_CNT                  AS passengerCnt,
                r.DATA_STAT                      AS reqStat,
                COALESCE(r.REQ_AMT, 0)           AS estTotalServicePrice,
                r.EXPIRE_DT                      AS expireDt,
                r.REG_DT                         AS regDt,
                (SELECT GROUP_CONCAT(BUS_TYPE_CD) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) AS busType,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) AS busCnt,
                (SELECT br.REQ_BUS_SEQ FROM TB_AUCTION_REQ_BUS br WHERE br.REQ_ID = r.REQ_ID ORDER BY br.REQ_BUS_SEQ ASC LIMIT 1) AS reqBusSeq,
                (SELECT COUNT(*)
                   FROM TB_AUCTION_REQ_VIA v
                  WHERE v.REQ_ID = r.REQ_ID
                    AND v.VIA_TYPE IN ('START_WAY', 'END_WAY')
                ) as waypointCount
             FROM TB_AUCTION_REQ r
             WHERE r.DATA_STAT = 'AUCTION'
               AND DATE(r.START_DT) > CURDATE()
             ${sameDayBlock}
             ORDER BY r.REG_DT DESC`,
            params
        );

        res.status(200).json({ total: rows.length, items: rows });
    } catch (error) {
        console.error('list-of-traveler-quotations:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
/**
 * 실시간 입찰 기회 (운전기사 대시보드 AuctionList)
 * GET /api/auction-list?driverId=
 * - TB_AUCTION_REQ.DATA_STAT = 'AUCTION' (여행자 견적 목록 API와 마스터 조건 동일)
 */
app.get('/api/auction-list', async (req, res) => {
    const { driverId } = req.query;
    if (!driverId) {
        return res.status(400).json({ error: 'driverId가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                         AS reqId,
                r.TRIP_TITLE                     AS tripTitle,
                r.START_ADDR                     AS startAddr,
                r.END_ADDR                       AS endAddr,
                r.START_DT                       AS startDt,
                r.END_DT                         AS endDt,
                r.PASSENGER_CNT                  AS passengerCnt,
                r.DATA_STAT                      AS reqStat,
                COALESCE(r.REQ_AMT, 0)           AS reqAmt,
                r.EXPIRE_DT                      AS expireDt,
                r.REG_DT                         AS regDt,
                (SELECT BUS_TYPE_CD FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID ORDER BY REQ_BUS_SEQ ASC LIMIT 1) AS busType,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) AS busCnt,
                (SELECT br.REQ_BUS_SEQ FROM TB_AUCTION_REQ_BUS br WHERE br.REQ_ID = r.REQ_ID ORDER BY br.REQ_BUS_SEQ ASC LIMIT 1) AS reqBusSeq,
                (SELECT res.DATA_STAT
                   FROM TB_BUS_RESERVATION res
                  WHERE res.REQ_ID = r.REQ_ID
                    AND res.DRIVER_ID = ?
                  ORDER BY res.REG_DT DESC
                  LIMIT 1
                )                                AS myBidStat
             FROM TB_AUCTION_REQ r
             WHERE r.DATA_STAT = 'AUCTION'
               AND DATE(r.START_DT) > CURDATE()
               AND NOT EXISTS (
                    SELECT 1
                      FROM TB_BUS_RESERVATION res2
                      INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res2.REQ_ID
                     WHERE res2.DRIVER_ID = ?
                       AND res2.DATA_STAT = 'CONFIRM'
                       AND DATE(ar.START_DT) = DATE(r.START_DT)
                       AND ar.REQ_ID <> r.REQ_ID
                   )
             ORDER BY r.REG_DT DESC`,
            [driverId, driverId]
        );
        res.status(200).json({ total: rows.length, items: rows });
    } catch (error) {
        console.error('auction-list:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 운행 예정 목록 (기사 Dashboard — UpcomingTripsModal)
 * GET /api/upcoming-trips?driverId= | custId= | uuid=
 * - TB_BUS_RESERVATION DATA_STAT='CONFIRM' + TB_AUCTION_REQ REQ_ID 조인
 * - 출발일 당일·이후만 (DATE(START_DT) >= CURDATE())
 */
app.get('/api/upcoming-trips', async (req, res) => {
    const raw =
        req.query.driverId != null ? String(req.query.driverId).trim()
            : req.query.custId != null ? String(req.query.custId).trim()
                : req.query.uuid != null ? String(req.query.uuid).trim()
                    : '';
    if (!raw) {
        return res.status(400).json({ error: 'driverId(또는 custId·uuid)가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const driverKey = await resolveDriverCustIdForReservations(connection, raw);
        if (!driverKey) {
            return res.status(400).json({ error: 'TB_USER에서 확인되는 기사 CUST_ID가 필요합니다.' });
        }
        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                              AS reqId,
                res.REQ_BUS_SEQ                       AS reqBusSeq,
                r.TRIP_TITLE                           AS tripTitle,
                r.START_ADDR                           AS startAddr,
                r.END_ADDR                             AS endAddr,
                r.START_DT                             AS startDt,
                r.END_DT                               AS endDt,
                r.PASSENGER_CNT                        AS passengerCnt,
                COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS contractAmount
             FROM TB_BUS_RESERVATION res
             INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
             WHERE res.DRIVER_ID = ?
               AND res.DATA_STAT = 'CONFIRM'
               AND DATE(r.START_DT) >= CURDATE()
             ORDER BY r.START_DT ASC`,
            [driverKey]
        );
        const items = (rows || []).map((row) => ({
            ...row,
            reqBusSeq:
                row.reqBusSeq != null && row.reqBusSeq !== ''
                    ? Number(row.reqBusSeq)
                    : 1,
            contractAmount:
                row.contractAmount != null ? Number(row.contractAmount) || 0 : 0,
        }));
        const payload = { total: items.length, items };
        if (items.length === 0) {
            payload.emptyMessage = '등록된 운행 예정 일정이 없습니다.';
        }
        res.status(200).json(payload);
    } catch (error) {
        console.error('upcoming-trips:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 Dashboard — 오늘의 일정 (당일 확정 1건 표시용)
 * GET /api/driver/schedule/today?custId=  (호환: driverId, uuid)
 * — `upcoming-trips` 와 동일 조인·컬럼 체계, `DATE(r.START_DT) = CURDATE()` 만 추가
 */
app.get('/api/driver/schedule/today', async (req, res) => {
    const raw =
        req.query.custId != null ? String(req.query.custId).trim()
            : req.query.driverId != null ? String(req.query.driverId).trim()
                : req.query.uuid != null ? String(req.query.uuid).trim()
                    : '';
    if (!raw) {
        return res.status(400).json({ error: 'custId(또는 driverId)가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const driverKey = await resolveDriverCustIdForReservations(connection, raw);
        if (!driverKey) {
            return res.status(400).json({ error: 'TB_USER에서 확인되는 기사 CUST_ID가 필요합니다.' });
        }
        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                              AS reqId,
                res.REQ_BUS_SEQ                       AS reqBusSeq,
                r.TRIP_TITLE                           AS tripTitle,
                r.START_ADDR                           AS startAddr,
                r.END_ADDR                             AS endAddr,
                r.START_DT                             AS startDt,
                r.END_DT                               AS endDt,
                r.PASSENGER_CNT                        AS passengerCnt,
                COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS contractAmount
             FROM TB_BUS_RESERVATION res
             INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
             WHERE res.DRIVER_ID = ?
               AND res.DATA_STAT = 'CONFIRM'
               AND DATE(r.START_DT) = CURDATE()
             ORDER BY r.START_DT ASC`,
            [driverKey]
        );
        const items = (rows || []).map((row) => {
            const reqBusSeq =
                row.reqBusSeq != null && row.reqBusSeq !== ''
                    ? Number(row.reqBusSeq)
                    : 1;
            const reqId = row.reqId != null ? String(row.reqId) : '';
            return {
                ...row,
                reqBusSeq,
                reqUuid: reqId,
                busLabel: null,
                statusLabel: '운행 예정',
                contractAmount:
                    row.contractAmount != null ? Number(row.contractAmount) || 0 : 0,
            };
        });
        res.status(200).json({ total: items.length, items });
    } catch (error) {
        console.error('driver/schedule/today:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ error: '일정 조회에 필요한 테이블이 없습니다.' });
        }
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 Dashboard — 여행 일정 캘린더 (도착일 = TB_AUCTION_REQ.END_DT, 표시 월 포함)
 * GET /api/driver/schedule/calendar?custId=&year=2026&month=5
 */
app.get('/api/driver/schedule/calendar', async (req, res) => {
    const raw =
        req.query.custId != null ? String(req.query.custId).trim()
            : req.query.driverId != null ? String(req.query.driverId).trim()
                : req.query.uuid != null ? String(req.query.uuid).trim()
                    : '';
    const y = parseInt(String(req.query.year || ''), 10);
    const mo = parseInt(String(req.query.month || ''), 10);
    if (!raw) {
        return res.status(400).json({ error: 'custId(또는 driverId·uuid)가 필요합니다.' });
    }
    if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
        return res.status(400).json({ error: 'year, month(1-12)가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const driverKeys = await driverReservationDriverKeys(connection, raw);
        if (!driverKeys.length) {
            return res.status(400).json({ error: 'custId(또는 driverId·uuid)가 필요합니다.' });
        }
        const monthStart = `${y}-${String(mo).padStart(2, '0')}-01`;
        const nextMo = mo === 12 ? 1 : mo + 1;
        const nextY = mo === 12 ? y + 1 : y;
        const monthEndExclusive = `${nextY}-${String(nextMo).padStart(2, '0')}-01`;
        const drvPh = driverKeys.map(() => '?').join(', ');

        const [rows] = await connection.execute(
            `SELECT res.REQ_ID                              AS reqId,
                    res.RES_ID                              AS resId,
                    res.REQ_BUS_SEQ                         AS reqBusSeq,
                    res.DATA_STAT                           AS dataStat,
                    DATE_FORMAT(r.END_DT, '%Y%m%d')         AS endYmd,
                    r.END_DT                                AS endDt,
                    r.TRIP_TITLE                            AS tripTitle
               FROM TB_BUS_RESERVATION res
               INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
              WHERE res.DRIVER_ID IN (${drvPh})
                AND res.DATA_STAT IN ('BIDDING', 'CONFIRM', 'DONE')
                AND r.END_DT IS NOT NULL
                AND DATE(r.END_DT) >= DATE(?)
                AND DATE(r.END_DT) < DATE(?)
              ORDER BY r.END_DT ASC, res.REG_DT ASC`,
            [...driverKeys, monthStart, monthEndExclusive]
        );
        const items = (rows || []).map((row) => ({
            reqId: row.reqId != null ? String(row.reqId) : '',
            resId: row.resId != null ? String(row.resId) : '',
            reqBusSeq: row.reqBusSeq != null ? Number(row.reqBusSeq) : 0,
            dataStat: row.dataStat != null ? String(row.dataStat) : '',
            endYmd: row.endYmd != null ? String(row.endYmd) : '',
            endDt: row.endDt,
            tripTitle: row.tripTitle != null ? String(row.tripTitle) : '',
        }));
        res.status(200).json({ year: y, month: mo, items });
    } catch (error) {
        console.error('driver/schedule/calendar:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 Dashboard — 여행 상세
 * GET /api/driver/trip-detail?custId=&reqId=&resId=&reqBusSeq=
 */
app.get('/api/driver/trip-detail', async (req, res) => {
    const raw =
        req.query.custId != null ? String(req.query.custId).trim()
            : req.query.driverId != null ? String(req.query.driverId).trim()
                : req.query.uuid != null ? String(req.query.uuid).trim()
                    : '';
    const reqId = req.query.reqId != null ? String(req.query.reqId).trim() : '';
    const resId = req.query.resId != null ? String(req.query.resId).trim() : '';
    const reqBusSeqRaw = req.query.reqBusSeq != null ? parseInt(String(req.query.reqBusSeq), 10) : NaN;
    if (!raw || !reqId || !resId || !Number.isFinite(reqBusSeqRaw)) {
        return res.status(400).json({ error: 'custId(또는 driverId·uuid), reqId, resId, reqBusSeq가 필요합니다.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const driverKeys = await driverReservationDriverKeys(connection, raw);
        if (!driverKeys.length) {
            return res.status(400).json({ error: 'custId(또는 driverId·uuid)가 필요합니다.' });
        }
        const drvPh = driverKeys.map(() => '?').join(', ');
        const [masterRows] = await connection.execute(
            `SELECT res.DATA_STAT               AS dataStat,
                    res.REQ_ID                  AS reqId,
                    res.RES_ID                  AS resId,
                    res.REQ_BUS_SEQ             AS reqBusSeq,
                    r.START_DT                  AS startDt,
                    r.END_DT                    AS endDt,
                    r.TRIP_TITLE                AS tripTitle,
                    b.BUS_TYPE_CD               AS busTypeCd
               FROM TB_BUS_RESERVATION res
               INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
               LEFT JOIN TB_AUCTION_REQ_BUS b
                      ON b.REQ_ID = res.REQ_ID AND b.REQ_BUS_SEQ = res.REQ_BUS_SEQ
              WHERE res.DRIVER_ID IN (${drvPh})
                AND res.REQ_ID = ?
                AND res.RES_ID = ?
                AND res.REQ_BUS_SEQ = ?
                AND res.DATA_STAT IN ('BIDDING', 'CONFIRM', 'DONE')
              LIMIT 1`,
            [...driverKeys, reqId, resId, reqBusSeqRaw]
        );
        if (!masterRows.length) {
            return res.status(404).json({ error: '해당 여행 정보를 찾을 수 없습니다.' });
        }
        const m = masterRows[0];
        const [viaRows] = await connection.execute(
            `SELECT VIA_SEQ AS viaSeq, VIA_TYPE AS viaType, VIA_ADDR AS viaAddr
               FROM TB_AUCTION_REQ_VIA
              WHERE REQ_ID = ?
              ORDER BY VIA_SEQ ASC`,
            [reqId]
        );
        const viaPoints = (viaRows || []).map((v) => ({
            viaSeq: v.viaSeq != null ? Number(v.viaSeq) : 0,
            viaType: v.viaType != null ? String(v.viaType) : '',
            viaAddr: v.viaAddr != null ? String(v.viaAddr) : '',
        }));
        res.status(200).json({
            dataStat: m.dataStat != null ? String(m.dataStat) : '',
            reqId: m.reqId != null ? String(m.reqId) : '',
            resId: m.resId != null ? String(m.resId) : '',
            reqBusSeq: m.reqBusSeq != null ? Number(m.reqBusSeq) : reqBusSeqRaw,
            startDt: m.startDt,
            endDt: m.endDt,
            tripTitle: m.tripTitle != null ? String(m.tripTitle) : '',
            busTypeCd: m.busTypeCd != null ? String(m.busTypeCd) : null,
            viaPoints,
        });
    } catch (error) {
        console.error('driver/trip-detail:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 카드·월회비·결제 이력 (BillingSubscription)
 * GET /api/billing-subscription?driverId=
 * — 월 회비: TB_DRIVER_DETAIL.FEE_POLICY + TB_COMMON_CODE(GRP_CD=FEE_POLICY).CD_FNUM. 등급/코드 없으면 monthlyFeeKrw 는 null (고정 33,000 스텁 제거).
 * 응답 루트 키: BillingSubscription
 */
app.get('/api/billing-subscription', async (req, res) => {
    const raw = req.query.driverId != null ? String(req.query.driverId).trim() : '';
    if (!raw) {
        return res.status(400).json({ error: 'driverId가 필요합니다.' });
    }
    try {
        const payload = await buildBillingSubscriptionPayload(pool, raw, BILLING_SUBSCRIPTION_ID);
        res.status(200).json({ BillingSubscription: payload });
    } catch (error) {
        console.error('billing-subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 메인 결제 카드 변경 — TB_PAYMENT_CARD.IS_PRIMARY 일괄(한 명의 기사 CUST_ID 기준)
 * PATCH /api/billing-subscription/primary-card  body: { driverId, cardSeq }
 */
app.patch('/api/billing-subscription/primary-card', async (req, res) => {
    const driverRaw = req.body?.driverId != null ? String(req.body.driverId).trim() : '';
    const cardSeq = req.body?.cardSeq != null ? parseInt(String(req.body.cardSeq), 10) : NaN;
    if (!driverRaw || !Number.isFinite(cardSeq)) {
        return res.status(400).json({ error: 'driverId와 cardSeq가 필요합니다.' });
    }
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const custCands = custIdMatchCandidates(driverRaw);
        const inPh = custCands.map(() => '?').join(', ');
        const [userRows] = await conn.execute(
            `SELECT CUST_ID FROM TB_USER WHERE TRIM(CUST_ID) IN (${inPh}) LIMIT 1`,
            custCands
        );
        const user = userRows[0];
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ error: '기사(회원)를 찾을 수 없습니다.' });
        }
        const custId = String(user.CUST_ID || '').trim();
        const [have] = await conn.execute(
            `SELECT 1 FROM TB_PAYMENT_CARD WHERE CUST_ID = ? AND CARD_SEQ = ? LIMIT 1`,
            [custId, cardSeq]
        );
        if (!have.length) {
            await conn.rollback();
            return res.status(404).json({ error: '해당 카드가 없습니다.' });
        }
        await conn.execute(`UPDATE TB_PAYMENT_CARD SET IS_PRIMARY = 'N' WHERE CUST_ID = ?`, [custId]);
        await conn.execute(
            `UPDATE TB_PAYMENT_CARD SET IS_PRIMARY = 'Y' WHERE CUST_ID = ? AND CARD_SEQ = ?`,
            [custId, cardSeq]
        );
        await conn.commit();
        const payload = await buildBillingSubscriptionPayload(pool, driverRaw, BILLING_SUBSCRIPTION_ID);
        res.status(200).json({ BillingSubscription: payload });
    } catch (error) {
        if (conn) try { await conn.rollback(); } catch (_) { /* ignore */ }
        console.error('billing-subscription primary-card:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ error: 'TB_PAYMENT_CARD 테이블이 없습니다.' });
        }
        res.status(500).json({ error: error.message });
    } finally {
        if (conn) conn.release();
    }
});

/**
 * 여행자 견적 요청 상세 조회
 * GET /api/traveler-quote-request-details?reqId=&custId=&reqBusSeq=
 * - TB_AUCTION_REQ 마스터, TB_AUCTION_REQ_BUS(요청 REQ_BUS_SEQ 행) + TB_COMMON_CODE(GRP_CD=BUS_TYPE) 차량명
 * - TB_AUCTION_REQ_VIA (REQ_ID, VIA_SEQ ASC)
 * - TB_BUS_RESERVATION: custId 있으면 REQ_ID+DRIVER_ID, REQ_BUS_SEQ 일치 우선(없으면 0 — 기존 INSERT 호환)
 */
app.get('/api/traveler-quote-request-details', async (req, res) => {
    let connection;
    try {
        const { reqId, custId, reqBusSeq } = req.query;
        if (!reqId) return res.status(400).json({ error: 'reqId가 필요합니다.' });

        const reqBusSeqNum =
            reqBusSeq != null && String(reqBusSeq).trim() !== ''
                ? parseInt(String(reqBusSeq).trim(), 10)
                : null;

        connection = await pool.getConnection();

        const [rows] = await connection.execute(
            `SELECT
                r.REQ_ID                     AS reqId,
                r.TRAVELER_ID                AS travelerId,
                r.TRIP_TITLE                 AS tripTitle,
                r.START_ADDR                 AS startAddr,
                r.END_ADDR                   AS endAddr,
                r.START_DT                   AS startDt,
                r.END_DT                     AS endDt,
                r.PASSENGER_CNT              AS passengerCnt,
                r.DATA_STAT                  AS reqStat,
                COALESCE(r.REQ_AMT, 0)       AS estTotalServicePrice,
                r.EXPIRE_DT                  AS expireDt,
                r.REG_DT                     AS regDt
             FROM TB_AUCTION_REQ r
             WHERE r.REQ_ID = ?`,
            [reqId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: '견적 요청 정보를 찾을 수 없습니다.' });
        }

        const master = rows[0];

        let busSeqResolved = reqBusSeqNum;
        if (busSeqResolved == null || !Number.isFinite(busSeqResolved) || busSeqResolved < 0) {
            const [fb] = await connection.execute(
                `SELECT REQ_BUS_SEQ AS seq FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? ORDER BY REQ_BUS_SEQ ASC LIMIT 1`,
                [reqId]
            );
            busSeqResolved = fb[0]?.seq != null ? Number(fb[0].seq) : 0;
        }

        const [busSlotRows] = await connection.execute(
            `SELECT BUS_TYPE_CD AS busTypeCd FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? LIMIT 1`,
            [reqId, busSeqResolved]
        );
        const busTypeCd =
            busSlotRows[0]?.busTypeCd != null ? String(busSlotRows[0].busTypeCd).trim() : '';

        let busTypeName = null;
        if (busTypeCd) {
            try {
                const [cRows] = await connection.execute(
                    `SELECT CD_NM_KO AS cdNmKo FROM TB_COMMON_CODE
                      WHERE GRP_CD = 'BUS_TYPE' AND DTL_CD = ? AND (USE_YN = 'Y' OR USE_YN IS NULL)
                      LIMIT 1`,
                    [busTypeCd]
                );
                if (cRows.length > 0 && cRows[0].cdNmKo != null && String(cRows[0].cdNmKo).trim() !== '') {
                    busTypeName = String(cRows[0].cdNmKo).trim();
                }
            } catch (_) {
                /* TB_COMMON_CODE 없거나 컬럼 불일치 시 차량명만 비움 */
            }
        }

        const [busCountRows] = await connection.execute(
            `SELECT COUNT(*) AS c FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?`,
            [reqId]
        );
        const busCnt = Math.max(1, Number(busCountRows[0]?.c) || 1);

        let resId = null;
        let driverBiddingPrice = 0;
        let resStat = null;

        if (custId) {
            const cid = String(custId).trim();
            const loadRes = async (seq) => {
                const [resRows] = await connection.execute(
                    `SELECT RES_ID                            AS resId,
                            COALESCE(DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
                            DATA_STAT                         AS resStat
                       FROM TB_BUS_RESERVATION
                      WHERE REQ_ID = ? AND DRIVER_ID = ? AND REQ_BUS_SEQ = ?
                      ORDER BY REG_DT DESC
                      LIMIT 1`,
                    [reqId, cid, seq]
                );
                return resRows[0] || null;
            };

            if (reqBusSeqNum != null && Number.isFinite(reqBusSeqNum) && reqBusSeqNum >= 0) {
                let r0 = await loadRes(reqBusSeqNum);
                if (!r0 && reqBusSeqNum !== 0) {
                    r0 = await loadRes(0);
                }
                if (r0) {
                    resId = r0.resId;
                    driverBiddingPrice = Number(r0.driverBiddingPrice) || 0;
                    resStat = r0.resStat;
                }
            } else {
                const [resRows] = await connection.execute(
                    `SELECT RES_ID                            AS resId,
                            COALESCE(DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
                            DATA_STAT                         AS resStat
                       FROM TB_BUS_RESERVATION
                      WHERE REQ_ID = ? AND DRIVER_ID = ?
                      ORDER BY REG_DT DESC
                      LIMIT 1`,
                    [reqId, cid]
                );
                if (resRows.length > 0) {
                    resId = resRows[0].resId;
                    driverBiddingPrice = Number(resRows[0].driverBiddingPrice) || 0;
                    resStat = resRows[0].resStat;
                }
            }
        }

        const [viaRows] = await connection.execute(
            `SELECT VIA_SEQ AS viaSeq, VIA_TYPE AS viaType, VIA_ADDR AS viaAddr
               FROM TB_AUCTION_REQ_VIA
              WHERE REQ_ID = ?
              ORDER BY VIA_SEQ ASC`,
            [reqId]
        );

        res.status(200).json({
            ...master,
            busType: busTypeCd,
            busTypeCd,
            busTypeName,
            busCnt,
            resId,
            driverBiddingPrice,
            resStat,
            viaPoints: viaRows,
        });
    } catch (error) {
        console.error('traveler-quote-request-details:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 기사 입찰 정보 등록 / 갱신
 * PUT /api/traveler-quote-request-details/bid
 * Body: { reqId, reqBusSeq, driverId, bidPrice, busId }
 */
app.put('/api/traveler-quote-request-details/bid', async (req, res) => {
    let connection;
    try {
        const { reqId, reqBusSeq, driverId, bidPrice, busId } = req.body;
        if (!reqId || !reqBusSeq || !driverId || !bidPrice) {
            return res.status(400).json({ error: '필수 입찰 정보(reqId, reqBusSeq, driverId, bidPrice)가 누락되었습니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 0. 거래 제한(패널티) 확인
        const safeDriverId = String(driverId || '').padStart(10, '0');
        const [penaltyRows] = await connection.execute(
            "SELECT TRADE_RESTRICT_YN FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?",
            [safeDriverId]
        );
        if (penaltyRows.length > 0 && penaltyRows[0].TRADE_RESTRICT_YN === 'Y') {
            await connection.rollback();
            return res.status(403).json({ error: '취소 누적으로 인해 서비스 이용이 일시적으로 제한되었습니다. 고객센터에 문의해주세요.' });
        }

        // 1. 기존 입찰 여부 확인 (REQ_ID + REQ_BUS_SEQ + DRIVER_ID 조합으로 확인)
        const [rows] = await connection.execute(
            'SELECT RES_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DRIVER_ID = ? LIMIT 1',
            [reqId, reqBusSeq, driverId]
        );

        if (rows.length > 0) {
            // 2-A. 기존 입찰 수정
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION 
                    SET DRIVER_BIDDING_PRICE = ?, 
                        MOD_DT = NOW() 
                  WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DRIVER_ID = ?`,
                [bidPrice, reqId, reqBusSeq, driverId]
            );
        } else {
            // 2-B. 신규 입찰 등록
            const [maxRows] = await connection.execute('SELECT MAX(RES_ID) as maxId FROM TB_BUS_RESERVATION');
            const resId = generateNextNumericId(maxRows[0].maxId || '0', 10); // TB_BUS_RESERVATION.RES_ID는 varchar(10)
            
            // 상위 요청서에서 TRAVELER_ID 가져오기 (비정규화 필드 채우기용)
            const [reqRows] = await connection.execute('SELECT TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            const travelerId = reqRows.length > 0 ? reqRows[0].TRAVELER_ID : null;

            await connection.execute(
                `INSERT INTO TB_BUS_RESERVATION (
                    RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, BUS_ID, 
                    DRIVER_BIDDING_PRICE, DATA_STAT, REG_DT, MOD_DT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'BIDDING', NOW(), NOW())`,
                [resId, reqId, reqBusSeq, travelerId, driverId, busId || null, bidPrice]
            );

            // 3. 상위 상태 변경: TB_AUCTION_REQ_BUS 및 TB_AUCTION_REQ 상태를 'BIDDING'으로 변경
            await connection.execute(
                "UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'BIDDING' WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = 'AUCTION'",
                [reqId, reqBusSeq]
            );
            
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'BIDDING' WHERE REQ_ID = ? AND DATA_STAT = 'AUCTION'",
                [reqId]
            );
        }

        await connection.commit();
        res.status(200).json({ success: true, message: '입찰 정보가 성공적으로 반영되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bid Update Error:', error);
        res.status(500).json({ error: '입찰 처리 중 서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// API: 공통 코드 조회
app.get('/api/common/codes/:grpCd', async (req, res) => {
    try {
        const { grpCd } = req.params;
        const [rows] = await pool.execute(`
            SELECT GRP_CD, DTL_CD, CD_NM_KO AS DTL_NM, CD_DESC, DISP_ORD AS SORT_SEQ 
            FROM TB_COMMON_CODE 
            WHERE GRP_CD = ? 
            AND USE_YN = 'Y' 
            ORDER BY DISP_ORD ASC
        `, [grpCd]);
        res.json(rows);
    } catch (error) {
        console.error('Fetch Codes Error:', error);
        res.status(500).json({ error: '코드 조회 중 오류가 발생했습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 busTaams REST API Server is running beautifully on http://localhost:${PORT}`);
});

(async function startServer() {
    console.log('\n==================================================');
    console.log('🚀 busTaams 서버 초기화 시작...');
    console.log('📅 시점:', new Date().toLocaleString());
    console.log('==================================================\n');

    let connection;
    try {
        console.log('📡 [1/1] 데이터베이스 연결 시도 중...');
        connection = await pool.getConnection();
        console.log('✅ [1/1] DB 연결 성공!');
    } catch (e) {
        console.error('⚠️ DB 연결 확인 실패:', e.message);
    } finally {
        if (connection) connection.release();
    }
})();
