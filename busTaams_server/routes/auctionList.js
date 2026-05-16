/**
 * 실시간 입찰 기회 (DriverDashboard AuctionList)
 * GET /api/auction-list?driverId= | driverUuid=
 *
 * 스키마: TB_AUCTION_REQ, TB_AUCTION_REQ_BUS, TB_BUS_RESERVATION.
 * 기사 식별: TB_BUS_RESERVATION.DRIVER_ID = TB_USER.CUST_ID.
 */
/** 프론트·레거시 호환: 입찰 수정 버튼은 myBidStat === 'REQ' 기준 */
function mapMyBidStatForClient(v) {
    if (v == null) return v;
    const u = String(v).toUpperCase();
    if (u === 'BIDDING' || u === 'AUCTION') return 'REQ';
    return v;
}

/** ARCH: 응답 reqId = REQ_ID 문자열, myBidStat = TB_BUS_RESERVATION.DATA_STAT */
const SQL_LIST_ARCH_MAIN = `
SELECT
    r.REQ_ID                         AS reqId,
    r.TRIP_TITLE                     AS tripTitle,
    r.START_ADDR                     AS startAddr,
    r.END_ADDR                       AS endAddr,
    r.START_DT                       AS startDt,
    r.END_DT                         AS endDt,
    r.PASSENGER_CNT                  AS passengerCnt,
    r.DATA_STAT                       AS reqStat,
    COALESCE(r.REQ_AMT, 0)           AS reqAmt,
    r.EXPIRE_DT                      AS expireDt,
    r.REG_DT                         AS regDt,
    ANY_VALUE(b.BUS_TYPE_CD)         AS busType,
    COALESCE(SUM(COALESCE(b.REQ_BUS_CNT, 1)), 1) AS busCnt,
    (SELECT res.DATA_STAT
       FROM TB_BUS_RESERVATION res
      WHERE res.REQ_ID = r.REQ_ID
        AND res.DRIVER_ID = ?
      ORDER BY COALESCE(res.MOD_DT, res.REG_DT) DESC, res.RES_ID DESC
      LIMIT 1
    )                                AS myBidStat
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_ID = r.REQ_ID
 WHERE r.DATA_STAT IN ('AUCTION')
   AND DATE(r.START_DT) > CURDATE()
   AND NOT EXISTS (
        SELECT 1
          FROM TB_BUS_RESERVATION res2
          INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res2.REQ_ID
         WHERE res2.DRIVER_ID = ?
           AND res2.DATA_STAT = 'CONFIRM'
           AND DATE(ar.START_DT) = DATE(r.START_DT)
           AND ar.REQ_ID <> r.REQ_ID
       )
 GROUP BY r.REQ_ID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

module.exports = function registerAuctionList(pool, app) {
    app.get('/api/auction-list', async (req, res) => {
        const driverIdQ =
            req.query.driverId != null && String(req.query.driverId).trim() !== ''
                ? String(req.query.driverId).trim()
                : '';
        const driverUuidQ =
            req.query.driverUuid != null && String(req.query.driverUuid).trim() !== ''
                ? String(req.query.driverUuid).trim()
                : '';
        const driverParam = driverIdQ || driverUuidQ;
        if (!driverParam) {
            return res.status(400).json({
                error: 'driverId·driverUuid 중 하나 이상이 필요합니다.',
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            let rows;
            [rows] = await connection.execute(SQL_LIST_ARCH_MAIN, [driverParam, driverParam]);

            rows = (rows || []).map((row) => {
                const reqKey = row.reqId ?? row.req_id ?? null;
                return {
                    ...row,
                    reqId: reqKey,
                    myBidStat: mapMyBidStatForClient(row.myBidStat ?? row.my_bid_stat),
                };
            });

            const payload = {
                total: rows.length,
                items: rows,
            };
            if (rows.length === 0) {
                payload.emptyMessage = '등록된 입찰이 없습니다';
            }
            res.status(200).json(payload);
        } catch (error) {
            console.error('auction-list:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });
};
