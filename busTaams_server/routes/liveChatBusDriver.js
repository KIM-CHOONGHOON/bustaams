/**
 * LiveChatBusDriver REST API
 * Base path: /api/live-chat-bus-driver
 */
const express = require('express');
const { randomUUID } = require('crypto');
const { decrypt } = require('../crypto');
const { migrateTbChatLogColumns } = require('../migrations/tbChatLogMigrate');
const { insertTbChatLogMessage } = require('../lib/insertTbChatLogMessage');
const { notifyTravelerNewDriverMessage } = require('../services/chatPush');

function safeDecryptUserNm(val) {
    if (val == null || val === '') return '';
    try {
        return decrypt(val);
    } catch (_) {
        return String(val);
    }
}

module.exports = function createLiveChatBusDriverRouter(pool) {
    const router = express.Router();

    /**
     * 채팅 가능: TB_BUS_RESERVATION.DRIVER_UUID = 기사,
     * RES_STAT IN ('CONFIRM','DONE'),
     * TB_BUS_RESERVATION.REQ_UUID = TB_AUCTION_REQ.REQ_UUID
     */
    async function fetchReservationForChat(connection, driverUuid, reqUuid) {
        const [rows] = await connection.execute(
            `SELECT BIN_TO_UUID(res.RES_UUID) AS resUuid,
                    BIN_TO_UUID(
                        COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID)
                    ) AS travelerUuid
               FROM TB_BUS_RESERVATION res
               INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
              WHERE res.REQ_UUID = UUID_TO_BIN(?)
                AND res.DRIVER_UUID = UUID_TO_BIN(?)
                AND res.RES_STAT IN ('CONFIRM','DONE')
              ORDER BY res.BID_SEQ DESC
              LIMIT 1`,
            [reqUuid, driverUuid]
        );
        return rows[0] || null;
    }

    /** GET /api/live-chat-bus-driver/chat-partners?driverUuid= */
    router.get('/chat-partners', async (req, res) => {
        const { driverUuid } = req.query;
        if (!driverUuid) return res.status(400).json({ error: 'driverUuid가 필요합니다.' });

        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
                `SELECT
                        BIN_TO_UUID(r.REQ_UUID) AS reqUuid,
                        BIN_TO_UUID(res.RES_UUID) AS resUuid,
                        res.RES_STAT AS resStat,
                        BIN_TO_UUID(
                            COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID)
                        ) AS travelerUuid,
                        r.TRIP_TITLE AS tripTitle,
                        r.START_ADDR AS startAddr,
                        r.END_ADDR AS endAddr,
                        r.START_DT AS startDt,
                        u.USER_NM AS travelerUserNmEnc
                   FROM TB_BUS_RESERVATION res
                   INNER JOIN TB_AUCTION_REQ r ON r.REQ_UUID = res.REQ_UUID
                    AND res.DRIVER_UUID = UUID_TO_BIN(?)
                    AND res.RES_STAT IN ('CONFIRM','DONE')
                    AND res.BID_SEQ = (
                        SELECT MAX(b.BID_SEQ) FROM TB_BUS_RESERVATION b
                         WHERE b.REQ_UUID = res.REQ_UUID AND b.DRIVER_UUID = res.DRIVER_UUID
                    )
                   LEFT JOIN TB_USER u
                     ON u.USER_UUID = COALESCE(res.TRAVELER_UUID, r.TRAVELER_UUID)
                  ORDER BY r.START_DT ASC`,
                [driverUuid]
            );

            const items = rows.map((row) => ({
                reqUuid: row.reqUuid,
                resUuid: row.resUuid,
                resStat: row.resStat,
                travelerUuid: row.travelerUuid,
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

    /** GET /api/live-chat-bus-driver/messages?driverUuid=&reqUuid= */
    router.get('/messages', async (req, res) => {
        const { driverUuid, reqUuid } = req.query;
        if (!driverUuid || !reqUuid) {
            return res.status(400).json({ error: 'driverUuid와 reqUuid가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const access = await fetchReservationForChat(connection, driverUuid, reqUuid);
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
                    AND DRIVER_UUID = UUID_TO_BIN(?)
                  ORDER BY REG_DT ASC`;
            const selectParams = [reqUuid, driverUuid];
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
            console.error('live-chat-bus-driver/messages GET:', error);
            res.status(500).json({ error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    /** POST /api/live-chat-bus-driver/messages  body: { driverUuid, reqUuid, msgBody } */
    router.post('/messages', async (req, res) => {
        const { driverUuid, reqUuid, msgBody } = req.body || {};
        const text = typeof msgBody === 'string' ? msgBody.trim() : '';
        if (!driverUuid || !reqUuid) {
            return res.status(400).json({ error: 'driverUuid와 reqUuid가 필요합니다.' });
        }
        if (!text) {
            return res.status(400).json({ error: '메시지 내용을 입력해 주세요.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            const row = await fetchReservationForChat(connection, driverUuid, reqUuid);
            if (!row) {
                return res.status(403).json({ error: '채팅할 수 있는 견적이 아니거나 조건에 맞지 않습니다.' });
            }
            if (!row.travelerUuid) {
                return res.status(400).json({ error: '여행자 정보가 없어 메시지를 저장할 수 없습니다.' });
            }

            const chatLogUuid = randomUUID();
            await insertTbChatLogMessage(connection, {
                chatLogUuid,
                reqUuid,
                resUuid: row.resUuid,
                travelerUuid: row.travelerUuid,
                driverUuid,
                senderUuid: driverUuid,
                senderRole: 'DRIVER',
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
            void notifyTravelerNewDriverMessage(pool, {
                travelerUuid: row.travelerUuid,
                reqUuid,
                driverUuid,
                previewText: text,
                tripTitle,
            }).catch((err) => console.warn('live-chat-bus-driver push:', err.message));

            res.status(201).json({
                ok: true,
                chatLogUuid,
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
