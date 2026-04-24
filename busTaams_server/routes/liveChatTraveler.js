/**
 * 여행자 ↔ 기사 실시간 채팅 (여행자 클라이언트)
 * Base path: /api/live-chat-traveler
 *
 * `BusTaams 테이블.md`: TRAVELER_ID, DRIVER_ID, RES_ID, REQ_ID — TB_CHAT_LOG / PART / HIST
 */
const express = require('express');
const { plainOrLegacyDecrypt } = require('../crypto');
const { insertTripChatMessage } = require('../lib/insertTbChatLogMessage');
const { notifyDriverNewTravelerMessage } = require('../services/chatPush');
const { resolveCustIdByUserKey } = require('../lib/resolveCustIdByUserKey');

function safeDecryptUserNm(val) {
    return plainOrLegacyDecrypt(val);
}

function travelerKeyFromQuery(q) {
    if (!q) return '';
    return String(q.travelerId ?? q.travelerUuid ?? '').trim();
}

function travelerKeyFromBody(b) {
    if (!b || typeof b !== 'object') return '';
    return String(b.travelerId ?? b.travelerUuid ?? '').trim();
}

const SQL_RES_FOR_TRAVELER = `
SELECT res.RES_ID AS resId,
       res.REQ_ID AS reqId,
       COALESCE(res.TRAVELER_ID, r.TRAVELER_ID) AS travelerId,
       res.DRIVER_ID AS driverId
  FROM TB_BUS_RESERVATION res
  INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
 WHERE res.REQ_ID = ?
   AND res.RES_ID = ?
   AND COALESCE(res.TRAVELER_ID, r.TRAVELER_ID) = ?
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

module.exports = function createLiveChatTravelerRouter(pool) {
    const router = express.Router();

    async function resolveTravelerCustId(connection, key) {
        let cid = await resolveCustIdByUserKey(connection, key);
        if (!cid) cid = key;
        return String(cid).trim();
    }

    async function fetchReservationForTraveler(connection, travelerCustId, reqId, resId) {
        const [rows] = await connection.execute(SQL_RES_FOR_TRAVELER, [reqId, resId, travelerCustId]);
        return rows[0] || null;
    }

    /** GET /chat-partners?travelerId= */
    router.get('/chat-partners', async (req, res) => {
        const travelerKey = travelerKeyFromQuery(req.query);
        if (!travelerKey) {
            return res.status(400).json({ error: 'travelerId(또는 travelerUuid)가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const travelerCustId = await resolveTravelerCustId(connection, travelerKey);

            const [rows] = await connection.execute(
                `SELECT
                        r.REQ_ID AS reqId,
                        res.RES_ID AS resId,
                        res.DATA_STAT AS dataStat,
                        res.DRIVER_ID AS driverId,
                        r.TRIP_TITLE AS tripTitle,
                        r.START_ADDR AS startAddr,
                        r.END_ADDR AS endAddr,
                        r.START_DT AS startDt,
                        u.USER_NM AS driverUserNmEnc
                   FROM TB_BUS_RESERVATION res
                   INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
                    AND COALESCE(res.TRAVELER_ID, r.TRAVELER_ID) = ?
                    AND res.DATA_STAT IN ('CONFIRM','DONE')
                    AND res.RES_ID = (
                        SELECT b.RES_ID FROM TB_BUS_RESERVATION b
                         WHERE b.REQ_ID = res.REQ_ID AND b.DRIVER_ID = res.DRIVER_ID
                         ORDER BY b.MOD_DT DESC, b.RES_ID DESC
                         LIMIT 1
                    )
                   LEFT JOIN TB_USER u ON u.CUST_ID = res.DRIVER_ID
                  ORDER BY r.START_DT ASC`,
                [travelerCustId]
            );

            const items = rows.map((row) => ({
                reqId: row.reqId,
                resId: row.resId,
                dataStat: row.dataStat,
                driverId: row.driverId,
                driverName: safeDecryptUserNm(row.driverUserNmEnc) || '버스기사',
                tripTitle: row.tripTitle || '',
                startAddr: row.startAddr || '',
                endAddr: row.endAddr || '',
                startDt: row.startDt,
            }));

            res.status(200).json({ items });
        } catch (error) {
            console.error('live-chat-traveler/chat-partners:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** GET /messages?travelerId=&reqId=&resId= */
    router.get('/messages', async (req, res) => {
        const travelerKey = travelerKeyFromQuery(req.query);
        const reqId = req.query.reqId != null ? String(req.query.reqId).trim() : '';
        const resId = req.query.resId != null ? String(req.query.resId).trim() : '';
        if (!travelerKey || !reqId || !resId) {
            return res.status(400).json({ error: 'travelerId(또는 travelerUuid), reqId, resId가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const travelerCustId = await resolveTravelerCustId(connection, travelerKey);
            const access = await fetchReservationForTraveler(connection, travelerCustId, reqId, resId);
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
            console.error('live-chat-traveler/messages GET:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** POST /messages body: { travelerId, reqId, resId, msgBody } */
    router.post('/messages', async (req, res) => {
        const travelerKey = travelerKeyFromBody(req.body);
        const reqId = req.body?.reqId != null ? String(req.body.reqId).trim() : '';
        const resId = req.body?.resId != null ? String(req.body.resId).trim() : '';
        const text = typeof req.body?.msgBody === 'string' ? req.body.msgBody.trim() : '';
        if (!travelerKey || !reqId || !resId) {
            return res.status(400).json({ error: 'travelerId(또는 travelerUuid), reqId, resId가 필요합니다.' });
        }
        if (!text) {
            return res.status(400).json({ error: '메시지 내용을 입력해 주세요.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const travelerCustId = await resolveTravelerCustId(connection, travelerKey);
            const row = await fetchReservationForTraveler(connection, travelerCustId, reqId, resId);
            if (!row) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }
            const driverCustId = row.driverId != null ? String(row.driverId).trim() : '';
            if (!driverCustId) {
                return res.status(400).json({ error: '기사 정보가 없어 메시지를 저장할 수 없습니다.' });
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
                senderCustId: travelerCustId,
                senderRole: 'TRAVELER',
                text,
                tripTitle,
            });

            void notifyDriverNewTravelerMessage(pool, {
                driverCustId,
                reqId,
                travelerCustId,
                previewText: text,
                tripTitle,
            }).catch((err) => console.warn('live-chat-traveler push:', err.message));

            res.status(201).json({
                ok: true,
                histSeq,
                msgKind: 'TEXT',
                msgBody: text,
                senderRole: 'TRAVELER',
            });
        } catch (error) {
            console.error('live-chat-traveler/messages POST:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};
