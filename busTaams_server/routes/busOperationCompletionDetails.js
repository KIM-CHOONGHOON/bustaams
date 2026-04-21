/**
 * BusOperationCompletionDetails REST API
 * GET /api/bus-operation-completion-details
 *   ?driverId=&resId=&reqId=  (권장)
 *   | driverUuid, resUuid, reqUuid (레거시 별칭, 동일 의미)
 * 타임라인: TB_AUCTION_REQ_VIA — VIA_ORD ASC, 최대 9행
 *
 * DB: 레거시(RES_UUID/REQ_UUID/RES_STAT/REQ_UUID in VIA·BUS) vs ARCHITECTURE(RES_ID/REQ_ID/DATA_STAT)
 */
const { decrypt } = require('../crypto');

function safeDecryptUserNm(val) {
    if (val == null || val === '') return '';
    try {
        return decrypt(val);
    } catch (_) {
        return String(val);
    }
}

const VIA_TYPE_PREFIX = {
    START_NODE: '출발지',
    START_WAY: '출발 경유지',
    ROUND_TRIP: '회차지',
    END_WAY: '복귀 경유지',
    END_NODE: '도착지',
};

function buildViaTimeline(viaRows) {
    const rows = (viaRows || []).slice(0, 9);
    return rows.map((row, idx) => {
        const vtRaw = row.viaType ?? row.VIA_TYPE ?? '';
        const vt = String(vtRaw).trim().toUpperCase();
        const addr = String(row.viaAddr ?? row.VIA_ADDR ?? '').trim();
        const prefix = VIA_TYPE_PREFIX[vt] || '경유';
        const lineText = `${prefix} : ${addr || '—'}`;
        let nodeKind = 'middle';
        if (vt === 'START_NODE') nodeKind = 'start';
        else if (vt === 'END_NODE') nodeKind = 'end';
        return {
            viaOrd: Number(row.viaOrd ?? row.VIA_ORD) || idx + 1,
            viaType: vt || 'UNKNOWN',
            viaAddr: addr,
            lineText,
            nodeKind,
        };
    });
}

function normalizeUuidParam(s) {
    if (s == null || s === '') return '';
    return String(s).trim().toLowerCase();
}

function isSchemaMismatchError(e) {
    return e && (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR');
}

function looksLikeUuidString(s) {
    if (!s || typeof s !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/** mysql2 Row 필드명 대소문자 차이 흡수 */
function rowCol(row, logical) {
    if (!row || logical == null) return undefined;
    const want = String(logical);
    if (Object.prototype.hasOwnProperty.call(row, want)) return row[want];
    const lower = want.toLowerCase();
    for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lower) return row[k];
    }
    return undefined;
}

function mapAuctionReqBusRows(busRows) {
    const rows = busRows || [];
    return rows.map((b, idx) => {
        const id =
            b.reqBusId ??
            b.req_bus_id ??
            b.reqBusUuid ??
            b.req_bus_uuid ??
            null;
        return {
            reqBusId: id,
            reqBusUuid: id,
            busTypeCd: String(b.busTypeCd ?? b.bus_type_cd ?? '').trim() || null,
            reqBusCnt: Number(b.reqBusCnt ?? b.req_bus_cnt) || 0,
            reqAmtKrw: Number(b.reqAmt ?? b.req_amt ?? b.reqAmtKrw) || 0,
            sortOrder: idx + 1,
        };
    });
}

/** ARCH: 마스터 `REQ_AMT` 유무·기사 매칭(USER_UUID 서브쿼리 vs DRIVER_ID 직접)·여행자 조인 조합 */
function archDetailSelectFragments(opts) {
    const { byRes, masterReqAmt, driverBySessionUuid, travelerJoin } = opts;
    const travelerExpr = masterReqAmt
        ? 'COALESCE(r.REQ_AMT, 0)'
        : `(SELECT COALESCE(SUM(COALESCE(b.TOLLS_AMT, 0) + COALESCE(b.FUEL_COST, 0)), 0)
            FROM TB_AUCTION_REQ_BUS b WHERE b.REQ_ID = res.REQ_ID)`;
    const driverClause = driverBySessionUuid
        ? `res.DRIVER_ID = (
        SELECT COALESCE(NULLIF(TRIM(USER_SEQ_ID), ''), USER_ID)
          FROM TB_USER WHERE USER_UUID = UUID_TO_BIN(?) LIMIT 1)`
        : 'res.DRIVER_ID = ?';
    let userJoin = 'LEFT JOIN TB_USER u ON u.USER_ID = res.TRAVELER_ID';
    if (travelerJoin === 'coalesce_req') {
        userJoin = `LEFT JOIN TB_USER u ON u.USER_ID = COALESCE(NULLIF(TRIM(res.TRAVELER_ID), ''), r.TRAVELER_ID)`;
    }
    const idClause = byRes ? 'LOWER(res.RES_ID) = ?' : 'LOWER(r.REQ_ID) = ?';
    const orderLimit = byRes ? '' : '\n ORDER BY res.MOD_DT DESC\n LIMIT 1';
    const sql = `SELECT
    res.RES_ID                             AS resId,
    r.REQ_ID                               AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_DT                             AS startDt,
    r.END_DT                               AS endDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    ${travelerExpr}                 AS travelerRequestAmt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    u.USER_NM                              AS travelerUserNmEnc
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 ${userJoin}
 WHERE res.DATA_STAT = 'DONE'
   AND ${driverClause}
   AND ${idClause}
   AND r.END_DT IS NOT NULL${orderLimit}`;
    return sql;
}

async function tryArchDetailQueries(connection, duTrim, resUuid, reqUuidOpt) {
    const byRes = Boolean(resUuid);
    const secondId = byRes ? resUuid : reqUuidOpt;

    const attempts = [];
    const pushCombo = (masterReqAmt, driverBySessionUuid, travelerJoin) => {
        if (!driverBySessionUuid && looksLikeUuidString(duTrim)) return;
        attempts.push({
            sql: archDetailSelectFragments({
                byRes,
                masterReqAmt,
                driverBySessionUuid,
                travelerJoin,
            }),
            params: [duTrim, secondId],
        });
    };

    /** 비 UUID `driverUuid`(= TB_USER.USER_ID)는 `DRIVER_ID = ?` 조합을 먼저 시도 */
    const driverModes = looksLikeUuidString(duTrim) ? [true] : [false, true];
    for (const driverBySessionUuid of driverModes) {
        for (const masterReqAmt of [true, false]) {
            for (const travelerJoin of ['res_only', 'coalesce_req']) {
                pushCombo(masterReqAmt, driverBySessionUuid, travelerJoin);
            }
        }
    }

    for (const { sql, params } of attempts) {
        try {
            const [rows] = await connection.execute(sql, params);
            if (rows.length) return rows;
        } catch (e) {
            if (!isSchemaMismatchError(e)) throw e;
        }
    }
    return [];
}

const SQL_DETAIL_RES_LEGACY = `SELECT
    BIN_TO_UUID(res.RES_UUID)              AS resId,
    BIN_TO_UUID(r.REQ_UUID)                AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_DT                             AS startDt,
    r.END_DT                               AS endDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(r.REQ_AMT, 0)                 AS travelerRequestAmt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    u.USER_NM                              AS travelerUserNmEnc
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
 LEFT JOIN TB_USER u
   ON u.USER_UUID = COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID)
 WHERE res.RES_STAT = 'DONE'
   AND LOWER(BIN_TO_UUID(res.DRIVER_UUID)) = ?
   AND LOWER(BIN_TO_UUID(res.RES_UUID)) = ?
   AND r.END_DT IS NOT NULL`;

const SQL_DETAIL_REQ_LEGACY = `SELECT
    BIN_TO_UUID(res.RES_UUID)              AS resId,
    BIN_TO_UUID(r.REQ_UUID)                AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_DT                             AS startDt,
    r.END_DT                               AS endDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(r.REQ_AMT, 0)                 AS travelerRequestAmt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    u.USER_NM                              AS travelerUserNmEnc
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
 LEFT JOIN TB_USER u
   ON u.USER_UUID = COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID)
 WHERE res.RES_STAT = 'DONE'
   AND LOWER(BIN_TO_UUID(res.DRIVER_UUID)) = ?
   AND LOWER(BIN_TO_UUID(r.REQ_UUID)) = ?
   AND r.END_DT IS NOT NULL
 ORDER BY res.MOD_DT DESC
 LIMIT 1`;

module.exports = function registerBusOperationCompletionDetails(pool, app) {
    app.get('/api/bus-operation-completion-details', async (req, res) => {
        const driverParam = req.query.driverId ?? req.query.driverUuid;
        const resParam = req.query.resId ?? req.query.resUuid;
        const reqParam = req.query.reqId ?? req.query.reqUuid;

        const resUuid = normalizeUuidParam(resParam);
        const reqUuidOpt = normalizeUuidParam(reqParam);
        const driverUuidRaw = String(driverParam || '').trim();
        const driverUuidNorm = normalizeUuidParam(driverParam);
        if (!driverUuidRaw || (!resUuid && !reqUuidOpt)) {
            return res.status(400).json({
                error: 'driverId(또는 driverUuid)와 resId/resUuid(또는 reqId/reqUuid)가 필요합니다.',
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();

            async function loadDetailRows() {
                const runLegacy = async () => {
                    if (resUuid) {
                        const [r1] = await connection.execute(SQL_DETAIL_RES_LEGACY, [driverUuidNorm, resUuid]);
                        if (r1.length) return r1;
                    }
                    if (reqUuidOpt) {
                        const [r2] = await connection.execute(SQL_DETAIL_REQ_LEGACY, [driverUuidNorm, reqUuidOpt]);
                        if (r2.length) return r2;
                    }
                    return [];
                };
                try {
                    const leg = await runLegacy();
                    if (leg.length) return { rows: leg, usedArch: false };
                } catch (e) {
                    if (!isSchemaMismatchError(e)) throw e;
                    const ar = await tryArchDetailQueries(connection, driverUuidRaw, resUuid, reqUuidOpt);
                    return { rows: ar, usedArch: true };
                }
                return { rows: [], usedArch: false };
            }

            const { rows, usedArch } = await loadDetailRows();

            if (!rows.length) {
                return res.status(404).json({ error: '운행 완료 상세를 찾을 수 없습니다.' });
            }

            const row = rows[0];
            let reqUuidStr =
                rowCol(row, 'reqId') ?? row.req_id ?? rowCol(row, 'reqUuid') ?? row.req_uuid;
            if (reqUuidStr) reqUuidStr = String(reqUuidStr).trim().toLowerCase();

            let viaRows;
            if (!usedArch) {
                const [v] = await connection.execute(
                    `SELECT VIA_ADDR AS viaAddr, VIA_ORD AS viaOrd, VIA_TYPE AS viaType
                     FROM TB_AUCTION_REQ_VIA
                     WHERE REQ_UUID = UUID_TO_BIN(?)
                     ORDER BY VIA_ORD ASC
                     LIMIT 9`,
                    [reqUuidStr]
                );
                viaRows = v;
            } else {
                try {
                    const [v] = await connection.execute(
                        `SELECT VIA_ADDR AS viaAddr, VIA_ORD AS viaOrd, VIA_TYPE AS viaType
                         FROM TB_AUCTION_REQ_VIA
                         WHERE REQ_ID = ?
                         ORDER BY VIA_ORD ASC
                         LIMIT 9`,
                        [reqUuidStr]
                    );
                    viaRows = v;
                } catch (e) {
                    if (!isSchemaMismatchError(e)) throw e;
                    if (looksLikeUuidString(reqUuidStr)) {
                        const [v2] = await connection.execute(
                            `SELECT VIA_ADDR AS viaAddr, VIA_ORD AS viaOrd, VIA_TYPE AS viaType
                             FROM TB_AUCTION_REQ_VIA
                             WHERE REQ_UUID = UUID_TO_BIN(?)
                             ORDER BY VIA_ORD ASC
                             LIMIT 9`,
                            [reqUuidStr]
                        );
                        viaRows = v2;
                    } else {
                        viaRows = [];
                    }
                }
            }

            let busRows;
            if (!usedArch) {
                const [b] = await connection.execute(
                    `SELECT BIN_TO_UUID(REQ_BUS_UUID) AS reqBusUuid,
                            BUS_TYPE_CD AS busTypeCd,
                            REQ_BUS_CNT AS reqBusCnt,
                            COALESCE(REQ_AMT, 0) AS reqAmt
                     FROM TB_AUCTION_REQ_BUS
                     WHERE REQ_UUID = UUID_TO_BIN(?)
                     ORDER BY REG_DT ASC, REQ_BUS_UUID ASC`,
                    [reqUuidStr]
                );
                busRows = b;
            } else {
                try {
                    const [b] = await connection.execute(
                        `SELECT REQ_BUS_ID AS reqBusId,
                                BUS_TYPE_CD AS busTypeCd,
                                COALESCE(REQ_BUS_CNT, 1) AS reqBusCnt,
                                COALESCE(REQ_AMT, COALESCE(TOLLS_AMT, 0) + COALESCE(FUEL_COST, 0), 0) AS reqAmt
                         FROM TB_AUCTION_REQ_BUS
                         WHERE REQ_ID = ?
                         ORDER BY REG_DT ASC, REQ_BUS_ID ASC`,
                        [reqUuidStr]
                    );
                    busRows = b;
                } catch (e) {
                    if (!isSchemaMismatchError(e)) throw e;
                    const [b2] = await connection.execute(
                        `SELECT REQ_BUS_ID AS reqBusId,
                                BUS_TYPE_CD AS busTypeCd,
                                1 AS reqBusCnt,
                                COALESCE(TOLLS_AMT, 0) + COALESCE(FUEL_COST, 0) AS reqAmt
                         FROM TB_AUCTION_REQ_BUS
                         WHERE REQ_ID = ?
                         ORDER BY REG_DT ASC, REQ_BUS_ID ASC`,
                        [reqUuidStr]
                    );
                    busRows = b2;
                }
            }

            const passengerCnt = Number(row.passengerCnt ?? row.passenger_cnt) || 0;
            const travelerRequestAmt =
                Number(row.travelerRequestAmt ?? row.traveler_request_amt ?? row.REQ_AMT ?? row.req_amt) || 0;
            const driverBiddingPrice = Number(row.driverBiddingPrice ?? row.driver_bidding_price) || 0;

            const timeline = buildViaTimeline(viaRows);
            const auctionReqBuses = mapAuctionReqBusRows(busRows);

            const travelerName =
                safeDecryptUserNm(row.travelerUserNmEnc ?? row.traveler_user_nm_enc) || '';

            const resIdVal = rowCol(row, 'resId') ?? row.res_id ?? rowCol(row, 'resUuid') ?? row.res_uuid;

            res.status(200).json({
                travelerName: travelerName || null,
                tripTitle: row.tripTitle ?? row.trip_title ?? null,
                startDt: row.startDt ?? row.start_dt ?? null,
                endDt: row.endDt ?? row.end_dt ?? null,
                passengerCnt,
                travelerRequestKrw: travelerRequestAmt,
                driverBidKrw: driverBiddingPrice,
                auctionReqBuses,
                timeline,
                resId: resIdVal,
                reqId: reqUuidStr,
                resUuid: resIdVal,
                reqUuid: reqUuidStr,
            });
        } catch (error) {
            console.error('bus-operation-completion-details:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });
};
