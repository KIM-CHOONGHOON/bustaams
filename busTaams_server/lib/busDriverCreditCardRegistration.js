const { encrypt, plainOrLegacyDecrypt } = require('../crypto');
const { custIdMatchCandidates } = require('./bustaamsIds');

function digitsOnly(s) {
    return String(s || '').replace(/\D/g, '');
}

/** Luhn 검사 (PAN 유효성) */
function luhnValid(pan) {
    const d = digitsOnly(pan);
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = d.length - 1; i >= 0; i -= 1) {
        let n = parseInt(d[i], 10);
        if (Number.isNaN(n)) return false;
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}

function normalizeExpMonth(mm) {
    const s = digitsOnly(mm);
    if (s.length === 1) return s.padStart(2, '0');
    return s.slice(-2).padStart(2, '0');
}

/** YY */
function normalizeExpYear(yy) {
    const s = digitsOnly(yy);
    if (s.length === 4) return s.slice(-2);
    return s.slice(-2).padStart(2, '0');
}

function expiryNotPast(expMonth, expYearYY) {
    const m = parseInt(expMonth, 10);
    const y = parseInt(expYearYY, 10);
    if (!Number.isFinite(m) || m < 1 || m > 12) return false;
    if (!Number.isFinite(y) || y < 0 || y > 99) return false;
    const now = new Date();
    const curY = now.getFullYear() % 100;
    const curM = now.getMonth() + 1;
    if (y > curY) return true;
    if (y < curY) return false;
    return m >= curM;
}

/** 정규화된 MM 이 01~12 인지 */
function expiryMonthInRange01to12(expMonthNorm) {
    const m = parseInt(expMonthNorm, 10);
    return Number.isFinite(m) && m >= 1 && m <= 12;
}

/**
 * 동일 CUST_ID 에 이미 동일 PAN 이 저장되어 있는지 확인.
 * CARD_NO_ENC 는 AES-GCM(랜덤 IV) 이므로 암호문 문자열 동등 비교는 불가 — 저장된 행을 복호화하여 PAN 을 비교한다.
 */
async function custIdHasDuplicatePan(conn, custId, panNormalized) {
    const [rows] = await conn.execute(
        `SELECT CARD_NO_ENC FROM TB_PAYMENT_CARD WHERE CUST_ID = ?`,
        [custId]
    );
    for (const row of rows) {
        try {
            const plain = plainOrLegacyDecrypt(row.CARD_NO_ENC);
            if (digitsOnly(plain) === panNormalized) return true;
        } catch (_) {
            /* skip unreadable row */
        }
    }
    return false;
}

/**
 * TB_PAYMENT_CARD 행 추가 (PAN 은 CARD_NO_ENC 로만 저장)
 * @param {import('mysql2/promise').Pool} pool
 * @param {object} p
 * @param {string} p.rawDriverId - TB_USER.CUST_ID(숫자·0패딩 변형)
 * @param {string} p.panDigits - 숫자만 카드번호
 * @param {string} p.expMonth - MM
 * @param {string} p.expYearYY - YY
 * @param {string} p.cardNickname - CARD_NICKNAME (모달 `CARD_NICKNAME`, 최대 50)
 * @param {boolean} p.setAsDefault - 메인 카드로 설정
 * @param {string} p.screenId
 */
async function registerBusDriverPaymentCard(pool, p) {
    const raw = String(p.rawDriverId || '').trim();
    const billKey = String(p.billKey || '').trim();
    const isBillingMode = billKey.length > 0;

    const pan = digitsOnly(p.panDigits);
    const em = isBillingMode ? (p.expMonth ? normalizeExpMonth(p.expMonth) : '12') : normalizeExpMonth(p.expMonth);
    const ey = isBillingMode ? (p.expYearYY ? normalizeExpYear(p.expYearYY) : '99') : normalizeExpYear(p.expYearYY);
    const nickRaw = String(p.cardNickname ?? p.CARD_NICKNAME ?? '').trim();
    const nickname = nickRaw.length > 0 ? nickRaw.slice(0, 50) : null;
    const setAsDefault = Boolean(p.setAsDefault);
    const screenId = String(p.screenId || '').trim() || 'BusDriverCreditCardRegistration';
    const originalCardName = String(p.originalCardName || '').trim() || null;

    if (!raw) {
        const e = new Error('driverId가 필요합니다.');
        e.statusCode = 400;
        throw e;
    }
    if (!nickname) {
        const e = new Error('카드 별칭(CARD_NICKNAME)을 입력해 주세요.');
        e.statusCode = 400;
        throw e;
    }
    
    // 빌링 모드가 아닐 때만 직접 입력 카드 번호 및 유효기간 검증
    if (!isBillingMode) {
        if (!luhnValid(pan)) {
            const e = new Error('카드 번호가 올바르지 않습니다.');
            e.statusCode = 400;
            throw e;
        }
        if (!expiryMonthInRange01to12(em)) {
            const e = new Error('유효기간 월(MM)은 01~12 사이여야 합니다.');
            e.statusCode = 400;
            throw e;
        }
        if (!expiryNotPast(em, ey)) {
            const e = new Error('유효기간이 현재 년·월보다 이전입니다. MM/YY를 확인해 주세요.');
            e.statusCode = 400;
            throw e;
        }
    }

    const encPan = encrypt(pan);
    const encBillKey = isBillingMode ? encrypt(billKey) : null;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const custCands = custIdMatchCandidates(raw);
        const custPh = custCands.map(() => '?').join(', ');
        const [userRows] = await conn.execute(
            `SELECT CUST_ID, USER_ID FROM TB_USER WHERE TRIM(CUST_ID) IN (${custPh}) LIMIT 1`,
            custCands
        );
        const user = userRows[0];
        if (!user) {
            await conn.rollback();
            const e = new Error('기사(회원)를 찾을 수 없습니다.');
            e.statusCode = 404;
            throw e;
        }
        const custId = String(user.CUST_ID || '').trim();
        const regId = String(user.USER_ID || custId || '').trim().slice(0, 10);

        // 빌링 모드가 아닐 때만 중복 PAN 검사
        if (!isBillingMode) {
            const dup = await custIdHasDuplicatePan(conn, custId, pan);
            if (dup) {
                await conn.rollback();
                const e = new Error('이미 등록된 카드 번호 입니다. 다른 카드 번호를 입력하세요!');
                e.statusCode = 409;
                throw e;
            }
        }

        const [cntRows] = await conn.execute(
            `SELECT COUNT(*) AS c FROM TB_PAYMENT_CARD WHERE CUST_ID = ?`,
            [custId]
        );
        const existingCount = Number(cntRows[0].c);
        const isPrimary = setAsDefault || existingCount === 0 ? 'Y' : 'N';

        if (isPrimary === 'Y') {
            await conn.execute(`UPDATE TB_PAYMENT_CARD SET IS_PRIMARY = 'N' WHERE CUST_ID = ?`, [custId]);
        }

        const [maxRows] = await conn.execute(
            `SELECT COALESCE(MAX(CARD_SEQ), 0) AS m FROM TB_PAYMENT_CARD WHERE CUST_ID = ?`,
            [custId]
        );
        const cardSeq = Number(maxRows[0].m) + 1;

        const autoPayStartDt = isPrimary === 'Y' ? new Date() : null;
        /** 신규 행: 비메인이면 자동결제 구간 없음(CHECK 제약상 END만 단독 설정 불가). */
        const autoPayEndDt = null;

        await conn.execute(
            `INSERT INTO TB_PAYMENT_CARD (
                CUST_ID, CARD_SEQ, CARD_NICKNAME, ORIGINAL_CARD_NAME, CARD_NO_ENC, CARD_BILLING_KEY_ENC, EXP_MONTH, EXP_YEAR,
                IS_PRIMARY, AUTO_PAY_START_DT, AUTO_PAY_END_DT, AUTO_PAY_DAY, REG_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [custId, cardSeq, nickname, originalCardName, encPan, encBillKey, em, ey, isPrimary, autoPayStartDt, autoPayEndDt, regId || null]
        );

        await conn.commit();
        return { custId, userId: String(user.USER_ID || '').trim(), cardSeq, screenId };
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch (_) { /* ignore */ }
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = {
    registerBusDriverPaymentCard,
    luhnValid,
    digitsOnly,
    normalizeExpMonth,
    normalizeExpYear,
    expiryNotPast,
    expiryMonthInRange01to12,
    custIdHasDuplicatePan,
};
