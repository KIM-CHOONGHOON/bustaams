const { plainOrLegacyDecrypt } = require('../crypto');

const DEFAULT_CANCEL = {
    cancelCnt: 0,
    cancelBusDriverCnt: 0,
    cancelTravelerAllCnt: 0,
    cancelTravelerPartialBusCnt: 0,
    tradeRestrictYn: 'N',
};

/**
 * MainDashBoard 분기(여행자 / 영업회원 / 버스기사 / 관리직원)
 * @param {string} userType — TB_USER.USER_TYPE
 * @returns {{ userType: string, branch: string, labelKo: string, routeKey: string }}
 */
function getMainDashboardBranch(userType) {
    const t = String(userType || 'TRAVELER').toUpperCase();
    const table = {
        TRAVELER: { branch: 'traveler', labelKo: '여행자', routeKey: 'main_traveler' },
        PARTNER: { branch: 'partner', labelKo: '영업회원', routeKey: 'main_partner' },
        DRIVER: { branch: 'driver', labelKo: '버스기사', routeKey: 'main_driver' },
        ADMIN: { branch: 'admin', labelKo: '관리직원', routeKey: 'main_admin' },
    };
    const m = table[t] || table.TRAVELER;
    return { userType: t, ...m };
}

function mapCancelRow(row) {
    if (!row) return { ...DEFAULT_CANCEL };
    return {
        cancelCnt: row.CANCEL_CNT != null ? Number(row.CANCEL_CNT) : 0,
        cancelBusDriverCnt: row.CANCEL_BUS_DRIVER_CNT != null ? Number(row.CANCEL_BUS_DRIVER_CNT) : 0,
        cancelTravelerAllCnt: row.CANCEL_TRAVELER_ALL_CNT != null ? Number(row.CANCEL_TRAVELER_ALL_CNT) : 0,
        cancelTravelerPartialBusCnt: row.CANCEL_TRAVELER_PARTIAL_BUS_CNT != null
            ? Number(row.CANCEL_TRAVELER_PARTIAL_BUS_CNT) : 0,
        tradeRestrictYn: (row.TRADE_RESTRICT_YN || 'N').toString().toUpperCase() === 'Y' ? 'Y' : 'N',
    };
}

function mapSubscriptionRow(row) {
    if (!row) return null;
    return {
        yyyyMm: String(row.YYYYMM),
        feePolicy: row.FEE_POLICY,
        basicCnt: Number(row.BASIC_CNT),
        useCnt: Number(row.USE_CNT),
        remainingCnt: Number(row.REMAINING_CNT),
    };
}

function getCurrentYyyyMm() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * TB_USER_CANCEL_MANAGE: SERVER 환경.md CUST_ID 조인·BUSTAAMS 컬럼명 혼용 대응
 */
async function fetchCancelManageForUser(pool, user) {
    const cust = user.CUST_ID != null && String(user.CUST_ID).trim() !== '' ? String(user.CUST_ID).trim() : '';
    const loginId = user.USER_ID != null && String(user.USER_ID).trim() !== '' ? String(user.USER_ID).trim() : '';
    const cols = `CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT, TRADE_RESTRICT_YN`;

    const tryQ = async (sql, args) => {
        const [rows] = await pool.execute(sql, args);
        return rows[0] || null;
    };

    if (cust) {
        try {
            const row = await tryQ(
                `SELECT ${cols} FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ? LIMIT 1`,
                [cust]
            );
            if (row) return row;
        } catch (e) {
            // CUST_ID 컬럼이 없는 구형 스키마 대응 (필요 시)
            if (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) {
                // 운영 환경이 CUST_ID 체계이므로 여기서는 더 이상 USER_ID로 시도하지 않고 종료
                return null;
            }
            if (e.code === 'ER_NO_SUCH_TABLE') return null;
            throw e;
        }
    }
    return null;
}

/**
 * 기사 + 당월 TB_SUBSCRIPTION
 */
async function fetchSubscriptionForDriver(pool, custId) {
    if (!custId || String(custId).trim() === '') return null;
    const yyyyMM = getCurrentYyyyMm();
    try {
        const [rows] = await pool.execute(
            `SELECT YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT
             FROM TB_SUBSCRIPTION
             WHERE DRIVER_ID = ? AND YYYYMM = ? LIMIT 1`,
            [String(custId).trim(), yyyyMM]
        );
        return rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) return null;
        throw e;
    }
}

/**
 * 로그인 응답 `user` DTO — JSON 키는 `BusTaams 테이블.md` `TB_USER` 컬럼 id를 camelCase(`CUST_ID`→`custId`)로 맞춤.
 * (중복 필드 `userName`/`phoneNo`/`tbUserId`는 사용하지 않음; 클라이언트 `normalizeUserSession`이 구 세션·호환용으로 정리.)
 * @param {object} params
 * @param {object} params.user — TB_USER 행
 * @param {object|null} params.cancelRow — TB_USER_CANCEL_MANAGE 또는 null(기본 0)
 * @param {object|null} params.subscriptionRow — 당월 구독 또는 null
 * @param {{ useNullWhenNoCancelRow?: boolean }} [opts]
 */
function buildPostLoginUserDto({ user, cancelRow, subscriptionRow }, opts = {}) {
    const { useNullWhenNoCancelRow = false } = opts;
    const userNm = plainOrLegacyDecrypt(user.USER_NM || '');
    const hpNo = plainOrLegacyDecrypt(user.HP_NO || '');
    const userType = user.USER_TYPE;
    const main = getMainDashboardBranch(userType);

    let cancelManage;
    if (useNullWhenNoCancelRow && !cancelRow) {
        cancelManage = null;
    } else {
        cancelManage = mapCancelRow(cancelRow);
    }

    const ut = String(userType || '').toUpperCase();
    let subscription = null;
    if (ut === 'DRIVER' && subscriptionRow) {
        subscription = mapSubscriptionRow(subscriptionRow);
    }

    return {
        custId: user.CUST_ID != null ? String(user.CUST_ID).trim() : '',
        userId: user.USER_ID != null ? String(user.USER_ID).trim() : '',
        userType,
        userNm,
        hpNo,
        email: user.EMAIL,
        snsType: user.SNS_TYPE || 'NONE',
        profileFileId: user.PROFILE_FILE_ID != null ? String(user.PROFILE_FILE_ID) : null,
        profileImgPath: user.PROFILE_IMG_PATH || null,
        smsAuthYn: user.SMS_AUTH_YN || 'N',
        userStat: user.USER_STAT || 'ACTIVE',
        joinDt: user.JOIN_DT || null,
        cancelManage,
        subscription,
        mainDashboard: main,
    };
}

module.exports = {
    buildPostLoginUserDto,
    fetchCancelManageForUser,
    fetchSubscriptionForDriver,
    getMainDashboardBranch,
    getCurrentYyyyMm,
    mapCancelRow,
    DEFAULT_CANCEL,
};
