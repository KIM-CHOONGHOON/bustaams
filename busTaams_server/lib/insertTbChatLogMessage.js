/**
 * TB_CHAT_LOG INSERT — 신규 스키마(MSG_BODY만) / 레거시(MSG_CONTENT NOT NULL) 모두 대응
 */
const { migrateTbChatLogColumns } = require('../migrations/tbChatLogMigrate');

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {object} p
 * @param {string} p.chatLogUuid
 * @param {string} p.reqUuid
 * @param {string|null|undefined} p.resUuid
 * @param {string} p.travelerUuid
 * @param {string} p.driverUuid
 * @param {string} p.senderUuid
 * @param {'DRIVER'|'TRAVELER'} p.senderRole
 * @param {string} p.text
 */
async function insertTbChatLogMessage(connection, p) {
    const {
        chatLogUuid,
        reqUuid,
        resUuid,
        travelerUuid,
        driverUuid,
        senderUuid,
        senderRole,
        text,
    } = p;
    const hasRes = resUuid != null && resUuid !== '';

    const cols = `CHAT_LOG_UUID, REQ_UUID, RES_UUID, TRAVELER_UUID, DRIVER_UUID,
        SENDER_UUID, SENDER_ROLE, MSG_KIND`;

    const insertBodyOnly = () =>
        hasRes
            ? connection.execute(
                  `INSERT INTO TB_CHAT_LOG (${cols}, MSG_BODY) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?),
                    UUID_TO_BIN(?), ?, 'TEXT', ?)`,
                  [chatLogUuid, reqUuid, resUuid, travelerUuid, driverUuid, senderUuid, senderRole, text]
              )
            : connection.execute(
                  `INSERT INTO TB_CHAT_LOG (${cols}, MSG_BODY) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), NULL, UUID_TO_BIN(?), UUID_TO_BIN(?),
                    UUID_TO_BIN(?), ?, 'TEXT', ?)`,
                  [chatLogUuid, reqUuid, travelerUuid, driverUuid, senderUuid, senderRole, text]
              );

    const insertBodyAndContent = () =>
        hasRes
            ? connection.execute(
                  `INSERT INTO TB_CHAT_LOG (${cols}, MSG_BODY, MSG_CONTENT) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?),
                    UUID_TO_BIN(?), ?, 'TEXT', ?, ?)`,
                  [chatLogUuid, reqUuid, resUuid, travelerUuid, driverUuid, senderUuid, senderRole, text, text]
              )
            : connection.execute(
                  `INSERT INTO TB_CHAT_LOG (${cols}, MSG_BODY, MSG_CONTENT) VALUES (
                    UUID_TO_BIN(?), UUID_TO_BIN(?), NULL, UUID_TO_BIN(?), UUID_TO_BIN(?),
                    UUID_TO_BIN(?), ?, 'TEXT', ?, ?)`,
                  [chatLogUuid, reqUuid, travelerUuid, driverUuid, senderUuid, senderRole, text, text]
              );

    try {
        await insertBodyOnly();
    } catch (e) {
        const msg = String(e.message || '');
        if (e.errno === 1364 && msg.includes('MSG_CONTENT')) {
            await insertBodyAndContent();
            return;
        }
        if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
            await migrateTbChatLogColumns(connection);
            try {
                await insertBodyOnly();
            } catch (e2) {
                const msg2 = String(e2.message || '');
                if (e2.errno === 1364 && msg2.includes('MSG_CONTENT')) {
                    await insertBodyAndContent();
                } else {
                    throw e2;
                }
            }
            return;
        }
        throw e;
    }
}

module.exports = { insertTbChatLogMessage };
