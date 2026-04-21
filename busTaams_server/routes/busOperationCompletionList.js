/**
 * 버스 운행 완료 목록
 * GET /api/bus-operation-completion-list
 *   ?driverId=&from=&to=  (권장) | driverUuid (레거시)
 *
 * DB: (레거시) RES_UUID/REQ_UUID/DRIVER_UUID/RES_STAT + BIN_TO_UUID
 *     (ARCHITECTURE) RES_ID/REQ_ID/DRIVER_ID/DATA_STAT + 세션 UUID → TB_USER.USER_SEQ_ID|USER_ID
 */
const RANGE_ERROR_MSG = '조회 범위는 1년 이내만 가능합니다.';

function daysBetweenYmdUtc(fromStr, toStr) {
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);
    const t0 = Date.UTC(fy, fm - 1, fd);
    const t1 = Date.UTC(ty, tm - 1, td);
    return Math.round((t1 - t0) / 86400000);
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

function mapBusRow(b, idx) {
    const busPk = b.reqBusId ?? b.req_bus_id ?? b.reqBusUuid ?? b.req_bus_uuid ?? null;
    return {
        reqBusId: busPk,
        reqBusUuid: busPk,
        busTypeCd: String(b.busTypeCd ?? b.bus_type_cd ?? '').trim() || null,
        reqBusCnt: Number(b.reqBusCnt ?? b.req_bus_cnt) || 0,
        reqAmtKrw: Number(b.reqAmt ?? b.req_amt) || 0,
        sortOrder: idx + 1,
    };
}

const SQL_LIST_LEGACY = `
SELECT
    BIN_TO_UUID(res.RES_UUID)              AS resUuid,
    BIN_TO_UUID(r.REQ_UUID)                AS reqUuid,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_ADDR                           AS startAddr,
    r.END_ADDR                             AS endAddr,
    r.END_DT                               AS endDt,
    DATE_FORMAT(r.END_DT, '%Y-%m-%d')      AS endDtDate,
    r.START_DT                             AS startDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    res.RES_STAT                           AS resStat,
    res.MOD_DT                             AS completedAt
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
 WHERE res.RES_STAT = 'DONE'
   AND LOWER(BIN_TO_UUID(res.DRIVER_UUID)) = ?
   AND r.END_DT IS NOT NULL
   AND DATE(r.END_DT) >= ?
   AND DATE(r.END_DT) <= ?
 ORDER BY r.END_DT DESC`;

/** ARCH: TB_BUS_RESERVATION.DRIVER_ID = TB_USER.USER_ID(또는 DDL상 기사 키) 직접 비교 — 로그인 `driverId` */
const SQL_LIST_ARCH_DIRECT = `
SELECT
    res.RES_ID                             AS resId,
    r.REQ_ID                               AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_ADDR                           AS startAddr,
    r.END_ADDR                             AS endAddr,
    r.END_DT                               AS endDt,
    DATE_FORMAT(r.END_DT, '%Y-%m-%d')      AS endDtDate,
    r.START_DT                             AS startDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    res.DATA_STAT                          AS resStat,
    res.MOD_DT                             AS completedAt
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 WHERE res.DATA_STAT = 'DONE'
   AND res.DRIVER_ID = ?
   AND r.END_DT IS NOT NULL
   AND DATE(r.END_DT) >= ?
   AND DATE(r.END_DT) <= ?
 ORDER BY r.END_DT DESC`;

/** ARCH: 세션 UUID → TB_USER → DRIVER_ID (상세 API `archDetailSelectFragments` 와 동일 패턴) */
const SQL_LIST_ARCH_UUID = `
SELECT
    res.RES_ID                             AS resId,
    r.REQ_ID                               AS reqId,
    r.TRIP_TITLE                           AS tripTitle,
    r.START_ADDR                           AS startAddr,
    r.END_ADDR                             AS endAddr,
    r.END_DT                               AS endDt,
    DATE_FORMAT(r.END_DT, '%Y-%m-%d')      AS endDtDate,
    r.START_DT                             AS startDt,
    r.PASSENGER_CNT                        AS passengerCnt,
    COALESCE(res.DRIVER_BIDDING_PRICE, 0) AS driverBiddingPrice,
    res.DATA_STAT                          AS resStat,
    res.MOD_DT                             AS completedAt
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 WHERE res.DATA_STAT = 'DONE'
   AND res.DRIVER_ID = (
        SELECT COALESCE(NULLIF(TRIM(USER_SEQ_ID), ''), USER_ID)
          FROM TB_USER WHERE USER_UUID = UUID_TO_BIN(?) LIMIT 1)
   AND r.END_DT IS NOT NULL
   AND DATE(r.END_DT) >= ?
   AND DATE(r.END_DT) <= ?
 ORDER BY r.END_DT DESC`;

async function tryArchListRows(connection, driverIdQ, driverUuidQ, from, to) {
    const seen = new Set();
    const runDirect = async (val) => {
        const key = `D:${val}`;
        if (seen.has(key)) return [];
        seen.add(key);
        const [r] = await connection.execute(SQL_LIST_ARCH_DIRECT, [val, from, to]);
        return r;
    };
    const runUuid = async (val) => {
        const u = String(val).trim().toLowerCase();
        const key = `U:${u}`;
        if (seen.has(key)) return [];
        seen.add(key);
        const [r] = await connection.execute(SQL_LIST_ARCH_UUID, [u, from, to]);
        return r;
    };

    const attempts = [];
    if (driverIdQ && !looksLikeUuidString(driverIdQ)) attempts.push(() => runDirect(driverIdQ));
    if (driverUuidQ && looksLikeUuidString(driverUuidQ)) attempts.push(() => runUuid(driverUuidQ));
    if (driverIdQ && looksLikeUuidString(driverIdQ)) attempts.push(() => runUuid(driverIdQ));
    if (driverUuidQ && !looksLikeUuidString(driverUuidQ)) attempts.push(() => runDirect(driverUuidQ));

    for (const fn of attempts) {
        const rows = await fn();
        if (rows.length) return rows;
    }
    return [];
}

const SQL_BUSES_LEGACY = (ph) => `
SELECT BIN_TO_UUID(REQ_UUID) AS reqUuid,
       BIN_TO_UUID(REQ_BUS_UUID) AS reqBusUuid,
       BUS_TYPE_CD AS busTypeCd,
       REQ_BUS_CNT AS reqBusCnt,
       COALESCE(REQ_AMT, 0) AS reqAmt
 FROM TB_AUCTION_REQ_BUS
 WHERE REQ_UUID IN (${ph})
 ORDER BY REQ_UUID, REG_DT ASC, REQ_BUS_UUID ASC`;

/** ARCHITECTURE TB_AUCTION_REQ_BUS: REQ_BUS_ID, REQ_ID — REQ_BUS_CNT/REQ_AMT 없을 수 있음 */
const SQL_BUSES_ARCH_WIDE = (ph) => `
SELECT REQ_ID AS reqId,
       REQ_BUS_ID AS reqBusId,
       BUS_TYPE_CD AS busTypeCd,
       COALESCE(REQ_BUS_CNT, 1) AS reqBusCnt,
       COALESCE(REQ_AMT, COALESCE(TOLLS_AMT, 0) + COALESCE(FUEL_COST, 0), 0) AS reqAmt
 FROM TB_AUCTION_REQ_BUS
 WHERE REQ_ID IN (${ph})
 ORDER BY REQ_ID, REG_DT ASC, REQ_BUS_ID ASC`;

const SQL_BUSES_ARCH_NARROW = (ph) => `
SELECT REQ_ID AS reqId,
       REQ_BUS_ID AS reqBusId,
       BUS_TYPE_CD AS busTypeCd,
       1 AS reqBusCnt,
       COALESCE(TOLLS_AMT, 0) + COALESCE(FUEL_COST, 0) AS reqAmt
 FROM TB_AUCTION_REQ_BUS
 WHERE REQ_ID IN (${ph})
 ORDER BY REQ_ID, REG_DT ASC, REQ_BUS_ID ASC`;

module.exports = function registerBusOperationCompletionList(pool, app) {
    app.get('/api/bus-operation-completion-list', async (req, res) => {
        const driverIdQ =
            req.query.driverId != null && String(req.query.driverId).trim() !== ''
                ? String(req.query.driverId).trim()
                : '';
        const driverUuidQ =
            req.query.driverUuid != null && String(req.query.driverUuid).trim() !== ''
                ? String(req.query.driverUuid).trim()
                : '';
        const driverParam = driverIdQ || driverUuidQ;
        const { from, to } = req.query;
        if (!driverParam || !from || !to) {
            return res.status(400).json({
                error: 'driverId·driverUuid 중 하나 이상, from, to가 필요합니다. (YYYY-MM-DD)',
            });
        }
        const ymd = /^\d{4}-\d{2}-\d{2}$/;
        if (!ymd.test(from) || !ymd.test(to)) {
            return res.status(400).json({ error: 'from, to는 YYYY-MM-DD 형식이어야 합니다.' });
        }

        const spanDays = daysBetweenYmdUtc(from, to);
        if (spanDays < 0) {
            return res.status(400).json({ error: '종료일(To)은 시작일(From) 이후여야 합니다.' });
        }
        if (spanDays > 365) {
            return res.status(400).json({ error: RANGE_ERROR_MSG });
        }

        const driverUuidNorm = String(driverParam).trim().toLowerCase();

        let connection;
        try {
            connection = await pool.getConnection();
            let rows;
            let usedArch = false;
            try {
                [rows] = await connection.execute(SQL_LIST_LEGACY, [driverUuidNorm, from, to]);
            } catch (e) {
                if (!isSchemaMismatchError(e)) throw e;
                usedArch = true;
                rows = await tryArchListRows(connection, driverIdQ, driverUuidQ, from, to);
            }

            const reqUuidSet = new Set();
            for (const row of rows) {
                const ru = rowCol(row, 'reqId') ?? rowCol(row, 'reqUuid');
                if (ru) reqUuidSet.add(String(ru).trim().toLowerCase());
            }
            const reqUuidList = [...reqUuidSet];

            /** @type {Map<string, Array<{reqBusUuid:string|null,busTypeCd:string|null,reqBusCnt:number,reqAmtKrw:number,sortOrder:number}>>} */
            const busesByReq = new Map();
            if (reqUuidList.length && connection) {
                let busRows;
                if (!usedArch) {
                    const ph = reqUuidList.map(() => 'UUID_TO_BIN(?)').join(', ');
                    [busRows] = await connection.execute(SQL_BUSES_LEGACY(ph), reqUuidList);
                } else {
                    const ph = reqUuidList.map(() => '?').join(', ');
                    try {
                        [busRows] = await connection.execute(SQL_BUSES_ARCH_WIDE(ph), reqUuidList);
                    } catch (e2) {
                        if (!isSchemaMismatchError(e2)) throw e2;
                        [busRows] = await connection.execute(SQL_BUSES_ARCH_NARROW(ph), reqUuidList);
                    }
                }
                for (const b of busRows) {
                    const k = String(b.reqId ?? b.req_id ?? b.reqUuid ?? b.req_uuid ?? '').trim().toLowerCase();
                    if (!k) continue;
                    if (!busesByReq.has(k)) busesByReq.set(k, []);
                    const arr = busesByReq.get(k);
                    arr.push(mapBusRow(b, arr.length));
                }
            }

            const items = rows.map((row) => {
                const reqUuid = rowCol(row, 'reqId') ?? rowCol(row, 'reqUuid');
                const resVal = rowCol(row, 'resId') ?? rowCol(row, 'resUuid');
                const reqKey = reqUuid ? String(reqUuid).trim().toLowerCase() : '';
                return {
                    resId: resVal,
                    reqId: reqUuid,
                    resUuid: resVal,
                    reqUuid,
                    tripTitle: row.tripTitle ?? row.trip_title,
                    startAddr: row.startAddr ?? row.start_addr,
                    endAddr: row.endAddr ?? row.end_addr,
                    endDt: row.endDt ?? row.end_dt,
                    endDtDate: row.endDtDate ?? row.end_dt_date,
                    startDt: row.startDt ?? row.start_dt,
                    passengerCnt: Number(row.passengerCnt ?? row.passenger_cnt) || 0,
                    driverBiddingPrice: Number(row.driverBiddingPrice ?? row.driver_bidding_price) || 0,
                    resStat: row.resStat ?? row.res_stat,
                    completedAt: row.completedAt ?? row.completed_at ?? row.mod_dt,
                    auctionReqBuses: reqKey ? busesByReq.get(reqKey) || [] : [],
                };
            });

            res.status(200).json({ total: items.length, items });
        } catch (error) {
            console.error('bus-operation-completion-list:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });
};
