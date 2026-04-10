/**
 * 여행자 ↔ 기사 실시간 채팅 (여행자 클라이언트)
 * Base path: /api/live-chat-traveler
 */
const express = require('express');
const { randomUUID } = require('crypto');
const { decrypt } = require('../crypto');
const { migrateTbChatLogColumns } = require('../migrations/tbChatLogMigrate');
const { insertTbChatLogMessage } = require('../lib/insertTbChatLogMessage');
const { notifyDriverNewTravelerMessage } = require('../services/chatPush');

function safeDecryptUserNm(val) {
    if (val == null || val === '') return '';
    try {
        return decrypt(val);
    } catch (_) {
        return String(val);
    }
}

module.exports = function createLiveChatTravelerRouter(pool) {
    const router = express.Router();

    async function fetchReservationForTraveler(connection, travelerUuid, reqUuid) {
        const [rows] = await connection.execute(
            `SELECT BIN_TO_UUID(res.RES_UUID) AS resUuid,
                    BIN_TO_UUID(res.DRIVER_UUID) AS driverUuid
               FROM TB_BUS_RESERVATION res
               INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
              WHERE res.REQ_UUID = UUID_TO_BIN(?)
                AND COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID) = UUID_TO_BIN(?)
                AND res.RES_STAT IN ('CONFIRM','DONE')
              ORDER BY res.BID_SEQ DESC
              LIMIT 1`,
            [reqUuid, travelerUuid]
        );
        return rows[0] || null;
    }

    /** GET /chat-partners?travelerUuid= */
    router.get('/chat-partners', async (req, res) => {
        const { travelerUuid } = req.query;
        if (!travelerUuid) return res.status(400).json({ error: 'travelerUuid가 필요합니다.' });

        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
                `SELECT
                        BIN_TO_UUID(r.REQ_UUID) AS reqUuid,
                        BIN_TO_UUID(res.RES_UUID) AS resUuid,
                        res.RES_STAT AS resStat,
                        BIN_TO_UUID(res.DRIVER_UUID) AS driverUuid,
                        r.TRIP_TITLE AS tripTitle,
                        r.START_ADDR AS startAddr,
                        r.END_ADDR AS endAddr,
                        r.START_DT AS startDt,
                        u.USER_NM AS driverUserNmEnc
                   FROM TB_BUS_RESERVATION res
                   INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
                    AND COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID) = UUID_TO_BIN(?)
                    AND res.RES_STAT IN ('CONFIRM','DONE')
                    AND res.BID_SEQ = (
                        SELECT MAX(b.BID_SEQ) FROM TB_BUS_RESERVATION b
                         WHERE b.REQ_UUID = res.REQ_UUID AND b.DRIVER_UUID = res.DRIVER_UUID
                    )
                   LEFT JOIN TB_USER u ON u.USER_UUID = res.DRIVER_UUID
                  ORDER BY r.START_DT ASC`,
                [travelerUuid]
            );

            const items = rows.map((row) => ({
                reqUuid: row.reqUuid,
                resUuid: row.resUuid,
                resStat: row.resStat,
                driverUuid: row.driverUuid,
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

    /** GET /messages?travelerUuid=&reqUuid= */
    router.get('/messages', async (req, res) => {
        const { travelerUuid, reqUuid } = req.query;
        if (!travelerUuid || !reqUuid) {
            return res.status(400).json({ error: 'travelerUuid와 reqUuid가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const access = await fetchReservationForTraveler(connection, travelerUuid, reqUuid);
            if (!access) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }

            const selectMessagesSql =
                `SELECT BIN_TO_UUID(CHAT_LOG_UUID) AS chatLogUuid,
                        MSG_KIND AS msgKind,
                        MSG_BODY AS msgBody,
                        SENDER_ROLE AS senderRole,
                        REG_DT AS regDt
                   FROM TB_CHAT_LOG
                  WHERE REQ_UUID = UUID_TO_BIN(?)
                    AND TRAVELER_UUID = UUID_TO_BIN(?)
                    AND DRIVER_UUID = UUID_TO_BIN(?)
                  ORDER BY REG_DT ASC`;
            const selectParams = [reqUuid, travelerUuid, access.driverUuid];
            let rows;
            try {
                [rows] = await connection.execute(selectMessagesSql, selectParams);
            } catch (e) {
                if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
                    await migrateTbChatLogColumns(connection);
                    [rows] = await connection.execute(selectMessagesSql, selectParams);
                } else {
                    throw e;
                }
            }

            const items = rows.map((row) => ({
                chatLogUuid: row.chatLogUuid,
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

    /** POST /messages body: { travelerUuid, reqUuid, msgBody } */
    router.post('/messages', async (req, res) => {
        const { travelerUuid, reqUuid, msgBody } = req.body || {};
        const text = typeof msgBody === 'string' ? msgBody.trim() : '';
        if (!travelerUuid || !reqUuid) {
            return res.status(400).json({ error: 'travelerUuid와 reqUuid가 필요합니다.' });
        }
        if (!text) {
            return res.status(400).json({ error: '메시지 내용을 입력해 주세요.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const row = await fetchReservationForTraveler(connection, travelerUuid, reqUuid);
            if (!row) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }
            if (!row.driverUuid) {
                return res.status(400).json({ error: '기사 정보가 없어 메시지를 저장할 수 없습니다.' });
            }

            const chatLogUuid = randomUUID();
            await insertTbChatLogMessage(connection, {
                chatLogUuid,
                reqUuid,
                resUuid: row.resUuid,
                travelerUuid,
                driverUuid: row.driverUuid,
                senderUuid: travelerUuid,
                senderRole: 'TRAVELER',
                text,
            });

            let tripTitle = '';
            try {
                const [tr] = await connection.execute(
                    `SELECT TRIP_TITLE AS t FROM TB_AUCTION_REQ WHERE REQ_UUID = UUID_TO_BIN(?) LIMIT 1`,
                    [reqUuid]
                );
                tripTitle = tr[0]?.t || '';
            } catch (_) {
                /* ignore */
            }

            void notifyDriverNewTravelerMessage(pool, {
                driverUuid: row.driverUuid,
                reqUuid,
                travelerUuid,
                previewText: text,
                tripTitle,
            }).catch((err) => console.warn('live-chat-traveler push:', err.message));

            res.status(201).json({
                ok: true,
                chatLogUuid,
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
