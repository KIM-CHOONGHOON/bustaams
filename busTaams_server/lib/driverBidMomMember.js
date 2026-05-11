/**
 * 버스 기사 청약(입찰) 등록 시 TB_MOM_MEMBER 월별 건수 관리
 * 테이블·ENUM 정본: 사용자 요구(TB_MOM_MEMBER, FEE_POLICY_CNT, …)
 */
const { getCurrentYyyyMm } = require('./loginPayload');

/** @typedef {{ ackMessage: string, disableFurtherBid: boolean, remainingCnt: number, useCnt: number, basicCnt: number }} MomMemberOk */

function isNoSuchTable(e) {
    return e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146);
}

/**
 * @param {import('mysql2').PoolConnection} connection
 * @param {string} custId TB_USER.CUST_ID
 * @returns {Promise<{ ok: true, payload: MomMemberOk } | { ok: false, status: number, code: string, lines: string[] }>}
 */
async function applyMomMemberAfterBid(connection, custId) {
    const cust = String(custId || '').trim();
    if (!cust) {
        return { ok: false, status: 400, code: 'CUST_ID_REQUIRED', lines: ['기사 식별(CUST_ID)이 없습니다.'] };
    }

    const yyyyMM = getCurrentYyyyMm();
    const modId = cust;

    let userId = '';
    try {
        const [uRows] = await connection.execute(
            `SELECT USER_ID FROM TB_USER WHERE CUST_ID = ? LIMIT 1`,
            [cust]
        );
        userId = uRows[0]?.USER_ID != null ? String(uRows[0].USER_ID).trim() : '';
    } catch (e) {
        if (isNoSuchTable(e)) {
            return { ok: false, status: 503, code: 'SCHEMA', lines: ['TB_USER 테이블을 확인할 수 없습니다.'] };
        }
        throw e;
    }
    if (!userId) {
        return { ok: false, status: 404, code: 'USER_NOT_FOUND', lines: ['로그인 사용자(TB_USER)를 찾을 수 없습니다.'] };
    }

    let momRows;
    try {
        const [r] = await connection.execute(
            `SELECT CUST_ID, YYYYMM, FEE_POLICY AS feePolicy, BASIC_CNT AS basicCnt, USE_CNT AS useCnt, REMAINING_CNT AS remainingCnt
             FROM TB_MOM_MEMBER
             WHERE CUST_ID = ? AND YYYYMM = ?
             LIMIT 1`,
            [cust, yyyyMM]
        );
        momRows = r;
    } catch (e) {
        if (isNoSuchTable(e)) {
            return {
                ok: false,
                status: 503,
                code: 'TB_MOM_MEMBER_MISSING',
                lines: ['TB_MOM_MEMBER 테이블이 없습니다.', 'busTaams_server/sql/tb_mom_member.sql 을 적용한 뒤 다시 시도하세요.'],
            };
        }
        throw e;
    }

    const fetchBasicCntFromCommon = async (dtlCd) => {
        const dtl = String(dtlCd || '').trim();
        if (!dtl) {
            return { ok: false, lines: ['등급 코드가 비어 있습니다.'], code: 'FEE_POLICY_EMPTY' };
        }
        const [cRows] = await connection.execute(
            `SELECT CD_FNUM AS cdFnum
               FROM TB_COMMON_CODE
              WHERE GRP_CD = 'FEE_POLICY_CNT' AND DTL_CD = ? AND (USE_YN = 'Y' OR USE_YN IS NULL)
              LIMIT 1`,
            [dtl]
        );
        if (!cRows.length) {
            return {
                ok: false,
                lines: [
                    '버스 기사 등급이 등록되어 있지 않습니다.',
                    '버스탐스 본사에 문의후 재거래 하세요.',
                ],
                code: 'FEE_POLICY_CNT_ROW_MISSING',
            };
        }
        const raw = cRows[0].cdFnum;
        const num = raw == null || raw === '' ? NaN : Number(raw);
        if (!Number.isFinite(num) || num <= 0) {
            return {
                ok: false,
                lines: [
                    '버스 기사 등급의 기본 건수가 등록되어 있지 않습니다.',
                    '버스탐스 본사에 문의후 재거래 하세요.',
                ],
                code: 'FEE_POLICY_CNT_INVALID',
            };
        }
        return { ok: true, basicCnt: Math.floor(num) };
    };

    if (momRows.length > 0) {
        const m = momRows[0];
        const basicCnt = Number(m.basicCnt) || 0;
        let useCnt = Number(m.useCnt) || 0;
        let remainingCnt = Number(m.remainingCnt);
        if (!Number.isFinite(remainingCnt)) remainingCnt = Math.max(0, basicCnt - useCnt);

        if (remainingCnt < 1) {
            return {
                ok: false,
                status: 409,
                code: 'MOM_QUOTA_EXHAUSTED',
                lines: ['기사님이 청약할 수 있는 건수를 모두 사용하셨습니다.'],
            };
        }

        const useNext = useCnt + 1;
        const remNext = Math.max(0, basicCnt - useNext);

        await connection.execute(
            `UPDATE TB_MOM_MEMBER SET
                USE_CNT = ?,
                REMAINING_CNT = ?,
                MOD_DT = NOW(),
                MOD_ID = ?
             WHERE CUST_ID = ? AND YYYYMM = ?`,
            [useNext, remNext, modId, cust, yyyyMM]
        );

        return {
            ok: true,
            payload: {
                ackMessage: '청약 정상 처리',
                disableFurtherBid: true,
                remainingCnt: remNext,
                useCnt: useNext,
                basicCnt,
            },
        };
    }

    let detailRows;
    try {
        const [dRows] = await connection.execute(
            `SELECT d.FEE_POLICY AS feePolicy
             FROM TB_DRIVER_DETAIL d
             INNER JOIN TB_USER u ON u.USER_ID = d.USER_ID
             WHERE u.CUST_ID = ?
             LIMIT 1`,
            [cust]
        );
        detailRows = dRows;
    } catch (e) {
        if (isNoSuchTable(e)) {
            return { ok: false, status: 503, code: 'TB_DRIVER_DETAIL_MISSING', lines: ['TB_DRIVER_DETAIL 테이블을 확인할 수 없습니다.'] };
        }
        throw e;
    }

    if (!detailRows.length) {
        return {
            ok: false,
            status: 409,
            code: 'DRIVER_DETAIL_MISSING',
            lines: ['버스기사 정보 등록후 청약 등록할 수 있습니다'],
        };
    }

    let feePolicy = detailRows[0].feePolicy != null ? String(detailRows[0].feePolicy).trim() : '';
    if (!feePolicy) {
        feePolicy = 'DRIVER';
        try {
            await connection.execute(
                `UPDATE TB_DRIVER_DETAIL SET FEE_POLICY = 'DRIVER', MOD_DT = NOW(), MOD_ID = ? WHERE USER_ID = ?`,
                [modId, userId]
            );
        } catch (e) {
            if (!isNoSuchTable(e) && e.code !== 'ER_BAD_FIELD_ERROR' && e.errno !== 1054) throw e;
        }
    }

    const bc = await fetchBasicCntFromCommon(feePolicy);
    if (!bc.ok) {
        return { ok: false, status: 409, code: bc.code, lines: bc.lines };
    }

    const basicCnt = bc.basicCnt;
    const useCnt = 1;
    const remainingCnt = Math.max(0, basicCnt - useCnt);

    try {
        await connection.execute(
            `INSERT INTO TB_MOM_MEMBER (
                CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
            [cust, yyyyMM, feePolicy, basicCnt, useCnt, remainingCnt, modId, modId]
        );
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
            return {
                ok: false,
                status: 409,
                code: 'MOM_ROW_RACE',
                lines: ['동시에 청약이 처리되었습니다.', '목록을 새로고침한 뒤 다시 시도하세요.'],
            };
        }
        if (e.code === 'WARN_DATA_TRUNCATED' || e.errno === 1265) {
            return {
                ok: false,
                status: 400,
                code: 'FEE_POLICY_ENUM',
                lines: ['FEE_POLICY 값이 TB_MOM_MEMBER ENUM과 맞지 않습니다.', 'tb_mom_member.sql / alter_tb_mom_member_fee_policy_enum.sql 을 확인하세요.'],
            };
        }
        throw e;
    }

    return {
        ok: true,
        payload: {
            ackMessage: '청약 정상 처리',
            disableFurtherBid: true,
            remainingCnt,
            useCnt,
            basicCnt,
        },
    };
}

module.exports = {
    applyMomMemberAfterBid,
};
