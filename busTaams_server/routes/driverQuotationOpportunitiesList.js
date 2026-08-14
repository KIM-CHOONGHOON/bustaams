/**
 * 기사용 — 입찰 가능한 여행자 견적(역경매) 목록 (타인 요청)
 * GET /api/driver/quotation-opportunities?driverUuid=
 * GET /api/list-of-traveler-quotations?driverUuid=  (호환 별칭)
 *
 * TB_AUCTION_REQ.DATA_STAT IN ('AUCTION','CUSTOMER_PAY_WAIT'), DATE(START_DT) > CURDATE()
 * + 기사별 재응찰 제외 · 동일 출발일 CONFIRM 제외
 * 기사 식별: TB_BUS_RESERVATION.DRIVER_ID = TB_USER.CUST_ID.
 */

function archBlocks(driverId) {
    if (!driverId) return { sql: '', params: [] };
    const reBid = `
             AND NOT EXISTS (
                SELECT 1
                  FROM TB_BUS_RESERVATION res
                 WHERE res.REQ_ID = r.REQ_ID
                   AND res.DRIVER_ID = ?
                   AND res.DATA_STAT IN ('BUS_CHANGE', 'TRAVELER_CANCEL', 'DRIVER_CANCEL')
              )`;
    const sameDay = `
             AND NOT EXISTS (
                SELECT 1
                  FROM TB_BUS_RESERVATION res
                  INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_ID = res.REQ_ID
                 WHERE res.DRIVER_ID = ?
                   AND res.DATA_STAT = 'CONFIRM'
                   AND DATE(ar.START_DT) = DATE(r.START_DT)
                   AND ar.REQ_ID <> r.REQ_ID
              )`;
    return { sql: reBid + sameDay, params: [driverId, driverId] };
}

async function runArchList(connection, driverId, extraCols) {
    const { sql: blocks, params: blockParams } = archBlocks(driverId);
    const listSql = `
            SELECT
                r.REQ_ID                         AS reqId,
                r.TRIP_TITLE                     AS tripTitle,
                r.START_ADDR                     AS startAddr,
                r.END_ADDR                       AS endAddr,
                r.START_DT                       AS startDt,
                r.END_DT                         AS endDt,
                r.PASSENGER_CNT                  AS passengerCnt,
                r.DATA_STAT                       AS dataStat,
                COALESCE(r.REQ_AMT, 0)           AS reqAmt,
                r.EXPIRE_DT                      AS expireDt,
                r.REG_DT                         AS regDt,
                ANY_VALUE(b.BUS_TYPE_CD)         AS busType,
                GREATEST(COALESCE(COUNT(DISTINCT b.REQ_BUS_ID), 0), 1) AS busCnt,
                COUNT(DISTINCT v.VIA_ID)         AS waypointCount
                ${extraCols}
             FROM TB_AUCTION_REQ r
             LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_ID = r.REQ_ID
             LEFT JOIN TB_AUCTION_REQ_VIA v ON v.REQ_ID = r.REQ_ID
             WHERE r.DATA_STAT IN ('AUCTION','CUSTOMER_PAY_WAIT')
               AND DATE(r.START_DT) > CURDATE()
             ${blocks}
             GROUP BY r.REQ_ID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
                      r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
                      r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
             ORDER BY r.REG_DT DESC`;
    const [rows] = await connection.execute(listSql, blockParams);
    return rows;
}

async function fetchRowsByDriverId(connection, driverId) {
    const extraFull = `, ANY_VALUE(r.REQ_COMMENT) AS comment, ANY_VALUE(r.ROUND_TRIP_YN) AS roundTripYn`;
    return runArchList(connection, driverId, extraFull);
}

const DEMO_ITEMS = [
    {
        reqId: 'demo-uuid-0001-0000-000000000001',
        tripTitle: '제주도 관광 여행',
        busType: '대형 45인승',
        busCnt: 1,
        passengerCnt: 45,
        startDt: '2024-05-24T09:00:00',
        endDt: '2024-05-26T18:00:00',
        startAddr: '제주 국제공항',
        endAddr: '서귀포 중문 관광단지',
        reqAmt: 2380000,
        dataStat: 'CUSTOMER_PAY_WAIT',
        expireDt: '2024-05-23T23:59:00',
        regDt: '2024-05-20T10:00:00',
        waypointCount: 2,
        comment: '일정·짐칸 문의는 채팅으로 부탁드립니다.',
        roundTripYn: 'N',
    },
    {
        reqId: 'demo-uuid-0002-0000-000000000002',
        tripTitle: '서울-부산 왕복 전세버스',
        busType: '우등 28인승',
        busCnt: 1,
        passengerCnt: 28,
        startDt: '2024-06-01T07:00:00',
        endDt: '2024-06-01T21:00:00',
        startAddr: '서울 강남역',
        endAddr: '부산 해운대',
        reqAmt: 1200000,
        dataStat: 'CUSTOMER_PAY_WAIT',
        expireDt: '2024-05-31T23:59:00',
        regDt: '2024-05-28T09:00:00',
        waypointCount: 0,
        comment: '당일 왕복, 휴게소 1회 정차 희망',
        roundTripYn: 'Y',
    },
];

module.exports = function registerDriverQuotationOpportunitiesList(pool, app) {
    const handler = async (req, res) => {
        let connection;
        try {
            connection = await pool.getConnection();
            const duRaw =
                (req.query.driverId != null && String(req.query.driverId).trim()) ||
                (req.query.driverUuid != null && String(req.query.driverUuid).trim()) ||
                '';
            if (!duRaw) {
                return res.status(400).json({ error: 'driverUuid 또는 driverId가 필요합니다.' });
            }

            let rows = await fetchRowsByDriverId(connection, duRaw);
            rows = rows.map((row) => ({
                ...row,
                roundTripYn: String(row.roundTripYn || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N',
            }));

            if (rows.length === 0) {
                return res.status(200).json({
                    total: DEMO_ITEMS.length,
                    items: DEMO_ITEMS,
                });
            }

            res.status(200).json({ total: rows.length, items: rows });
        } catch (error) {
            console.error('driver-quotation-opportunities:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    };

    app.get('/api/driver/quotation-opportunities', handler);
    app.get('/api/list-of-traveler-quotations', handler);
};
