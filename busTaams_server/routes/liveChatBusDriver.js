/**
 * LiveChatBusDriver REST API
 * Base path: /api/live-chat-bus-driver
 *
 * `BusTaams 테이블.md`: TB_BUS_RESERVATION(DRIVER_ID, TRAVELER_ID, DATA_STAT, RES_ID, REQ_ID),
 * TB_CHAT_LOG + TB_CHAT_LOG_PART + TB_CHAT_LOG_HIST
 */
const express = require('express');
const { plainOrLegacyDecrypt } = require('../crypto');
const { insertTripChatMessage } = require('../lib/insertTbChatLogMessage');
const { notifyTravelerNewDriverMessage } = require('../services/chatPush');
const { resolveCustIdByUserKey } = require('../lib/resolveCustIdByUserKey');

function safeDecryptUserNm(val) {
    return plainOrLegacyDecrypt(val);
}

function driverKeyFromQuery(q) {
    if (!q) return '';
    return String(q.driverId ?? q.userId ?? q.driverUuid ?? '').trim();
}

function driverKeyFromBody(b) {
    if (!b || typeof b !== 'object') return '';
    return String(b.driverId ?? b.userId ?? b.driverUuid ?? '').trim();
}

/** 최신 예약 1건 (동일 REQ+기사 다행 시 MOD_DT 기준) */
const SQL_RES_FOR_DRIVER = `
SELECT res.RES_ID AS resId,
       res.REQ_ID AS reqId,
       COALESCE(res.TRAVELER_ID, r.TRAVELER_ID) AS travelerId,
       res.DRIVER_ID AS driverId
  FROM TB_BUS_RESERVATION res
  INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 WHERE res.REQ_ID = ?
   AND res.RES_ID = ?
   AND res.DRIVER_ID = ?
   AND res.DATA_STAT IN ('CONFIRM','DONE')
 LIMIT 1`;

const SQL_MESSAGES = `
SELECT h.HIST_SEQ AS histSeq,
       h.MSG_KIND AS msgKind,
       h.MSG_BODY AS msgBody,
       h.SENDER_ROLE AS senderRole,
       h.REG_DT AS regDt
  FROM TB_CHAT_LOG_HIST h
 INNER JOIN TB_CHAT_LOG c ON c.CHAT_SEQ = h.CHAT_SEQ
 WHERE c.REQ_ID = ?
   AND c.RES_ID = ?
 ORDER BY h.REG_DT ASC, h.HIST_SEQ ASC`;

module.exports = function createLiveChatBusDriverRouter(pool) {
    const router = express.Router();

    async function resolveDriverCustId(connection, driverKey) {
        let cid = await resolveCustIdByUserKey(connection, driverKey);
        if (!cid) cid = driverKey;
        return String(cid).trim();
    }

    /**
     * 채팅 가능: TB_BUS_RESERVATION.DRIVER_ID = 기사 CUST_ID,
     * DATA_STAT IN ('CONFIRM','DONE')
     */
    async function fetchReservationForChat(connection, driverCustId, reqId, resId) {
        const [rows] = await connection.execute(SQL_RES_FOR_DRIVER, [reqId, resId, driverCustId]);
        return rows[0] || null;
    }

    /** GET /api/live-chat-bus-driver/chat-partners?driverId= */
    router.get('/chat-partners', async (req, res) => {
        const driverKey = driverKeyFromQuery(req.query);
        if (!driverKey) {
            return res.status(400).json({ error: 'driverId(또는 userId·driverUuid)가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const driverCustId = await resolveDriverCustId(connection, driverKey);

            const [rows] = await connection.execute(
                `SELECT
                        r.REQ_ID AS reqId,
                        res.RES_ID AS resId,
                        res.DATA_STAT AS dataStat,
                        COALESCE(res.TRAVELER_ID, r.TRAVELER_ID) AS travelerId,
                        r.TRIP_TITLE AS tripTitle,
                        r.START_ADDR AS startAddr,
                        r.END_ADDR AS endAddr,
                        r.START_DT AS startDt,
                        u.USER_NM AS travelerUserNmEnc
                   FROM TB_BUS_RESERVATION res
                   INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
                    AND res.DRIVER_ID = ?
                    AND res.DATA_STAT IN ('CONFIRM','DONE')
                    AND res.RES_ID = (
                        SELECT b.RES_ID FROM TB_BUS_RESERVATION b
                         WHERE b.REQ_ID = res.REQ_ID AND b.DRIVER_ID = res.DRIVER_ID
                         ORDER BY b.MOD_DT DESC, b.RES_ID DESC
                         LIMIT 1
                    )
                   LEFT JOIN TB_USER u ON u.CUST_ID = COALESCE(res.TRAVELER_ID, r.TRAVELER_ID)
                  ORDER BY r.START_DT ASC`,
                [driverCustId]
            );

            const items = rows.map((row) => ({
                reqId: row.reqId,
                resId: row.resId,
                dataStat: row.dataStat,
                travelerId: row.travelerId,
                travelerName: safeDecryptUserNm(row.travelerUserNmEnc) || '여행자',
                tripTitle: row.tripTitle || '',
                startAddr: row.startAddr || '',
                endAddr: row.endAddr || '',
                startDt: row.startDt,
            }));

            res.status(200).json({ items });
        } catch (error) {
            console.error('live-chat-bus-driver/chat-partners:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** GET /api/live-chat-bus-driver/messages?driverId=&reqId=&resId= */
    router.get('/messages', async (req, res) => {
        const driverKey = driverKeyFromQuery(req.query);
        const reqId = req.query.reqId != null ? String(req.query.reqId).trim() : '';
        const resId = req.query.resId != null ? String(req.query.resId).trim() : '';
        if (!driverKey || !reqId || !resId) {
            return res.status(400).json({ error: 'driverId(또는 userId·driverUuid), reqId, resId가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const driverCustId = await resolveDriverCustId(connection, driverKey);
            const access = await fetchReservationForChat(connection, driverCustId, reqId, resId);
            if (!access) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }

            const [rows] = await connection.execute(SQL_MESSAGES, [reqId, resId]);

            const items = rows.map((row) => ({
                histSeq: row.histSeq,
                msgKind: row.msgKind || 'TEXT',
                msgBody: row.msgBody != null ? String(row.msgBody) : '',
                senderRole: row.senderRole,
                regDt: row.regDt,
            }));

            res.status(200).json({ items });
        } catch (error) {
            console.error('live-chat-bus-driver/messages GET:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** POST /api/live-chat-bus-driver/messages  body: { driverId, reqId, resId, msgBody } */
    router.post('/messages', async (req, res) => {
        const driverKey = driverKeyFromBody(req.body);
        const reqId = req.body?.reqId != null ? String(req.body.reqId).trim() : '';
        const resId = req.body?.resId != null ? String(req.body.resId).trim() : '';
        const text = typeof req.body?.msgBody === 'string' ? req.body.msgBody.trim() : '';
        if (!driverKey || !reqId || !resId) {
            return res.status(400).json({ error: 'driverId(또는 userId·driverUuid), reqId, resId가 필요합니다.' });
        }
        if (!text) {
            return res.status(400).json({ error: '메시지 내용을 입력해 주세요.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const driverCustId = await resolveDriverCustId(connection, driverKey);
            const row = await fetchReservationForChat(connection, driverCustId, reqId, resId);
            if (!row) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }
            const travelerCustId = row.travelerId != null ? String(row.travelerId).trim() : '';
            if (!travelerCustId) {
                return res.status(400).json({ error: '여행자 정보가 없어 메시지를 저장할 수 없습니다.' });
            }

            let tripTitle = '';
            try {
                const [tr] = await connection.execute(
                    `SELECT TRIP_TITLE AS t FROM TB_AUCTION_REQ WHERE REQ_ID = ? LIMIT 1`,
                    [reqId]
                );
                tripTitle = tr[0]?.t || '';
            } catch (_) {
                /* ignore */
            }

            const { histSeq } = await insertTripChatMessage(connection, {
                reqId,
                resId,
                travelerCustId,
                driverCustId,
                senderCustId: driverCustId,
                senderRole: 'DRIVER',
                text,
                tripTitle,
            });

            void notifyTravelerNewDriverMessage(pool, {
                travelerCustId,
                reqId,
                driverCustId,
                previewText: text,
                tripTitle,
            }).catch((err) => console.warn('live-chat-bus-driver push:', err.message));

            res.status(201).json({
                ok: true,
                histSeq,
                msgKind: 'TEXT',
                msgBody: text,
                senderRole: 'DRIVER',
            });
        } catch (error) {
            console.error('live-chat-bus-driver/messages POST:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};
