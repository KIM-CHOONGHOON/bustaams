/**
 * 실시간 입찰 기회 (DriverDashboard AuctionList)
 * GET /api/auction-list?driverId=&driverUuid=
 *   — 둘 중 하나 이상. ARCH DB + 로그인 ID만 있을 때는 driverId 권장.
 *
 * 레거시: REQ_UUID / RES_UUID / DRIVER_UUID / RES_STAT / REQ_BUS_CNT
 * ARCHITECTURE: REQ_ID / RES_ID / DRIVER_ID / DATA_STAT / TB_AUCTION_REQ_BUS.REQ_ID
 */
const SKIP_LEGACY = Symbol('auctionList.skipLegacy');
function isSchemaMismatchError(e) {
    return e && (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR');
}

function looksLikeUuidString(s) {
    if (!s || typeof s !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/** 세션 UUID → TB_BUS_RESERVATION.DRIVER_ID 에 쓰이는 USER_SEQ_ID 또는 USER_ID */
async function resolveDriverReservationId(connection, driverParam) {
    const d = String(driverParam ?? '').trim();
    if (!d) return null;
    if (!looksLikeUuidString(d)) return d;
    try {
        const [r] = await connection.execute(
            `SELECT COALESCE(NULLIF(TRIM(USER_SEQ_ID), ''), USER_ID) AS kid
             FROM TB_USER WHERE USER_UUID = UUID_TO_BIN(?) LIMIT 1`,
            [d]
        );
        return r[0]?.kid ?? null;
    } catch (e) {
        if (isSchemaMismatchError(e)) return null;
        throw e;
    }
}

/** 프론트·레거시 호환: 입찰 수정 버튼은 myBidStat === 'REQ' 기준 */
function mapMyBidStatForClient(v) {
    if (v == null) return v;
    const u = String(v).toUpperCase();
    if (u === 'BIDDING' || u === 'AUCTION') return 'REQ';
    return v;
}

const SQL_LIST_LEGACY = `
SELECT
    BIN_TO_UUID(r.REQ_UUID)          AS reqUuid,
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
    ANY_VALUE(b.BUS_TYPE_CD)        AS busType,
    COALESCE(SUM(b.REQ_BUS_CNT), 1) AS busCnt,
    (SELECT res.RES_STAT
       FROM TB_BUS_RESERVATION res
      WHERE res.REQ_UUID = r.REQ_UUID
        AND res.DRIVER_UUID = UUID_TO_BIN(?)
      ORDER BY COALESCE(res.MOD_DT, res.REG_DT) DESC, res.RES_UUID DESC
      LIMIT 1
    )                                AS myBidStat
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_UUID = r.REQ_UUID
 WHERE r.DATA_STAT IN ('AUCTION','BIDDING')
   AND DATE(r.START_DT) > CURDATE()
   AND NOT EXISTS (
        SELECT 1
          FROM TB_BUS_RESERVATION res2
          INNER JOIN TB_AUCTION_REQ ar ON ar.REQ_UUID = res2.REQ_UUID
         WHERE res2.DRIVER_UUID = UUID_TO_BIN(?)
           AND res2.RES_STAT = 'CONFIRM'
           AND DATE(ar.START_DT) = DATE(r.START_DT)
           AND ar.REQ_UUID <> r.REQ_UUID
       )
 GROUP BY r.REQ_UUID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

/** ARCH: 응답 reqUuid = REQ_ID 문자열, myBidStat = TB_BUS_RESERVATION.DATA_STAT */
const SQL_LIST_ARCH_MAIN = `
SELECT
    r.REQ_ID                         AS reqUuid,
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
 WHERE r.DATA_STAT IN ('AUCTION','BIDDING')
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

/** REQ_BUS_CNT 없음 · REQ_AMT 없음(마스터) — 버스 행 합산 금액 */
const SQL_LIST_ARCH_MIN = `
SELECT
    r.REQ_ID                         AS reqUuid,
    r.TRIP_TITLE                     AS tripTitle,
    r.START_ADDR                     AS startAddr,
    r.END_ADDR                       AS endAddr,
    r.START_DT                       AS startDt,
    r.END_DT                         AS endDt,
    r.PASSENGER_CNT                  AS passengerCnt,
    r.DATA_STAT                       AS reqStat,
    COALESCE((
        SELECT SUM(COALESCE(bb.TOLLS_AMT, 0) + COALESCE(bb.FUEL_COST, 0))
          FROM TB_AUCTION_REQ_BUS bb WHERE bb.REQ_ID = r.REQ_ID
    ), 0)                            AS reqAmt,
    NULL                             AS expireDt,
    r.REG_DT                         AS regDt,
    ANY_VALUE(b.BUS_TYPE_CD)         AS busType,
    GREATEST(COALESCE(COUNT(b.REQ_BUS_ID), 0), 1) AS busCnt,
    (SELECT res.DATA_STAT
       FROM TB_BUS_RESERVATION res
      WHERE res.REQ_ID = r.REQ_ID
        AND res.DRIVER_ID = ?
      ORDER BY COALESCE(res.MOD_DT, res.REG_DT) DESC, res.RES_ID DESC
      LIMIT 1
    )                                AS myBidStat
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_ID = r.REQ_ID
 WHERE r.DATA_STAT IN ('AUCTION','BIDDING')
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
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT
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

            /** 레거시 SQL은 UUID_TO_BIN(기사) 전제 — 비UUID 세션은 건너뛰고 ARCH만 시도 */
            let legacyUuidParam = '';
            if (driverUuidQ && looksLikeUuidString(driverUuidQ)) {
                legacyUuidParam = driverUuidQ.trim().toLowerCase();
            } else if (driverIdQ && looksLikeUuidString(driverIdQ)) {
                legacyUuidParam = driverIdQ.trim().toLowerCase();
            }

            const archResolveSource = driverUuidQ || driverIdQ || driverParam;

            try {
                if (legacyUuidParam) {
                    [rows] = await connection.execute(SQL_LIST_LEGACY, [legacyUuidParam, legacyUuidParam]);
                } else {
                    throw SKIP_LEGACY;
                }
            } catch (e) {
                if (e !== SKIP_LEGACY && !isSchemaMismatchError(e)) throw e;
                const driverId = (await resolveDriverReservationId(connection, archResolveSource)) || archResolveSource;
                try {
                    [rows] = await connection.execute(SQL_LIST_ARCH_MAIN, [driverId, driverId]);
                } catch (e2) {
                    if (!isSchemaMismatchError(e2)) throw e2;
                    [rows] = await connection.execute(SQL_LIST_ARCH_MIN, [driverId, driverId]);
                }
            }

            rows = (rows || []).map((row) => {
                const reqKey = row.reqUuid ?? row.req_uuid ?? null;
                return {
                    ...row,
                    reqUuid: reqKey,
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
