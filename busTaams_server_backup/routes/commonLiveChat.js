/**
 * CommonLiveChat REST API — 버스기사 「여행자와 대화」 모달
 * Base path: /api/CommonLiveChat
 *
 * TB_BUS_RESERVATION(DRIVER_ID, TRAVELER_ID, DATA_STAT, RES_ID, REQ_ID),
 * TB_CHAT_LOG + TB_CHAT_LOG_PART + TB_CHAT_LOG_HIST
 */
const express = require('express');
const { plainOrLegacyDecrypt } = require('../crypto');
const { insertTripChatMessage, getOrCreateTripChatRoom } = require('../lib/insertTbChatLogMessage');
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
   AND res.DATA_STAT IN ('BIDDING','CONFIRM')
 LIMIT 1`;

const SQL_MESSAGES_BASE = `
SELECT h.HIST_SEQ AS histSeq,
       h.MSG_KIND AS msgKind,
       h.MSG_BODY AS msgBody,
       h.SENDER_ROLE AS senderRole,
       h.REG_DT AS regDt
  FROM TB_CHAT_LOG_HIST h
 INNER JOIN TB_CHAT_LOG c ON c.CHAT_LOG_SEQ = h.CHAT_LOG_SEQ
 WHERE c.REQ_ID = ?
   AND c.RES_ID = ?`;

async function chatSeqForThread(connection, reqId, resId) {
    const [r] = await connection.execute(
        `SELECT CHAT_LOG_SEQ AS chatSeq FROM TB_CHAT_LOG WHERE REQ_ID = ? AND RES_ID = ? LIMIT 1`,
        [reqId, resId]
    );
    return r[0]?.chatSeq != null ? Number(r[0].chatSeq) : null;
}

async function roomMetaForThread(connection, reqId, resId) {
    const [rows] = await connection.execute(
        `SELECT CHAT_LOG_SEQ AS chatSeq, CHAT_TITLE AS chatTitle, CHAT_COVER_FILE_ID AS chatCoverFileId
           FROM TB_CHAT_LOG WHERE REQ_ID = ? AND RES_ID = ? LIMIT 1`,
        [reqId, resId]
    );
    const row = rows[0];
    if (!row) {
        return { chatSeq: null, chatTitle: null, chatCoverFileId: null };
    }
    return {
        chatSeq: row.chatSeq != null ? Number(row.chatSeq) : null,
        chatTitle: row.chatTitle != null ? String(row.chatTitle) : null,
        chatCoverFileId: row.chatCoverFileId != null ? String(row.chatCoverFileId) : null,
    };
}

module.exports = function createCommonLiveChatRouter(pool) {
    const router = express.Router();

    async function resolveDriverCustId(connection, driverKey) {
        let cid = await resolveCustIdByUserKey(connection, driverKey);
        if (!cid) cid = driverKey;
        return String(cid).trim();
    }

    /** DATA_STAT IN ('BIDDING','CONFIRM'), 기사 매칭 */
    async function fetchReservationForChat(connection, driverCustId, reqId, resId) {
        const [rows] = await connection.execute(SQL_RES_FOR_DRIVER, [reqId, resId, driverCustId]);
        return rows[0] || null;
    }

    /** GET /api/CommonLiveChat/chat-partners?driverId= */
    router.get('/chat-partners', async (req, res) => {
        const driverKey = driverKeyFromQuery(req.query);
        if (!driverKey) {
            return res.status(400).json({
                screenId: 'CommonLiveChat',
                error: 'driverId(또는 userId·driverUuid)가 필요합니다.',
            });
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
                        r.END_DT AS endDt,
                        ut.USER_NM AS travelerUserNmEnc,
                        ud.USER_NM AS driverUserNmEnc
                   FROM TB_BUS_RESERVATION res
                   INNER JOIN TB_AUCTION_REQ r ON r.REQ_ID = res.REQ_ID
                    AND res.DRIVER_ID = ?
                    AND res.DATA_STAT IN ('BIDDING','CONFIRM')
                    AND res.RES_ID = (
                        SELECT b.RES_ID FROM TB_BUS_RESERVATION b
                         WHERE b.REQ_ID = res.REQ_ID AND b.DRIVER_ID = res.DRIVER_ID
                         ORDER BY b.MOD_DT DESC, b.RES_ID DESC
                         LIMIT 1
                    )
                   LEFT JOIN TB_USER ut ON ut.CUST_ID = COALESCE(res.TRAVELER_ID, r.TRAVELER_ID)
                   LEFT JOIN TB_USER ud ON ud.CUST_ID = res.DRIVER_ID
                  ORDER BY r.START_DT ASC`,
                [driverCustId]
            );

            const items = rows.map((row) => ({
                reqId: row.reqId,
                resId: row.resId,
                dataStat: row.dataStat,
                travelerId: row.travelerId,
                travelerName: safeDecryptUserNm(row.travelerUserNmEnc) || '여행자',
                driverName: safeDecryptUserNm(row.driverUserNmEnc) || '기사',
                tripTitle: row.tripTitle || '',
                startAddr: row.startAddr || '',
                endAddr: row.endAddr || '',
                startDt: row.startDt,
                endDt: row.endDt,
            }));

            res.status(200).json({ screenId: 'CommonLiveChat', items });
        } catch (error) {
            console.error('CommonLiveChat/chat-partners:', error);
            res.status(500).json({ screenId: 'CommonLiveChat', error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /**
     * POST /api/CommonLiveChat/ensure-room
     * 목록에서 대화 상대 선택 시 TB_CHAT_LOG / TB_CHAT_LOG_PART 생성(또는 기존 방 반환). 메시지(HIST)는 생성하지 않음.
     */
    router.post('/ensure-room', async (req, res) => {
        const driverKey = driverKeyFromBody(req.body);
        const reqId = req.body?.reqId != null ? String(req.body.reqId).trim() : '';
        const resId = req.body?.resId != null ? String(req.body.resId).trim() : '';
        if (!driverKey || !reqId || !resId) {
            return res.status(400).json({
                screenId: 'CommonLiveChat',
                error: 'driverId(또는 userId·driverUuid), reqId, resId가 필요합니다.',
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();
            const driverCustId = await resolveDriverCustId(connection, driverKey);
            const row = await fetchReservationForChat(connection, driverCustId, reqId, resId);
            if (!row) {
                await connection.rollback();
                return res.status(403).json({
                    screenId: 'CommonLiveChat',
                    error: '채팅할 수 있는 예약이 아니거나 조건에 맞지 않습니다.',
                });
            }
            const travelerCustId = row.travelerId != null ? String(row.travelerId).trim() : '';
            if (!travelerCustId) {
                await connection.rollback();
                return res.status(400).json({ screenId: 'CommonLiveChat', error: '여행자 정보가 없습니다.' });
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

            const { chatSeq } = await getOrCreateTripChatRoom(connection, {
                reqId,
                resId,
                travelerCustId,
                driverCustId,
                chatTitle: tripTitle || null,
            });

            const meta = await roomMetaForThread(connection, reqId, resId);
            await connection.commit();

            res.status(200).json({
                screenId: 'CommonLiveChat',
                CommonLiveChat: {
                    chatLogSeq: chatSeq,
                    chatTitle: meta.chatTitle,
                    chatCoverFileId: meta.chatCoverFileId,
                },
            });
        } catch (error) {
            if (connection) await connection.rollback().catch(() => {});
            console.error('CommonLiveChat/ensure-room:', error);
            res.status(500).json({ screenId: 'CommonLiveChat', error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** GET /api/CommonLiveChat/messages?driverId=&reqId=&resId= */
    router.get('/messages', async (req, res) => {
        const driverKey = driverKeyFromQuery(req.query);
        const reqId = req.query.reqId != null ? String(req.query.reqId).trim() : '';
        const resId = req.query.resId != null ? String(req.query.resId).trim() : '';
        if (!driverKey || !reqId || !resId) {
            return res.status(400).json({
                screenId: 'CommonLiveChat',
                error: 'driverId(또는 userId·driverUuid), reqId, resId가 필요합니다.',
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const driverCustId = await resolveDriverCustId(connection, driverKey);
            const access = await fetchReservationForChat(connection, driverCustId, reqId, resId);
            if (!access) {
                return res.status(403).json({
                    screenId: 'CommonLiveChat',
                    error: '채팅할 수 있는 예약이 아니거나 조건에 맞지 않습니다.',
                });
            }

            const chatSeq = await chatSeqForThread(connection, reqId, resId);
            const meta = await roomMetaForThread(connection, reqId, resId);
            const afterRaw = req.query.afterHistSeq != null ? parseInt(String(req.query.afterHistSeq), 10) : 0;
            const afterHistSeq = Number.isFinite(afterRaw) && afterRaw > 0 ? afterRaw : 0;

            if (chatSeq == null) {
                return res.status(200).json({
                    screenId: 'CommonLiveChat',
                    chatSeq: null,
                    chatTitle: null,
                    chatCoverFileId: null,
                    items: [],
                });
            }

            const sql =
                afterHistSeq > 0
                    ? `${SQL_MESSAGES_BASE} AND h.HIST_SEQ > ? ORDER BY h.REG_DT ASC, h.HIST_SEQ ASC`
                    : `${SQL_MESSAGES_BASE} ORDER BY h.REG_DT ASC, h.HIST_SEQ ASC`;
            const params = afterHistSeq > 0 ? [reqId, resId, afterHistSeq] : [reqId, resId];
            const [rows] = await connection.execute(sql, params);

            const items = rows.map((row) => ({
                histSeq: row.histSeq,
                msgKind: row.msgKind || 'TEXT',
                msgBody: row.msgBody != null ? String(row.msgBody) : '',
                senderRole: row.senderRole,
                regDt: row.regDt,
            }));

            res.status(200).json({
                screenId: 'CommonLiveChat',
                chatSeq,
                chatTitle: meta.chatTitle,
                chatCoverFileId: meta.chatCoverFileId,
                items,
            });
        } catch (error) {
            console.error('CommonLiveChat/messages GET:', error);
            res.status(500).json({ screenId: 'CommonLiveChat', error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** POST /api/CommonLiveChat/messages  body: { driverId, reqId, resId, msgBody } */
    router.post('/messages', async (req, res) => {
        const driverKey = driverKeyFromBody(req.body);
        const reqId = req.body?.reqId != null ? String(req.body.reqId).trim() : '';
        const resId = req.body?.resId != null ? String(req.body.resId).trim() : '';
        const text = typeof req.body?.msgBody === 'string' ? req.body.msgBody.trim() : '';
        if (!driverKey || !reqId || !resId) {
            return res.status(400).json({
                screenId: 'CommonLiveChat',
                error: 'driverId(또는 userId·driverUuid), reqId, resId가 필요합니다.',
            });
        }
        if (!text) {
            return res.status(400).json({ screenId: 'CommonLiveChat', error: '메시지 내용을 입력해 주세요.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const driverCustId = await resolveDriverCustId(connection, driverKey);
            const row = await fetchReservationForChat(connection, driverCustId, reqId, resId);
            if (!row) {
                return res.status(403).json({
                    screenId: 'CommonLiveChat',
                    error: '채팅할 수 있는 예약이 아니거나 조건에 맞지 않습니다.',
                });
            }
            const travelerCustId = row.travelerId != null ? String(row.travelerId).trim() : '';
            if (!travelerCustId) {
                return res.status(400).json({ screenId: 'CommonLiveChat', error: '여행자 정보가 없어 메시지를 저장할 수 없습니다.' });
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

            const { histSeq, chatSeq } = await insertTripChatMessage(connection, {
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
            }).catch((err) => console.warn('CommonLiveChat push:', err.message));

            const meta = await roomMetaForThread(connection, reqId, resId);

            res.status(201).json({
                screenId: 'CommonLiveChat',
                ok: true,
                chatSeq,
                histSeq,
                chatTitle: meta.chatTitle,
                chatCoverFileId: meta.chatCoverFileId,
                msgKind: 'TEXT',
                msgBody: text,
                senderRole: 'DRIVER',
            });
        } catch (error) {
            console.error('CommonLiveChat/messages POST:', error);
            res.status(500).json({ screenId: 'CommonLiveChat', error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};
