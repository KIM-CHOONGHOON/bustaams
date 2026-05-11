/**
 * 버스기사 청약 취소 — 모달 오픈 시점 CANCEL_BUS_DRIVER_CNT 스냅샷과 DB 동기화 후 TB_BUS_RESERVATION·취소 관리·이력·파일
 * (`BusTaams_Project 테이블 설계.md` 정본. TB_AUCTION_REQ / TB_AUCTION_REQ_BUS 는 갱신하지 않음.)
 */

const { allocateSequentialFileIds } = require('./allocateFileIds');

const DRIVER_CANCEL_FILE_CATEGORY = 'DRIVER_CANCEL_REPORT';
const GCS_BUCKET_FIXED = 'bustaams-secure-data';

function tomorrow000101(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 1, 1, 0);
    return x;
}

function addDays(dt, days) {
    const x = new Date(dt.getTime());
    x.setDate(x.getDate() + days);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 1, 1, 0);
}

const MSGS = {
    NOT_BIDDING_OR_CONFIRM:
        '여행 취소 요청한 정보는 청약 또는 여행 확정 정보가 아닙니다.\n버스탐스 운영부에 문의후 재거래 하세요.',
    MAX_CANCELS:
        '청약 취소 가능 건수 초과되었습니다.\n버스탐스 운영부에 문의후 재거래 하세요.',
    SNAPSHOT_STALE:
        '청약 취소 건수 정보가 변경되었습니다. 모달을 닫았다가 다시 열어 주세요.',
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
    if (!Number.isFinite(snap) || snap < 0 || snap > 2 || !Number.isInteger(snap)) {
        return {
            ok: false,
            status: 400,
            code: 'BAD_CANCEL_SNAPSHOT',
            message: '청약 취소 누적 건수(cancelBusDriverCntSnapshot)가 올바르지 않습니다.',
        };
    }

    const gcsBucketNm = bucket.name || GCS_BUCKET_FIXED;
    const modId = driverCustId;

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
            ? Math.max(0, Math.min(2, Number.isFinite(Number(prevDbRaw)) ? Math.trunc(Number(prevDbRaw)) : 0))
            : 0;

    if (snap !== prevDb) {
        return {ok: false, status: 409, code: 'CANCEL_SNAPSHOT_STALE', message: MSGS.SNAPSHOT_STALE};
    }
    if (snap >= 2) {
        return {ok: false, status: 409, code: 'MAX_DRIVER_BID_CANCELS', message: MSGS.MAX_CANCELS};
    }

    /** 실제 반영 값은 DB(prevDb) 기준 +1만 허용 — 스냅샷은 검증용이라 snap≠prevDb 이면 위에서 차단됨 */
    const nextCnt = prevDb + 1;
    if (nextCnt > 2) {
        return {ok: false, status: 409, code: 'MAX_DRIVER_BID_CANCELS', message: MSGS.MAX_CANCELS};
    }

    const [resRows] = await connection.execute(
        `SELECT RES_ID, REQ_ID, REQ_BUS_SEQ, DATA_STAT, TRAVELER_ID, BUS_ID, DRIVER_ID
           FROM TB_BUS_RESERVATION
          WHERE RES_ID = ? AND REQ_ID = ? AND REQ_BUS_SEQ = ?
            AND DRIVER_ID = ?
            AND DATA_STAT IN ('BIDDING', 'CONFIRM')
          LIMIT 1
          FOR UPDATE`,
        [resId, reqId, reqBusSeq, driverCustId]
    );
    if (!resRows[0]) {
        return {ok: false, status: 409, code: 'NOT_BIDDING_OR_CONFIRM', message: MSGS.NOT_BIDDING_OR_CONFIRM};
    }

    const [uRes] = await connection.execute(
        `UPDATE TB_BUS_RESERVATION
            SET DATA_STAT = 'DRIVER_CANCEL',
                MOD_DT = NOW(),
                MOD_ID = ?
          WHERE RES_ID = ? AND REQ_ID = ? AND REQ_BUS_SEQ = ?
            AND DRIVER_ID = ?
            AND DATA_STAT IN ('BIDDING', 'CONFIRM')`,
        [modId, resId, reqId, reqBusSeq, driverCustId]
    );
    if (uRes.affectedRows !== 1) {
        return {ok: false, status: 409, code: 'NOT_BIDDING_OR_CONFIRM', message: MSGS.NOT_BIDDING_OR_CONFIRM};
    }

    /* 3. TB_USER_CANCEL_MANAGE — 누적 + 거래제한 (항상 prevDb+1, 이중 누적·레이스 방지: WHERE 조건) */
    const startRestrict = tomorrow000101();
    const weekEnd = addDays(startRestrict, 7);
    const twoWeekEnd = addDays(startRestrict, 14);
    const restrictEnd = nextCnt >= 2 ? twoWeekEnd : weekEnd;

    if (!manageRow) {
        const [ins] = await connection.execute(
            `INSERT INTO TB_USER_CANCEL_MANAGE (
                CUST_ID, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, CANCEL_TRAVELER_ALL_CNT, CANCEL_TRAVELER_PARTIAL_BUS_CNT,
                TRADE_RESTRICT_YN, TRADE_RESTRICT_START_DT, TRADE_RESTRICT_END_DT,
                REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (?, 0, ?, 0, 0, 'Y', ?, ?, NOW(), ?, NOW(), ?)`,
            [driverCustId, nextCnt, startRestrict, restrictEnd, modId, modId]
        );
        if (ins.affectedRows !== 1) {
            return {ok: false, status: 409, code: 'CANCEL_SNAPSHOT_STALE', message: MSGS.SNAPSHOT_STALE};
        }
    } else {
        const [upd] = await connection.execute(
            `UPDATE TB_USER_CANCEL_MANAGE
                SET CANCEL_BUS_DRIVER_CNT = COALESCE(CANCEL_BUS_DRIVER_CNT, 0) + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = ?,
                    TRADE_RESTRICT_END_DT = ?,
                    MOD_DT = NOW(),
                    MOD_ID = ?
              WHERE CUST_ID = ?
                AND COALESCE(CANCEL_BUS_DRIVER_CNT, 0) = ?`,
            [startRestrict, restrictEnd, modId, driverCustId, prevDb]
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
        const leaf = hint.replace(/\\/g, '/').split('/').pop() || 'file';
        const dot = leaf.lastIndexOf('.');
        let orgBase = leaf;
        let ext = 'bin';
        if (dot > 0) {
            orgBase = leaf.slice(0, dot);
            ext = leaf.slice(dot + 1).toLowerCase() || 'bin';
        }
        ext = String(ext).replace(/[^\w]/g, '').slice(0, 5) || 'bin';
        const orgNm = orgBase.replace(/[^a-zA-Z0-9._-가-힣]/g, '_').replace(/\.+$/, '') || 'file';

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
                orgNm,
                ext,
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
};
