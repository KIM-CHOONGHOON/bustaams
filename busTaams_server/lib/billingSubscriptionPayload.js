const { plainOrLegacyDecrypt } = require('../crypto');
const { normalizeDriverFeePolicyDtlCd } = require('./feePolicyDtl');

function cardLastFourFromEnc(enc) {
    if (enc == null || String(enc).trim() === '') return '';
    const plain = plainOrLegacyDecrypt(enc);
    const digits = String(plain).replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
    return '';
}

/** TB_USER.USER_NM — Unicode 기준 최대 maxLen 글자(한글 음절 1자) */
function truncateUserNmKo(userNm, maxLen = 10) {
    if (userNm == null || String(userNm).trim() === '') return '기사';
    const chars = Array.from(String(userNm).trim());
    const t = chars.slice(0, maxLen).join('');
    return t || '기사';
}

/**
 * TB_COMMON_CODE 등에서 월 회비(원) 조회. 없으면 null.
 */
async function resolveMonthlyFeeKrw(connection, feePolicyRaw) {
    let code = feePolicyRaw != null ? String(feePolicyRaw).trim() : '';
    code = normalizeDriverFeePolicyDtlCd(code);
    if (!code) return { monthlyFeeKrw: null, feePolicy: null, feePolicyLabelKo: null };

    try {
        const tryCodes =
            code === 'DRIVER_GENERAL' ? ['DRIVER_GENERAL', 'DRIVER_GENNERAL'] : [code];
        let row;
        for (const dtl of tryCodes) {
            const [rows] = await connection.execute(
                `SELECT CD_FNUM, CD_NM_KO FROM TB_COMMON_CODE
                 WHERE GRP_CD = 'FEE_POLICY' AND DTL_CD = ? AND (USE_YN = 'Y' OR USE_YN IS NULL)
                 LIMIT 1`,
                [dtl]
            );
            row = rows[0];
            if (row) break;
        }
        if (!row) {
            return { monthlyFeeKrw: null, feePolicy: code, feePolicyLabelKo: null };
        }
        const labelKo =
            row.CD_NM_KO != null && String(row.CD_NM_KO).trim() !== '' ? String(row.CD_NM_KO).trim() : null;
        let amount = null;
        if (row.CD_FNUM != null) {
            const n = Number(row.CD_FNUM);
            if (Number.isFinite(n) && n >= 0) amount = Math.round(n);
        }
        // CD_NM_KO 없이 CD_FNUM만 있으면 제목은 (등급없음)인데 금액만 노출되는 불일치가 나므로 금액은 내리지 않음
        const monthlyFeeKrw = labelKo ? amount : null;
        return { monthlyFeeKrw, feePolicy: code, feePolicyLabelKo: labelKo };
    } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) throw e;
    }

    return { monthlyFeeKrw: null, feePolicy: code, feePolicyLabelKo: null };
}

/**
 * GET /api/billing-subscription 응답 객체 (BillingSubscription 본문)
 */
async function buildBillingSubscriptionPayload(pool, rawDriverId, screenId) {
    const raw = String(rawDriverId || '').trim();
    const base = {
        screenId,
        driverId: raw,
        introText: '등록 결제수단과 기사 월 회비·결제 내역을 확인합니다.',
        monthlyFeeKrw: null,
        feePolicy: null,
        feePolicyLabelKo: null,
        /** TB_USER.USER_NM 기준 10자까지 자른 표시용 이름(멤버십 제목 조합) */
        driverUserNmTrunc10: null,
        /** "{이름자름} : 기사님 ({CD_NM_KO 또는 등급없음})" */
        membershipHeading: null,
        monthlyFeeUnsetReason: null,
        nextBillingDt: null,
        subscriptionStat: 'NONE',
        cardNickname: '',
        cardLastFour: '',
        paymentCards: [],
        paymentHistory: [],
        infoMessage: '',
    };

    let connection;
    try {
        connection = await pool.getConnection();

        let userRows;
        try {
            [userRows] = await connection.execute(
                `SELECT CUST_ID, USER_ID, USER_NM FROM TB_USER WHERE CUST_ID = ? OR USER_ID = ? LIMIT 1`,
                [raw, raw]
            );
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) {
                [userRows] = await connection.execute(
                    `SELECT CUST_ID, USER_ID FROM TB_USER WHERE CUST_ID = ? OR USER_ID = ? LIMIT 1`,
                    [raw, raw]
                );
            } else {
                throw e;
            }
        }
        const user = userRows[0];
        if (!user) {
            base.monthlyFeeUnsetReason = '회원 정보를 찾을 수 없습니다.';
            base.infoMessage =
                'TB_USER 에서 기사를 찾지 못했습니다. driverId(custId 또는 userId)를 확인하세요.';
            return base;
        }

        const custId = String(user.CUST_ID || '').trim();
        const userId = String(user.USER_ID || '').trim();
        const userNmRaw = user.USER_NM != null ? String(user.USER_NM) : '';
        const driverNmTrunc = truncateUserNmKo(userNmRaw, 10);
        base.driverUserNmTrunc10 = driverNmTrunc;

        let detailPolicy = null;
        try {
            /** 로그인 기사의 TB_USER.USER_ID 로 등급(FEE_POLICY) 조회 */
            const [dRows] = await connection.execute(
                `SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE USER_ID = ? LIMIT 1`,
                [userId]
            );
            detailPolicy = dRows[0]?.FEE_POLICY != null ? String(dRows[0].FEE_POLICY).trim() : '';
        } catch (e) {
            if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) throw e;
        }

        const feeResolved = await resolveMonthlyFeeKrw(connection, detailPolicy || null);
        base.monthlyFeeKrw = feeResolved.monthlyFeeKrw;
        base.feePolicy = feeResolved.feePolicy;
        base.feePolicyLabelKo = feeResolved.feePolicyLabelKo || null;

        const gradeParen =
            base.feePolicyLabelKo != null && String(base.feePolicyLabelKo).trim() !== ''
                ? String(base.feePolicyLabelKo).trim()
                : '등급없음';
        base.membershipHeading = `${driverNmTrunc} : 기사님 (${gradeParen})`;

        if (!detailPolicy) {
            base.monthlyFeeUnsetReason = '기사 회원 등급(FEE_POLICY)이 등록되어 있지 않습니다.';
        } else if (!base.feePolicyLabelKo) {
            base.monthlyFeeUnsetReason =
                '등급(FEE_POLICY)에 해당하는 공통코드 행이 없거나, 등급명(CD_NM_KO)이 비어 있습니다.';
        } else if (base.monthlyFeeKrw == null) {
            base.monthlyFeeUnsetReason =
                '해당 등급의 월 회비 금액(CD_FNUM)이 공통코드(TB_COMMON_CODE)에 없습니다.';
        }

        const paymentCards = [];
        try {
            const [cRows] = await connection.execute(
                `SELECT CUST_ID, CARD_SEQ, CARD_NICKNAME, CARD_NO_ENC, EXP_MONTH, EXP_YEAR,
                        IS_PRIMARY, REG_DT, AUTO_PAY_DAY, AUTO_PAY_START_DT, AUTO_PAY_END_DT
                 FROM TB_PAYMENT_CARD
                 WHERE CUST_ID = ?
                 ORDER BY CASE IS_PRIMARY WHEN 'Y' THEN 0 ELSE 1 END, REG_DT ASC, CARD_SEQ ASC`,
                [custId]
            );
            for (const row of cRows) {
                const lastFour = cardLastFourFromEnc(row.CARD_NO_ENC);
                paymentCards.push({
                    cardSeq: Number(row.CARD_SEQ),
                    nickname: row.CARD_NICKNAME != null ? String(row.CARD_NICKNAME).trim() : '',
                    lastFour,
                    expMonth: row.EXP_MONTH != null ? String(row.EXP_MONTH).trim() : '',
                    expYear: row.EXP_YEAR != null ? String(row.EXP_YEAR).trim() : '',
                    isPrimary: String(row.IS_PRIMARY || 'N').toUpperCase() === 'Y',
                    regDt: row.REG_DT ? new Date(row.REG_DT).toISOString() : null,
                    autoPayDay: row.AUTO_PAY_DAY != null ? Number(row.AUTO_PAY_DAY) : 1,
                    autoPayStartDt: row.AUTO_PAY_START_DT ? new Date(row.AUTO_PAY_START_DT).toISOString() : null,
                    autoPayEndDt: row.AUTO_PAY_END_DT ? new Date(row.AUTO_PAY_END_DT).toISOString() : null,
                });
            }
        } catch (e) {
            if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) throw e;
        }
        base.paymentCards = paymentCards;

        const primary = paymentCards.find((c) => c.isPrimary);
        if (primary) {
            base.cardNickname = primary.nickname || '';
            base.cardLastFour = primary.lastFour || '';
        }

        const paymentHistory = [];
        try {
            const [hRows] = await connection.execute(
                `SELECT PAY_HIST_SEQ, BILLING_YYYYMM, PAY_AMT, PAY_STAT, PAY_REQ_DT, PAY_COMPLETED_DT,
                        PG_TXN_ID, FAIL_MSG, CARD_NICKNAME_SNAPSHOT, CARD_LAST_FOUR_SNAPSHOT
                 FROM TB_DRIVER_PAYMENT_HIST
                 WHERE DRIVER_ID = ?
                 ORDER BY PAY_REQ_DT DESC, PAY_HIST_SEQ DESC
                 LIMIT 100`,
                [userId]
            );
            for (const row of hRows) {
                paymentHistory.push({
                    payHistSeq: String(row.PAY_HIST_SEQ),
                    billingYyyymm: String(row.BILLING_YYYYMM || ''),
                    payAmt: row.PAY_AMT != null ? Number(row.PAY_AMT) : 0,
                    payStat: String(row.PAY_STAT || ''),
                    payReqDt: row.PAY_REQ_DT ? new Date(row.PAY_REQ_DT).toISOString() : null,
                    payCompletedDt: row.PAY_COMPLETED_DT ? new Date(row.PAY_COMPLETED_DT).toISOString() : null,
                    pgTxnId: row.PG_TXN_ID != null ? String(row.PG_TXN_ID) : '',
                    failMsg: row.FAIL_MSG != null ? String(row.FAIL_MSG) : '',
                    cardNicknameSnapshot:
                        row.CARD_NICKNAME_SNAPSHOT != null ? String(row.CARD_NICKNAME_SNAPSHOT).trim() : '',
                    cardLastFourSnapshot:
                        row.CARD_LAST_FOUR_SNAPSHOT != null ? String(row.CARD_LAST_FOUR_SNAPSHOT).trim() : '',
                });
            }
        } catch (e) {
            if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) throw e;
        }
        base.paymentHistory = paymentHistory;

        base.infoMessage =
            base.monthlyFeeKrw == null && base.monthlyFeeUnsetReason
                ? base.monthlyFeeUnsetReason
                : '월 회비는 기사 등급·공통코드(FEE_POLICY) 기준으로 산정됩니다. 카드·이력은 DB 연동 데이터입니다.';
        return base;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    buildBillingSubscriptionPayload,
    cardLastFourFromEnc,
};
