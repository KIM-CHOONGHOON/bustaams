/**
 * 채팅 메시지 수신 알림 — Firebase Cloud Messaging
 * `TB_USER_DEVICE_TOKEN`: `server.js` 부트스트랩은 `USER_ID`(VARCHAR(256)) — `TB_USER.CUST_ID`로 토큰 조회
 */
const admin = require('firebase-admin');

function getMessagingSafe() {
    try {
        if (!admin.apps.length) return null;
        return admin.messaging();
    } catch (_) {
        return null;
    }
}

/** @param {import('mysql2/promise').Pool} pool */
async function fetchFcmTokensByCustId(pool, custId) {
    if (!custId) return [];
    const cid = String(custId).trim();
    const [u] = await pool.execute(`SELECT USER_ID FROM TB_USER WHERE CUST_ID = ? LIMIT 1`, [cid]);
    const userId = u[0]?.USER_ID;
    if (!userId) return [];
    const [rows] = await pool.execute(
        `SELECT FCM_TOKEN FROM TB_USER_DEVICE_TOKEN WHERE USER_ID = ?`,
        [userId]
    );
    return (rows || []).map((r) => r.FCM_TOKEN).filter(Boolean);
}

function stringifyData(data) {
    const out = {};
    if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
            out[k] = v == null ? '' : String(v);
        }
    }
    return out;
}

/**
 * 등록된 모든 기기로 동일 알림 전송
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ custId: string, title: string, body: string, data?: object }} opts
 */
async function notifyUserDevicesByCustId(pool, { custId, title, body, data }) {
    const messaging = getMessagingSafe();
    if (!messaging) {
        return { sent: 0, skipped: true, reason: 'firebase_admin_unavailable' };
    }
    const tokens = await fetchFcmTokensByCustId(pool, custId);
    if (!tokens.length) {
        return { sent: 0, skipped: false, reason: 'no_tokens' };
    }
    const dataPayload = stringifyData(data);
    const shortBody = String(body || '').slice(0, 200);
    const messages = tokens.map((token) => ({
        token,
        notification: { title: String(title || 'Bustaams').slice(0, 100), body: shortBody },
        data: dataPayload,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
        webpush: {
            notification: {
                title: String(title || 'Bustaams').slice(0, 100),
                body: shortBody.slice(0, 120),
            },
        },
    }));
    try {
        const resp = await messaging.sendEach(messages);
        return { sent: resp.successCount, failure: resp.failureCount };
    } catch (e) {
        console.warn('chatPush sendEach:', e.message);
        return { sent: 0, error: e.message };
    }
}

async function notifyTravelerNewDriverMessage(pool, { travelerCustId, reqId, driverCustId, previewText, tripTitle }) {
    const title = tripTitle ? `채팅 · ${String(tripTitle).slice(0, 40)}` : '버스기사 메시지';
    const body = previewText ? String(previewText).slice(0, 180) : '새 메시지가 도착했습니다.';
    return notifyUserDevicesByCustId(pool, {
        custId: travelerCustId,
        title,
        body,
        data: {
            type: 'CHAT_DRIVER_MESSAGE',
            reqId: String(reqId),
            driverId: String(driverCustId),
        },
    });
}

async function notifyDriverNewTravelerMessage(pool, { driverCustId, reqId, travelerCustId, previewText, tripTitle }) {
    const title = tripTitle ? `채팅 · ${String(tripTitle).slice(0, 40)}` : '여행자 메시지';
    const body = previewText ? String(previewText).slice(0, 180) : '새 메시지가 도착했습니다.';
    return notifyUserDevicesByCustId(pool, {
        custId: driverCustId,
        title,
        body,
        data: {
            type: 'CHAT_TRAVELER_MESSAGE',
            reqId: String(reqId),
            travelerId: String(travelerCustId),
        },
    });
}

module.exports = {
    notifyUserDevicesByCustId,
    fetchFcmTokensByCustId,
    notifyTravelerNewDriverMessage,
    notifyDriverNewTravelerMessage,
};
