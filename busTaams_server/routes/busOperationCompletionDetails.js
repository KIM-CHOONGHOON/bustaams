/**
 * BusOperationCompletionDetails REST API
 * GET /api/bus-operation-completion-details
 *   ?driverId|userId|driverUuid=&resId|reqId=
 *
 * 정본: BusTaams_Project — TB_AUCTION_REQ_VIA(VIA_SEQ), TB_AUCTION_REQ_BUS(REQ_BUS_SEQ),
 * TB_USER.CUST_ID ↔ TRAVELER_ID.
 */
const { plainOrLegacyDecrypt } = require('../crypto');
const { resolveCustIdByUserKey } = require('../lib/resolveCustIdByUserKey');

function safeDecryptUserNm(val) {
    return plainOrLegacyDecrypt(val);
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
            viaOrd:
                Number(row.viaOrd ?? row.VIA_ORD ?? row.viaSeq ?? row.VIA_SEQ) ||
                idx + 1,
            viaType: vt || 'UNKNOWN',
            viaAddr: addr,
            lineText,
            nodeKind,
        };
    });
}

function normalizeIdParam(s) {
    if (s == null || s === '') return '';
    return String(s).trim().toLowerCase();
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
            busTypeCd: String(b.busTypeCd ?? b.bus_type_cd ?? '').trim() || null,
            reqBusCnt: Number(b.reqBusCnt ?? b.req_bus_cnt) || 1,
            reqAmtKrw: Number(b.reqAmt ?? b.req_amt ?? b.reqAmtKrw) || 0,
            sortOrder: idx + 1,
        };
    });
}

const SQL_DETAIL_BY_RES_PROJECT = `SELECT
    res.RES_ID                             AS resId,
    res.DATA_STAT                          AS dataStat,
    r.REQ_ID                               AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_DT                             AS startDt,
    r.END_DT                               AS endDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(r.REQ_AMT, 0)                 AS travelerRequestAmt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    u.USER_NM                              AS travelerUserNmEnc
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 LEFT JOIN TB_USER u ON u.CUST_ID = COALESCE(NULLIF(TRIM(res.TRAVELER_ID), ''), r.TRAVELER_ID)
 WHERE res.DATA_STAT = 'DONE'
   AND res.DRIVER_ID = ?
   AND LOWER(TRIM(res.RES_ID)) = ?
   AND r.END_DT IS NOT NULL`;

const SQL_DETAIL_BY_REQ_PROJECT = `SELECT
    res.RES_ID                             AS resId,
    res.DATA_STAT                          AS dataStat,
    r.REQ_ID                               AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_DT                             AS startDt,
    r.END_DT                               AS endDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(r.REQ_AMT, 0)                 AS travelerRequestAmt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    u.USER_NM                              AS travelerUserNmEnc
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 LEFT JOIN TB_USER u ON u.CUST_ID = COALESCE(NULLIF(TRIM(res.TRAVELER_ID), ''), r.TRAVELER_ID)
 WHERE res.DATA_STAT = 'DONE'
   AND res.DRIVER_ID = ?
   AND LOWER(TRIM(r.REQ_ID)) = ?
   AND r.END_DT IS NOT NULL
 ORDER BY res.MOD_DT DESC
 LIMIT 1`;

module.exports = function registerBusOperationCompletionDetails(pool, app) {
    app.get('/api/bus-operation-completion-details', async (req, res) => {
        const driverParam =
            req.query.driverId ?? req.query.userId ?? req.query.driverUuid;
        const resParam = req.query.resId;
        const reqParam = req.query.reqId;

        const resIdNorm = normalizeIdParam(resParam);
        const reqIdOpt = normalizeIdParam(reqParam);
        const driverUuidRaw = String(driverParam || '').trim();
        if (!driverUuidRaw || (!resIdNorm && !reqIdOpt)) {
            return res.status(400).json({
                error: 'driverId(또는 userId·driverUuid)와 resId 또는 reqId가 필요합니다.',
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            let driverForArch = driverUuidRaw;
            try {
                const cid = await resolveCustIdByUserKey(connection, driverUuidRaw);
                if (cid) driverForArch = cid;
            } catch (_) {
                /* ignore */
            }

            let rows = [];
            if (resIdNorm) {
                const [r1] = await connection.execute(SQL_DETAIL_BY_RES_PROJECT, [
                    driverForArch,
                    resIdNorm,
                ]);
                if (r1.length) rows = r1;
            }
            if (!rows.length && reqIdOpt) {
                const [r2] = await connection.execute(SQL_DETAIL_BY_REQ_PROJECT, [
                    driverForArch,
                    reqIdOpt,
                ]);
                if (r2.length) rows = r2;
            }

            if (!rows.length) {
                return res.status(404).json({ error: '운행 완료 상세를 찾을 수 없습니다.' });
            }

            const row = rows[0];
            let reqIdStr = rowCol(row, 'reqId') ?? row.req_id;
            if (reqIdStr) reqIdStr = String(reqIdStr).trim().toLowerCase();

            const [viaRows] = await connection.execute(
                `SELECT VIA_ADDR AS viaAddr, VIA_SEQ AS viaOrd, VIA_TYPE AS viaType
                 FROM TB_AUCTION_REQ_VIA
                 WHERE REQ_ID = ?
                 ORDER BY VIA_SEQ ASC
                 LIMIT 9`,
                [reqIdStr]
            );

            const [busRows] = await connection.execute(
                `SELECT CONCAT(REQ_ID, '-', REQ_BUS_SEQ) AS reqBusId,
                        BUS_TYPE_CD AS busTypeCd,
                        COALESCE(RES_BUS_AMT, COALESCE(TOLLS_AMT, 0) + COALESCE(FUEL_COST, 0), 0) AS reqAmt
                 FROM TB_AUCTION_REQ_BUS
                 WHERE REQ_ID = ?
                 ORDER BY REG_DT ASC, REQ_BUS_SEQ ASC`,
                [reqIdStr]
            );

            const passengerCnt = Number(row.passengerCnt ?? row.passenger_cnt) || 0;
            const travelerRequestAmt =
                Number(row.travelerRequestAmt ?? row.traveler_request_amt ?? row.REQ_AMT ?? row.req_amt) ||
                0;
            const driverBiddingPrice = Number(row.driverBiddingPrice ?? row.driver_bidding_price) || 0;

            const timeline = buildViaTimeline(viaRows);
            const auctionReqBuses = mapAuctionReqBusRows(busRows);

            const travelerName =
                safeDecryptUserNm(row.travelerUserNmEnc ?? row.traveler_user_nm_enc) || '';

            const resIdVal = rowCol(row, 'resId') ?? row.res_id;

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
                reqId: reqIdStr,
                dataStat: row.dataStat ?? row.DATA_STAT ?? row.data_stat ?? 'DONE',
            });
        } catch (error) {
            console.error('bus-operation-completion-details:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });
};
