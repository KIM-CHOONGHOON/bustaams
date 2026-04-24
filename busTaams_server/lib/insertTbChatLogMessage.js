/**
 * 견적·예약 연동 채팅 — `BusTaams 테이블.md` §3
 * `TB_CHAT_LOG`(방) + `TB_CHAT_LOG_PART`(참가) + `TB_CHAT_LOG_HIST`(메시지)
 */

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {{ reqId: string, resId: string, travelerCustId: string, driverCustId: string, chatTitle?: string|null }} p
 * @returns {Promise<{ chatSeq: number, created: boolean }>}
 */
async function getOrCreateTripChatRoom(connection, p) {
    const { reqId, resId, travelerCustId, driverCustId, chatTitle } = p;
    const [ex] = await connection.execute(
        `SELECT CHAT_SEQ AS chatSeq FROM TB_CHAT_LOG WHERE REQ_ID = ? AND RES_ID = ? LIMIT 1`,
        [reqId, resId]
    );
    if (ex[0]?.chatSeq != null) {
        return { chatSeq: Number(ex[0].chatSeq), created: false };
    }
    const title = chatTitle != null && String(chatTitle).trim() ? String(chatTitle).trim() : null;
    const [ins] = await connection.execute(
        `INSERT INTO TB_CHAT_LOG (ROOM_KIND, CHAT_TITLE, REQ_ID, RES_ID, CREATED_BY_CUST_ID)
         VALUES ('TRAVELER', ?, ?, ?, ?)`,
        [title, reqId, resId, travelerCustId]
    );
    const chatSeq = ins.insertId;
    await connection.execute(
        `INSERT IGNORE INTO TB_CHAT_LOG_PART (CHAT_SEQ, CUST_ID, PART_TYPE) VALUES (?, ?, 'TRAVELER'), (?, ?, 'DRIVER')`,
        [chatSeq, travelerCustId, chatSeq, driverCustId]
    );
    return { chatSeq, created: true };
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number} chatSeq
 * @param {string} travelerCustId
 * @param {string} driverCustId
 */
async function ensureTripChatParticipants(connection, chatSeq, travelerCustId, driverCustId) {
    await connection.execute(
        `INSERT IGNORE INTO TB_CHAT_LOG_PART (CHAT_SEQ, CUST_ID, PART_TYPE) VALUES (?, ?, 'TRAVELER'), (?, ?, 'DRIVER')`,
        [chatSeq, travelerCustId, chatSeq, driverCustId]
    );
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {{ reqId: string, resId: string, travelerCustId: string, driverCustId: string, senderCustId: string, senderRole: 'DRIVER'|'TRAVELER', text: string, tripTitle?: string|null }} p
 * @returns {Promise<{ histSeq: number, chatSeq: number }>}
 */
async function insertTripChatMessage(connection, p) {
    const { reqId, resId, travelerCustId, driverCustId, senderCustId, senderRole, text, tripTitle } = p;
    const { chatSeq } = await getOrCreateTripChatRoom(connection, {
        reqId,
        resId,
        travelerCustId,
        driverCustId,
        chatTitle: tripTitle,
    });
    await ensureTripChatParticipants(connection, chatSeq, travelerCustId, driverCustId);
    const [ins] = await connection.execute(
        `INSERT INTO TB_CHAT_LOG_HIST (CHAT_SEQ, SENDER_CUST_ID, SENDER_ROLE, MSG_KIND, MSG_BODY)
         VALUES (?, ?, ?, 'TEXT', ?)`,
        [chatSeq, senderCustId, senderRole, text]
    );
    const histSeq = ins.insertId;
    await connection.execute(
        `UPDATE TB_CHAT_LOG SET LAST_MSG_DT = CURRENT_TIMESTAMP WHERE CHAT_SEQ = ?`,
        [chatSeq]
    );
    return { histSeq, chatSeq };
}

module.exports = {
    insertTripChatMessage,
    getOrCreateTripChatRoom,
    ensureTripChatParticipants,
};
