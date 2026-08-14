/**
 * 기사님 응찰 목록 (화면·API ID: DriversListOfBids)
 * GET /api/DriversListOfBids?driverId=&page=&pageSize=
 *
 * 등록: `app.get('/api/DriversListOfBids', DriversListOfBids)` (Express Router 대신 직접 등록 — 404 방지)
 *
 * 조회: TB_BUS_RESERVATION.DATA_STAT. 기본: IN ('BIDDING','CONFIRM'), CONFIRM 이면서 TB_AUCTION_REQ.START_DT 가 당일이면 제외.
 *       `?mode=cancelled`: `DRIVER_CANCEL`(기사 청약 취소) 만. ORDER BY r.RES_ID DESC.
 */

const SCREEN_ID = 'DriversListOfBids';
const API_PATH = '/api/DriversListOfBids';

/** 본 목록에 나오는 DATA_STAT 만 매핑 */
function statusPresentation(dataStat) {
    const u = String(dataStat || '').toUpperCase();
    if (u === 'CUSTOMER_PAY_WAIT') {
        return { statusLabelKo: '고객 결제 대기', statusCategory: 'bidding' };
    }
    if (u === 'CONFIRM') {
        return { statusLabelKo: '예약확정', statusCategory: 'confirm' };
    }
    if (u === 'DRIVER_CANCEL') {
        return { statusLabelKo: '청약 취소', statusCategory: 'cancelled' };
    }
    return { statusLabelKo: u, statusCategory: 'other' };
}

/**
 * 핸들러 함수명: DriversListOfBids
 * @param {import('mysql2/promise').Pool} pool
 * @returns {import('express').RequestHandler}
 */
function createDriversListOfBidsHandler(pool) {
    return async function DriversListOfBids(req, res) {
        const driverId = req.query.driverId != null ? String(req.query.driverId).trim() : '';
        if (!driverId) {
            return res.status(400).json({
                error: 'driverId가 필요합니다.',
                DriversListOfBids: { screenId: SCREEN_ID },
            });
        }

        const mode = req.query.mode === 'cancelled' ? 'cancelled' : 'active';

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
        const offset = (page - 1) * pageSize;
        /** LIMIT/OFFSET 는 일부 MySQL/MariaDB + prepared statement 조합에서 실패할 수 있어, 범위 검증 후 리터럴로 넣는다. */
        const limitSql = Number(pageSize);
        const offsetSql = Number(offset);
        if (!Number.isInteger(limitSql) || !Number.isInteger(offsetSql) || limitSql < 1 || limitSql > 100 || offsetSql < 0) {
            return res.status(400).json({
                error: 'page/pageSize 가 올바르지 않습니다.',
                DriversListOfBids: { screenId: SCREEN_ID },
            });
        }

        const statCol = 'DATA_STAT';
        const baseWhere =
            mode === 'cancelled'
                ? `r.DRIVER_ID = ? AND r.${statCol} = 'DRIVER_CANCEL'`
                : `
            r.DRIVER_ID = ?
            AND r.${statCol} IN ('CUSTOMER_PAY_WAIT', 'CONFIRM')
            AND NOT (
                r.${statCol} = 'CONFIRM'
                AND ar.START_DT IS NOT NULL
                AND DATE(ar.START_DT) = CURDATE()
            )
        `;

        let connection;
        try {
            connection = await pool.getConnection();

            const [countRows] = await connection.execute(
                `SELECT COUNT(*) AS c
                   FROM TB_BUS_RESERVATION r
                   LEFT JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = r.REQ_ID
                  WHERE ${baseWhere}`,
                [driverId]
            );
            const listTotal = Number(countRows[0]?.c) || 0;

            const [queryRows] = await connection.execute(
                `SELECT r.RES_ID AS resId,
                        r.REQ_ID AS reqId,
                        r.REQ_BUS_SEQ AS reqBusSeq,
                        r.TRAVELER_ID AS travelerId,
                        r.DRIVER_ID AS driverId,
                        r.BUS_ID AS busId,
                        r.DRIVER_BIDDING_PRICE AS driverBiddingPrice,
                        r.${statCol} AS dataStat,
                        r.REG_DT AS regDt,
                        ar.REG_DT AS quoteRequestDt,
                        ar.TRIP_TITLE AS tripTitle,
                        ar.START_DT AS tripStartDt,
                        ar.END_DT AS tripEndDt
                   FROM TB_BUS_RESERVATION r
                   LEFT JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = r.REQ_ID
                  WHERE ${baseWhere}
                  ORDER BY r.RES_ID DESC
                  LIMIT ${limitSql} OFFSET ${offsetSql}`,
                [driverId]
            );
            const items = queryRows || [];

            const rows = items.map((r) => {
                const pres = statusPresentation(r.dataStat);
                return {
                    resId: r.resId,
                    reqId: r.reqId,
                    reqBusSeq: r.reqBusSeq != null ? Number(r.reqBusSeq) : 1,
                    travelerId: r.travelerId != null ? String(r.travelerId) : '',
                    driverId: r.driverId,
                    busId: r.busId != null ? String(r.busId) : '',
                    driverBiddingPrice: r.driverBiddingPrice != null ? Number(r.driverBiddingPrice) : 0,
                    dataStat: r.dataStat,
                    statusLabelKo: pres.statusLabelKo,
                    statusCategory: pres.statusCategory,
                    quoteRequestDt: r.quoteRequestDt,
                    regDt: r.regDt,
                    tripTitle: r.tripTitle != null ? String(r.tripTitle) : '',
                    tripStartDt: r.tripStartDt,
                    tripEndDt: r.tripEndDt,
                };
            });

            return res.json({
                DriversListOfBids: {
                    screenId: SCREEN_ID,
                    items: rows,
                    page,
                    pageSize,
                    total: listTotal,
                },
            });
        } catch (e) {
            console.error('DriversListOfBids:', e);
            return res.status(500).json({
                error: e.message,
                DriversListOfBids: { screenId: SCREEN_ID },
            });
        } finally {
            if (connection) connection.release();
        }
    };
}

/**
 * @param {import('express').Application} app
 * @param {import('mysql2/promise').Pool} pool
 */
function registerDriversListOfBids(app, pool) {
    const DriversListOfBids = createDriversListOfBidsHandler(pool);
    app.get(API_PATH, DriversListOfBids);
}

registerDriversListOfBids.SCREEN_ID = SCREEN_ID;
registerDriversListOfBids.API_PATH = API_PATH;
registerDriversListOfBids.createDriversListOfBidsHandler = createDriversListOfBidsHandler;
module.exports = registerDriversListOfBids;
