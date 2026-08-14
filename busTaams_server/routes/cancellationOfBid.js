/**
 * 버스기사 응찰 취소 (화면·API ID: CancellationOfBid)
 * GET  /api/CancellationOfBid/summary?driverId=
 * POST /api/CancellationOfBid  (multipart)
 *   필수: reqId, resId, reqBusSeq, driverId, cancellationReasonCode, cancelBusDriverCntSnapshot
 *   선택: travelerId, busId(검증), detailReason, attachments[]
 */

const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const {
    executeDriverBidCancellation,
    MSGS,
    MAX_DRIVER_BID_CANCEL_ACCUM,
} = require('../lib/driverBidCancellation');
const { fetchLastHistProofFileMetas } = require('../lib/driverCancelProofAccess');

const SCREEN_ID = 'CancellationOfBid';
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const storage = new Storage();
const gcsBucket = storage.bucket(bucketName);

const ALLOWED_REASON_CODES = new Set([
    'CHANGE_OF_MIND',
    'DEATH_SELF',
    'VEHICLE_DAMAGE',
    'LEGAL_CUSTODY',
    'DEATH_KIN_SPOUSE',
    'HOSPITALIZATION',
    'OUTPATIENT_SAME_DAY',
    'OTHER',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype);
        if (ok) cb(null, true);
        else cb(new Error('지원 형식: PDF, JPG, PNG (최대 10MB)'));
    },
});

/**
 * @param {import('express').Application} app
 * @param {import('mysql2/promise').Pool} pool
 */
function mountCancellationOfBid(app, pool) {
    app.get('/api/CancellationOfBid/summary', async (req, res) => {
        const driverId = req.query.driverId != null ? String(req.query.driverId).trim() : '';
        if (!driverId) {
            return res.status(400).json({ error: 'driverId가 필요합니다.', CancellationOfBid: { screenId: SCREEN_ID } });
        }
        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
                `SELECT COALESCE(CANCEL_BUS_DRIVER_CNT, 0) AS cancelBusDriverCnt,
                        TRADE_RESTRICT_YN AS tradeRestrictYn,
                        TRADE_RESTRICT_START_DT AS tradeRestrictStartDt,
                        TRADE_RESTRICT_END_DT AS tradeRestrictEndDt
                   FROM TB_USER_CANCEL_MANAGE
                  WHERE CUST_ID = ?
                  LIMIT 1`,
                [driverId]
            );
            const m = rows[0];
            const rawCnt = m != null ? m.cancelBusDriverCnt : null;
            const cumulativeCancelCount =
                m != null
                    ? Math.max(
                          0,
                          Math.min(
                              MAX_DRIVER_BID_CANCEL_ACCUM,
                              Number.isFinite(Number(rawCnt)) ? Math.trunc(Number(rawCnt)) : 0
                          )
                      )
                    : 0;
            const yn = m != null && String(m.tradeRestrictYn || '').toUpperCase() === 'Y' ? 'Y' : 'N';
            const tradeRestrictLabel =
                yn === 'Y' ? `제한 (Y) ${m?.tradeRestrictEndDt ? '~' + String(m.tradeRestrictEndDt).slice(0, 10) : ''}` : '정상 (N)';
            let lastProofAttachments = [];
            try {
                lastProofAttachments = await fetchLastHistProofFileMetas(connection, driverId);
            } catch (e2) {
                console.warn('CancellationOfBid summary lastProofAttachments:', e2.message || e2);
            }
            return res.json({
                CancellationOfBid: {
                    screenId: SCREEN_ID,
                    cumulativeCancelCount,
                    tradeRestrictYn: yn,
                    tradeRestrictLabel,
                    lastProofAttachments,
                },
            });
        } catch (e) {
            console.error('CancellationOfBid summary:', e);
            return res.status(500).json({ error: e.message, CancellationOfBid: { screenId: SCREEN_ID } });
        } finally {
            if (connection) connection.release();
        }
    });

    app.post(
        '/api/CancellationOfBid',
        (req, res, next) => {
            upload.array('attachments', 5)(req, res, (err) => {
                if (err) {
                    const msg = err.message || '파일 업로드 오류';
                    return res.status(400).json({ error: msg, CancellationOfBid: { screenId: SCREEN_ID } });
                }
                next();
            });
        },
        async (req, res) => {
            const reqId = req.body.reqId != null ? String(req.body.reqId).trim() : '';
            const driverId = req.body.driverId != null ? String(req.body.driverId).trim() : '';
            const resId = req.body.resId != null ? String(req.body.resId).trim() : '';
            const reqBusSeqRaw = req.body.reqBusSeq != null ? String(req.body.reqBusSeq).trim() : '';
            const reqBusSeq = parseInt(reqBusSeqRaw, 10);
            const travelerId = req.body.travelerId != null ? String(req.body.travelerId).trim() : '';
            const busId = req.body.busId != null ? String(req.body.busId).trim() : '';
            const cancellationReasonCode =
                req.body.cancellationReasonCode != null ? String(req.body.cancellationReasonCode).trim() : '';
            const detailReason = req.body.detailReason != null ? String(req.body.detailReason).trim() : '';
            const snapRaw =
                req.body.cancelBusDriverCntSnapshot != null ? String(req.body.cancelBusDriverCntSnapshot).trim() : '';
            const cancelBusDriverCntSnapshot = parseInt(snapRaw, 10);

            if (!reqId || !driverId || !resId || !Number.isFinite(reqBusSeq) || reqBusSeq < 0) {
                return res.status(400).json({
                    error: 'reqId, resId, reqBusSeq(≥0), driverId가 필요합니다.',
                    CancellationOfBid: { screenId: SCREEN_ID },
                });
            }
            if (
                !Number.isFinite(cancelBusDriverCntSnapshot) ||
                cancelBusDriverCntSnapshot < 0 ||
                cancelBusDriverCntSnapshot > MAX_DRIVER_BID_CANCEL_ACCUM ||
                !Number.isInteger(cancelBusDriverCntSnapshot)
            ) {
                return res.status(400).json({
                    error: `청약 취소 누적 건수(cancelBusDriverCntSnapshot: 0~${MAX_DRIVER_BID_CANCEL_ACCUM})가 필요합니다.`,
                    CancellationOfBid: { screenId: SCREEN_ID },
                });
            }
            if (!cancellationReasonCode || !ALLOWED_REASON_CODES.has(cancellationReasonCode)) {
                return res.status(400).json({
                    error: '취소 사유(cancellationReasonCode)를 선택해 주세요.',
                    CancellationOfBid: { screenId: SCREEN_ID },
                });
            }

            const cancelReasonText = detailReason || cancellationReasonCode;
            const files = (req.files || []).map((f) => ({
                buffer: f.buffer,
                mimetype: f.mimetype,
                originalname: f.originalname,
            }));

            let connection;
            try {
                connection = await pool.getConnection();

                const [preRows] = await connection.execute(
                    `SELECT TRAVELER_ID AS travelerId, BUS_ID AS busId, DATA_STAT AS dataStat
                       FROM TB_BUS_RESERVATION
                      WHERE RES_ID = ? AND REQ_ID = ? AND REQ_BUS_SEQ = ? AND DRIVER_ID = ?
                      LIMIT 1`,
                    [resId, reqId, reqBusSeq, driverId]
                );
                const pre = preRows[0];
                if (!pre) {
                    return res.status(404).json({
                        error: '입찰 정보를 찾을 수 없습니다.',
                        CancellationOfBid: { screenId: SCREEN_ID },
                    });
                }
                const preStat = String(pre.dataStat || '').toUpperCase();
                if (preStat !== 'CUSTOMER_PAY_WAIT' && preStat !== 'CONFIRM') {
                    return res.status(409).json({
                        error: MSGS.NOT_BIDDING_OR_CONFIRM,
                        errorCode: 'NOT_BIDDING_OR_CONFIRM',
                        CancellationOfBid: { screenId: SCREEN_ID },
                    });
                }
                if (travelerId && pre.travelerId != null && String(pre.travelerId) !== travelerId) {
                    return res.status(400).json({
                        error: 'travelerId가 예약 정보와 일치하지 않습니다.',
                        CancellationOfBid: { screenId: SCREEN_ID },
                    });
                }
                if (busId && pre.busId != null && String(pre.busId) !== busId) {
                    return res.status(400).json({
                        error: 'busId가 예약 정보와 일치하지 않습니다.',
                        CancellationOfBid: { screenId: SCREEN_ID },
                    });
                }

                await connection.beginTransaction();
                const result = await executeDriverBidCancellation(connection, gcsBucket, {
                    resId,
                    reqId,
                    reqBusSeq,
                    driverCustId: driverId,
                    cancellationReasonCode,
                    cancelReasonText,
                    cancelBusDriverCntSnapshot,
                    files,
                });

                if (!result.ok) {
                    await connection.rollback();
                    return res.status(result.status).json({
                        error: result.message,
                        errorCode: result.code,
                        CancellationOfBid: { screenId: SCREEN_ID },
                    });
                }

                await connection.commit();

                console.log(
                    `[${SCREEN_ID}] cancel RES_ID=${resId} REQ_ID=${reqId} REQ_BUS_SEQ=${reqBusSeq} DRIVER_ID=${driverId}` +
                        ` reason=${cancellationReasonCode} files=${files.length}`
                );

                return res.json({
                    CancellationOfBid: {
                        screenId: SCREEN_ID,
                        success: true,
                        message: '응찰 취소가 처리되었습니다.',
                        attachmentCount: files.length,
                        cancellationReasonCode,
                    },
                });
            } catch (e) {
                if (connection) {
                    try {
                        await connection.rollback();
                    } catch (r) {
                        /* ignore */
                    }
                }
                console.error('CancellationOfBid POST:', e);
                return res.status(500).json({ error: e.message, CancellationOfBid: { screenId: SCREEN_ID } });
            } finally {
                if (connection) connection.release();
            }
        }
    );
}

mountCancellationOfBid.SCREEN_ID = SCREEN_ID;
module.exports = mountCancellationOfBid;
