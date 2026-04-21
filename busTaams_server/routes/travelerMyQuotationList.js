/**
 * 여행자 본인 견적 마스터 목록 (TB_AUCTION_REQ)
 * GET /api/traveler/my-quotation-requests?travelerUuid= | travelerId=
 *
 * 조건: DATA_STAT IN ('AUCTION','BIDDING'), TRAVELER_UUID / TRAVELER_ID = 로그인 여행자
 * 레거시: REQ_UUID · VIA_UUID 등 / ARCHITECTURE: REQ_ID · VIA_ID 등
 */
function isSchemaMismatchError(e) {
    return e && (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR');
}

function looksLikeUuidString(s) {
    if (!s || typeof s !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

async function resolveTravelerUserId(connection, travelerParam) {
    const d = String(travelerParam ?? '').trim();
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

const SQL_LEGACY_WITH_META = `
SELECT
    BIN_TO_UUID(r.REQ_UUID)          AS reqId,
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
    COALESCE(ANY_VALUE(b.REQ_BUS_CNT), 1) AS busCnt,
    COUNT(DISTINCT v.VIA_UUID)       AS waypointCount,
    ANY_VALUE(r.REQ_COMMENT)         AS comment,
    ANY_VALUE(r.ROUND_TRIP_YN)       AS roundTripYn
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_UUID = r.REQ_UUID
 LEFT JOIN TB_AUCTION_REQ_VIA v ON v.REQ_UUID = r.REQ_UUID
 WHERE r.TRAVELER_UUID = UUID_TO_BIN(?)
   AND r.DATA_STAT IN ('AUCTION','BIDDING')
 GROUP BY r.REQ_UUID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

const SQL_LEGACY_MIN = `
SELECT
    BIN_TO_UUID(r.REQ_UUID)          AS reqId,
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
    COALESCE(ANY_VALUE(b.REQ_BUS_CNT), 1) AS busCnt,
    COUNT(DISTINCT v.VIA_UUID)       AS waypointCount
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_UUID = r.REQ_UUID
 LEFT JOIN TB_AUCTION_REQ_VIA v ON v.REQ_UUID = r.REQ_UUID
 WHERE r.TRAVELER_UUID = UUID_TO_BIN(?)
   AND r.DATA_STAT IN ('AUCTION','BIDDING')
 GROUP BY r.REQ_UUID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

const SQL_ARCH_WITH_META = `
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
    COUNT(DISTINCT v.VIA_ID)         AS waypointCount,
    ANY_VALUE(r.REQ_COMMENT)         AS comment,
    ANY_VALUE(r.ROUND_TRIP_YN)       AS roundTripYn
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_ID = r.REQ_ID
 LEFT JOIN TB_AUCTION_REQ_VIA v ON v.REQ_ID = r.REQ_ID
 WHERE r.TRAVELER_ID = ?
   AND r.DATA_STAT IN ('AUCTION','BIDDING')
 GROUP BY r.REQ_ID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

const SQL_ARCH_MIN = `
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
 FROM TB_AUCTION_REQ r
 LEFT JOIN TB_AUCTION_REQ_BUS b ON b.REQ_ID = r.REQ_ID
 LEFT JOIN TB_AUCTION_REQ_VIA v ON v.REQ_ID = r.REQ_ID
 WHERE r.TRAVELER_ID = ?
   AND r.DATA_STAT IN ('AUCTION','BIDDING')
 GROUP BY r.REQ_ID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR,
          r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT,
          r.REQ_AMT, r.EXPIRE_DT, r.REG_DT
 ORDER BY r.REG_DT DESC`;

module.exports = function registerTravelerMyQuotationList(pool, app) {
    app.get('/api/traveler/my-quotation-requests', async (req, res) => {
        const tidQ = req.query.travelerId != null && String(req.query.travelerId).trim() !== '';
        const tUuidQ = req.query.travelerUuid != null && String(req.query.travelerUuid).trim() !== '';
        if (!tidQ && !tUuidQ) {
            return res.status(400).json({ error: 'travelerUuid 또는 travelerId가 필요합니다.' });
        }
        const tu = tidQ ? String(req.query.travelerId).trim() : String(req.query.travelerUuid).trim();

        let connection;
        try {
            connection = await pool.getConnection();
            let rows;

            if (tidQ) {
                try {
                    [rows] = await connection.execute(SQL_ARCH_WITH_META, [tu]);
                } catch (e) {
                    if (!isSchemaMismatchError(e)) throw e;
                    try {
                        [rows] = await connection.execute(SQL_ARCH_MIN, [tu]);
                        rows = rows.map((row) => ({ ...row, comment: null, roundTripYn: 'N' }));
                    } catch (e2) {
                        throw e2;
                    }
                }
            } else {
                const sessionParam = looksLikeUuidString(tu) ? tu.toLowerCase() : tu;
                try {
                    [rows] = await connection.execute(SQL_LEGACY_WITH_META, [sessionParam]);
                } catch (e) {
                    if (!isSchemaMismatchError(e)) throw e;
                    try {
                        [rows] = await connection.execute(SQL_LEGACY_MIN, [sessionParam]);
                        rows = rows.map((row) => ({ ...row, comment: null, roundTripYn: 'N' }));
                    } catch (e2) {
                        if (!isSchemaMismatchError(e2)) throw e2;
                        const tid = (await resolveTravelerUserId(connection, sessionParam)) || sessionParam;
                        try {
                            [rows] = await connection.execute(SQL_ARCH_WITH_META, [tid]);
                        } catch (e3) {
                            if (!isSchemaMismatchError(e3)) throw e3;
                            [rows] = await connection.execute(SQL_ARCH_MIN, [tid]);
                            rows = rows.map((row) => ({ ...row, comment: null, roundTripYn: 'N' }));
                        }
                    }
                }
            }

            rows = (rows || []).map((row) => ({
                ...row,
                roundTripYn: String(row.roundTripYn || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N',
            }));

            res.status(200).json({ total: rows.length, items: rows });
        } catch (error) {
            console.error('traveler/my-quotation-requests:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });
};
