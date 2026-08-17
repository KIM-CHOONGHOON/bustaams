const axios = require('axios');
const crypto = require('crypto');
const { allocateSequentialFileIds } = require('./allocateFileIds');
const { orgFileNmAndExt } = require('./bt_common_utils');

// 💰 이니시스 카드 결제 취소 (환불) 요청 헬퍼 함수
async function cancelInicisPayment({ tid, msg, clientIp }) {
    try {
        const mid = process.env.INICIS_MID || 'INIpayTest';
        const apiKey = process.env.INICIS_BILL_API_KEY || 'rKnPljRn5m6J9Mzz';
        const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);

        const type = 'Refund';
        const paymethod = 'Card';
        const hashDataStr = apiKey + type + paymethod + timestamp + (clientIp || '127.0.0.1') + mid + tid;
        const hashData = crypto.createHash('sha256').update(hashDataStr).digest('hex');

        const params = {
            type,
            paymethod,
            timestamp,
            clientIp: clientIp || '127.0.0.1',
            mid,
            tid,
            msg: msg || '기사 청약 취소 (환불)',
            hashData
        };

        const response = await axios.post('https://iniapi.inicis.com/api/v1/refund', params, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('>>> [Inicis Driver Cancel Refund Response]:', response.data);
        return response.data;
    } catch (err) {
        console.error('>>> [Inicis Driver Cancel Refund Error]:', err.message);
        return null;
    }
}

/** 누적 허용: 10회까지(11회째부터 거절). 스냅샷·클램프에 동일 적용. */
/** const MAX_DRIVER_BID_CANCEL_ACCUM = 10;

/** 누적 허용: 10회까지(11회째부터 거절). 스냅샷·클램프에 동일 적용. */
const MAX_DRIVER_BID_CANCEL_ACCUM = 10;

const DRIVER_CANCEL_FILE_CATEGORY = 'DRIVER_CANCEL_REPORT';
const GCS_BUCKET_FIXED = 'bustaams-secure-data';

/** 거래 제한 시작: 취소 등록일 당일 00:01:01 */
function cancelRegistrationDay000101(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 1, 1, 0);
}

function addDays(dt, days) {
    const x = new Date(dt.getTime());
    x.setDate(x.getDate() + days);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 1, 1, 0);
}

/** TB_USER.USER_TYPE → TB_USER_CANCEL_MANAGE.USER_TYPE (설계: TB_USER와 동일 ENUM 권장) */
function normalizeManageUserType(raw) {
    const s = raw != null ? String(raw).trim().toUpperCase() : '';
    const allowed = new Set(['TRAVELER', 'DRIVER', 'PARTNER', 'ADMIN']);
    if (allowed.has(s)) return s;
    return 'DRIVER';
}

const MSGS = {
    NOT_BIDDING_OR_CONFIRM:
        '여행 취소 요청한 정보는 청약 또는 여행 확정 정보가 아닙니다.\n버스탐스 운영부에 문의후 재거래 하세요.',
    MAX_CANCELS:
        '청약 취소 가능 건수 초과되었습니다.\n버스탐스 운영부에 문의후 재거래 하세요.',
    SNAPSHOT_STALE:
        '청약 취소 건수 정보가 변경되었습니다. 모달을 닫았다가 다시 열어 주세요.',
    AUCTION_REQ_BUS_MISMATCH:
        '요청 차량(TB_AUCTION_REQ_BUS) 정보를 갱신할 수 없습니다.\n해당 REQ_ID·REQ_BUS_SEQ 행을 확인하세요.',
    AUCTION_REQ_MISMATCH:
        '견적 요청(TB_AUCTION_REQ) 마스터를 갱신할 수 없습니다.\nREQ_ID 를 확인하세요.',
    USER_NOT_FOUND:
        '회원(TB_USER) 정보를 찾을 수 없습니다. 로그인 상태를 확인해 주세요.',
};

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {{ name?: string }} bucket — `@google-cloud/storage` Bucket (`name`으로 DB에 기록)
 * @param {{
 *   resId: string,
 *   reqId: string,
 *   reqBusSeq: number,
 *   driverCustId: string,
 *   cancellationReasonCode: string,
 *   cancelReasonText: string,
 *   cancelBusDriverCntSnapshot: number,
 *   files: Array<{ buffer: Buffer, mimetype: string, originalname: string }>,
 * }} p
 * @returns {Promise<
 *   | { ok: true, fileIds: string[] }
 *   | { ok: false, status: number, code: string, message: string }
 * >}
 */
async function executeDriverBidCancellation(connection, bucket, p) {
    const {
        resId,
        reqId,
        reqBusSeq,
        driverCustId,
        cancellationReasonCode,
        cancelReasonText,
        cancelBusDriverCntSnapshot,
        files = [],
    } = p;

    const snap = Number(cancelBusDriverCntSnapshot);
    if (!Number.isFinite(snap) || snap < 0 || snap > MAX_DRIVER_BID_CANCEL_ACCUM || !Number.isInteger(snap)) {
        return {
            ok: false,
            status: 400,
            code: 'BAD_CANCEL_SNAPSHOT',
            message: `청약 취소 누적 건수(cancelBusDriverCntSnapshot)는 0~${MAX_DRIVER_BID_CANCEL_ACCUM} 정수여야 합니다.`,
        };
    }

    const gcsBucketNm = bucket.name || GCS_BUCKET_FIXED;
    const modId = driverCustId;

    const [userTypeRows] = await connection.execute(
        `SELECT USER_TYPE FROM TB_USER WHERE TRIM(CUST_ID) = TRIM(?) LIMIT 1`,
        [driverCustId]
    );
    if (!userTypeRows.length) {
        return { ok: false, status: 409, code: 'USER_NOT_FOUND', message: MSGS.USER_NOT_FOUND };
    }
    const userTypeRaw = userTypeRows[0]?.USER_TYPE ?? userTypeRows[0]?.user_type;
    const manageUserType = normalizeManageUserType(userTypeRaw);

    /* 모달 스냅샷과 TB_USER_CANCEL_MANAGE 현재값 일치 (FOR UPDATE) — 증가분은 prevDb 기준 +1 */
    const [manageRows] = await connection.execute(
        `SELECT COALESCE(CANCEL_BUS_DRIVER_CNT, 0) AS cancelBusDriverCnt
           FROM TB_USER_CANCEL_MANAGE
          WHERE CUST_ID = ?
          LIMIT 1
          FOR UPDATE`,
        [driverCustId]
    );
    const manageRow = manageRows[0];
    const prevDbRaw = manageRow != null ? manageRow.cancelBusDriverCnt : 0;
    const prevDb =
        manageRow != null
            ? Math.max(
                  0,
                  Math.min(
                      MAX_DRIVER_BID_CANCEL_ACCUM,
                      Number.isFinite(Number(prevDbRaw)) ? Math.trunc(Number(prevDbRaw)) : 0
                  )
              )
            : 0;

    if (snap !== prevDb) {
        return {ok: false, status: 409, code: 'CANCEL_SNAPSHOT_STALE', message: MSGS.SNAPSHOT_STALE};
    }
    if (snap >= MAX_DRIVER_BID_CANCEL_ACCUM) {
        return {ok: false, status: 409, code: 'MAX_DRIVER_BID_CANCELS', message: MSGS.MAX_CANCELS};
    }

    /** 실제 반영 값은 DB(prevDb) 기준 +1만 허용 — 스냅샷은 검증용이라 snap≠prevDb 이면 위에서 차단됨 */
    const nextCnt = prevDb + 1;
    if (nextCnt > MAX_DRIVER_BID_CANCEL_ACCUM) {
        return {ok: false, status: 409, code: 'MAX_DRIVER_BID_CANCELS', message: MSGS.MAX_CANCELS};
    }

    const [resRows] = await connection.execute(
        `SELECT RES_ID, REQ_ID, REQ_BUS_SEQ, DATA_STAT, TRAVELER_ID, BUS_ID, DRIVER_ID,
                CUSTOMER_PAY_STAT, CUSTOMER_PAY_ID, CUSTOMER_PAY_AMT,
                DRIVER_PAY_STAT, DRIVER_PAY_ID, DRIVER_PAY_AMT
           FROM TB_BUS_RESERVATION
          WHERE RES_ID = ? AND REQ_ID = ? AND REQ_BUS_SEQ = ?
            AND DRIVER_ID = ?
            AND DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'DRIVER_PAY_WAIT', 'FINAL_APPROVAL_WAIT', 'CONFIRM')
          LIMIT 1
          FOR UPDATE`,
        [resId, reqId, reqBusSeq, driverCustId]
    );
    if (!resRows[0]) {
        return {ok: false, status: 409, code: 'NOT_BIDDING_OR_CONFIRM', message: MSGS.NOT_BIDDING_OR_CONFIRM};
    }

    const targetRes = resRows[0];

    // 💰 결제 완료된 카드 건이 있을 경우 PG 카드 승인 취소 연동
    if (targetRes.CUSTOMER_PAY_STAT === 'Y' && targetRes.CUSTOMER_PAY_ID) {
        await cancelInicisPayment({
            tid: targetRes.CUSTOMER_PAY_ID,
            msg: '기사 청약 취소로 인한 고객 결제 환불',
            clientIp: '127.0.0.1'
        });
        await connection.execute(
            `UPDATE TB_BUS_RESERVATION SET CUSTOMER_PAY_STAT = 'C', CUSTOMER_REFUND_DT = NOW(), CUSTOMER_REFUND_AMT = ? WHERE RES_ID = ?`,
            [targetRes.CUSTOMER_PAY_AMT || 0, resId]
        );
    }
    if (targetRes.DRIVER_PAY_STAT === 'Y' && targetRes.DRIVER_PAY_ID) {
        await cancelInicisPayment({
            tid: targetRes.DRIVER_PAY_ID,
            msg: '기사 청약 취소로 인한 이용료 환불',
            clientIp: '127.0.0.1'
        });
        await connection.execute(
            `UPDATE TB_BUS_RESERVATION SET DRIVER_PAY_STAT = 'C' WHERE RES_ID = ?`,
            [resId]
        );
    }

    const [uRes] = await connection.execute(
        `UPDATE TB_BUS_RESERVATION
            SET DATA_STAT = 'DRIVER_CANCEL',
                MOD_DT = NOW(),
                MOD_ID = ?
          WHERE RES_ID = ? AND REQ_ID = ? AND REQ_BUS_SEQ = ?
            AND DRIVER_ID = ?
            AND DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'DRIVER_PAY_WAIT', 'FINAL_APPROVAL_WAIT', 'CONFIRM')`,
        [modId, resId, reqId, reqBusSeq, driverCustId]
    );
    if (uRes.affectedRows !== 1) {
        return {ok: false, status: 409, code: 'NOT_BIDDING_OR_CONFIRM', message: MSGS.NOT_BIDDING_OR_CONFIRM};
    }

    const [busUp] = await connection.execute(
        `UPDATE TB_AUCTION_REQ_BUS
            SET DATA_STAT = 'BUS_CANCEL',
                MOD_DT = NOW(),
                MOD_ID = ?
          WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
        [modId, reqId, reqBusSeq]
    );
    if (busUp.affectedRows !== 1) {
        return {ok: false, status: 409, code: 'AUCTION_REQ_BUS_MISMATCH', message: MSGS.AUCTION_REQ_BUS_MISMATCH};
    }

    const [reqUp] = await connection.execute(
        `UPDATE TB_AUCTION_REQ
            SET DATA_STAT = 'AUCTION',
                MOD_DT = NOW(),
                MOD_ID = ?
          WHERE REQ_ID = ?`,
        [modId, reqId]
    );
    if (reqUp.affectedRows !== 1) {
        return {ok: false, status: 409, code: 'AUCTION_REQ_MISMATCH', message: MSGS.AUCTION_REQ_MISMATCH};
    }

    /* TB_USER_CANCEL_MANAGE — 누적 + 거래제한 (취소 등록일 당일 0:01:01 시작, 종료는 항상 +7일) */
    const startRestrict = cancelRegistrationDay000101();
    const restrictEnd = addDays(startRestrict, 7);

    if (!manageRow) {
        const [ins] = await connection.execute(
            `INSERT INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, USER_TYPE, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT,
                TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, 0, ?, 0, 0, 'Y', ?, ?, NOW(), ?, NOW(), ?)`,
            [driverCustId, manageUserType, nextCnt, startRestrict, restrictEnd, modId, modId]
        );
        if (ins.affectedRows !== 1) {
            return {ok: false, status: 409, code: 'CANCEL_SNAPSHOT_STALE', message: MSGS.SNAPSHOT_STALE};
        }
    } else {
        const [upd] = await connection.execute(
            `UPDATE TB_USER_CANCEL_MANAGE
                SET USER_TYPE = ?,
                    CANCEL_BUS_DRIVER_CNT = COALESCE(CANCEL_BUS_DRIVER_CNT, 0) + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = ?,
                    TRADE_RESTRICT_END_DT = ?,
                    MOD_DT = NOW(),
                    MOD_ID = ?
              WHERE CUST_ID = ?
                AND COALESCE(CANCEL_BUS_DRIVER_CNT, 0) = ?`,
            [manageUserType, startRestrict, restrictEnd, modId, driverCustId, prevDb]
        );
        if (upd.affectedRows !== 1) {
            return {ok: false, status: 409, code: 'CANCEL_SNAPSHOT_STALE', message: MSGS.SNAPSHOT_STALE};
        }
    }

    const fileIds = files.length > 0 ? await allocateSequentialFileIds(connection, files.length) : [];
    const reasonDoc = fileIds.length > 0 ? fileIds.join(',') : null;

    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fileId = fileIds[i];
        const gcsPath = `${DRIVER_CANCEL_FILE_CATEGORY}/${driverCustId}/${fileId}`;
        const objKey = `${gcsPath}/${fileId}`;
        const hint = f.originalname || 'file';
        const mime = f.mimetype || 'application/octet-stream';
        let extFromMime = '';
        if (mime.includes('pdf')) extFromMime = 'pdf';
        else if (mime.includes('jpeg') || mime.includes('jpg')) extFromMime = 'jpeg';
        else if (mime.includes('png')) extFromMime = 'png';
        else if (mime.includes('webp')) extFromMime = 'webp';
        else if (mime.includes('gif')) extFromMime = 'gif';

        const { orgFileNm, fileExt } = orgFileNmAndExt(hint, {
            buffer: f.buffer,
            ext: extFromMime,
            mime,
            orgName: hint,
        });

        const gcsFile = bucket.file(objKey);
        await gcsFile.save(f.buffer, {
            metadata: {contentType: f.mimetype || 'application/octet-stream'},
            resumable: false,
        });

        await connection.execute(
            `INSERT INTO TB_FILE_MASTER (
                FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
            [
                fileId,
                DRIVER_CANCEL_FILE_CATEGORY,
                gcsBucketNm,
                gcsPath,
                orgFileNm,
                fileExt,
                f.buffer.length,
                modId,
                modId,
            ]
        );
    }

    /* 4. TB_USER_CANCEL_HIST — 첫 행이면 HIST_SEQ=1·REG_* 명시, 이후는 MAX+1·REG_* 생략(DB 기본) */
    const [mxRows] = await connection.execute(
        `SELECT COALESCE(MAX(HIST_SEQ), 0) AS m FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?`,
        [driverCustId]
    );
    const maxHist = Number(mxRows[0]?.m) || 0;
    const nextHist = maxHist + 1;
    const isFirstHist = maxHist === 0;

    if (isFirstHist) {
        await connection.execute(
            `INSERT INTO TB_USER_CANCEL_HIST (
                CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, CANCEL_REASON_TEXT,
                REASON_DOC_FILE_NM, REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, ?, 'CANCEL_REASON', ?, ?, ?, NOW(), ?, NOW(), ?)`,
            [
                driverCustId,
                nextHist,
                cancellationReasonCode,
                cancelReasonText.slice(0, 2000),
                reasonDoc,
                modId,
                modId,
            ]
        );
    } else {
        await connection.execute(
            `INSERT INTO TB_USER_CANCEL_HIST (
                CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, CANCEL_REASON_TEXT,
                REASON_DOC_FILE_NM, MOD_DT, MOD_ID
            ) VALUES (?, ?, 'CANCEL_REASON', ?, ?, ?, NOW(), ?)`,
            [
                driverCustId,
                nextHist,
                cancellationReasonCode,
                cancelReasonText.slice(0, 2000),
                reasonDoc,
                modId,
            ]
        );
    }

    return {ok: true, fileIds};
}

module.exports = {
    executeDriverBidCancellation,
    DRIVER_CANCEL_FILE_CATEGORY,
    GCS_BUCKET_FIXED,
    MSGS,
    MAX_DRIVER_BID_CANCEL_ACCUM,
};
