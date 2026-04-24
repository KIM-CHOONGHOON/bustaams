/**
 * 버스 운행 완료 목록
 * GET /api/bus-operation-completion-list
 *   ?driverId|userId|driverUuid=&from=&to=
 *
 * `BusTaams 테이블.md`: TB_BUS_RESERVATION.DRIVER_ID = TB_USER.CUST_ID(varchar(10)) —
 * 쿼리의 driverId/userId/userUuid 문자열을 CUST_ID로 해석해 매칭(해석 실패 시 원문으로 비교).
 */
const { resolveCustIdByUserKey } = require('../lib/resolveCustIdByUserKey');
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
    const busPk = b.reqBusId ?? b.req_bus_id ?? null;
    return {
        reqBusId: busPk,
        busTypeCd: String(b.busTypeCd ?? b.bus_type_cd ?? '').trim() || null,
        reqBusCnt: Number(b.reqBusCnt ?? b.req_bus_cnt) || 0,
        reqAmtKrw: Number(b.reqAmt ?? b.req_amt) || 0,
        sortOrder: idx + 1,
    };
}

/** TB_BUS_RESERVATION.DRIVER_ID = 로그인 기사 문자열 ID */
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
    res.DATA_STAT                          AS dataStat,
    res.MOD_DT                             AS completedAt
 FROM TB_BUS_RESERVATION res
 INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 WHERE res.DATA_STAT = 'DONE'
   AND res.DRIVER_ID = ?
   AND r.END_DT IS NOT NULL
   AND DATE(r.END_DT) >= ?
   AND DATE(r.END_DT) <= ?
 ORDER BY r.END_DT DESC`;

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
        const userIdQ =
            req.query.userId != null && String(req.query.userId).trim() !== ''
                ? String(req.query.userId).trim()
                : '';
        const driverUuidQ =
            req.query.driverUuid != null && String(req.query.driverUuid).trim() !== ''
                ? String(req.query.driverUuid).trim()
                : '';
        const driverParam = driverIdQ || userIdQ || driverUuidQ;
        const { from, to } = req.query;
        if (!driverParam || !from || !to) {
            return res.status(400).json({
                error: 'driverId(또는 userId·driverUuid), from, to가 필요합니다. (YYYY-MM-DD)',
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

        let connection;
        try {
            connection = await pool.getConnection();
            let driverForRes = driverParam;
            try {
                const cid = await resolveCustIdByUserKey(connection, driverParam);
                if (cid) driverForRes = cid;
            } catch (_) {
                /* ignore */
            }
            const [rows] = await connection.execute(SQL_LIST_ARCH_DIRECT, [driverForRes, from, to]);

            const reqIdSet = new Set();
            for (const row of rows) {
                const ru = rowCol(row, 'reqId');
                if (ru) reqIdSet.add(String(ru).trim().toLowerCase());
            }
            const reqIdList = [...reqIdSet];

            /** @type {Map<string, Array<{reqBusUuid:string|null,busTypeCd:string|null,reqBusCnt:number,reqAmtKrw:number,sortOrder:number}>>} */
            const busesByReq = new Map();
            if (reqIdList.length && connection) {
                let busRows;
                const ph = reqIdList.map(() => '?').join(', ');
                try {
                    [busRows] = await connection.execute(SQL_BUSES_ARCH_WIDE(ph), reqIdList);
                } catch (e2) {
                    if (!isSchemaMismatchError(e2)) throw e2;
                    [busRows] = await connection.execute(SQL_BUSES_ARCH_NARROW(ph), reqIdList);
                }
                for (const b of busRows) {
                    const k = String(b.reqId ?? b.req_id ?? '').trim().toLowerCase();
                    if (!k) continue;
                    if (!busesByReq.has(k)) busesByReq.set(k, []);
                    const arr = busesByReq.get(k);
                    arr.push(mapBusRow(b, arr.length));
                }
            }

            const items = rows.map((row) => {
                const reqIdVal = rowCol(row, 'reqId');
                const resVal = rowCol(row, 'resId');
                const reqKey = reqIdVal ? String(reqIdVal).trim().toLowerCase() : '';
                return {
                    resId: resVal,
                    reqId: reqIdVal,
                    tripTitle: row.tripTitle ?? row.trip_title,
                    startAddr: row.startAddr ?? row.start_addr,
                    endAddr: row.endAddr ?? row.end_addr,
                    endDt: row.endDt ?? row.end_dt,
                    endDtDate: row.endDtDate ?? row.end_dt_date,
                    startDt: row.startDt ?? row.start_dt,
                    passengerCnt: Number(row.passengerCnt ?? row.passenger_cnt) || 0,
                    driverBiddingPrice: Number(row.driverBiddingPrice ?? row.driver_bidding_price) || 0,
                    dataStat: row.dataStat ?? row.DATA_STAT ?? row.data_stat,
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
