/**
 * 채팅 메시지 수신 알림 — Firebase Cloud Messaging (앱·웹 동일 토큰 테이블)
 * SMS는 별도 정책(환경 변수) — 기본 미구현, 문서 참고
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

async function fetchTokensForUser(pool, userUuidStr) {
    const [rows] = await pool.execute(
        `SELECT FCM_TOKEN FROM TB_USER_DEVICE_TOKEN WHERE USER_UUID = UUID_TO_BIN(?)`,
        [userUuidStr]
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
 * 등록된 모든 기기로 동일 알림 전송 (앱·웹 토큰이 같은 테이블에 있으면 한 번에 전송)
 */
async function notifyUserDevices(pool, { userUuidStr, title, body, data }) {
    const messaging = getMessagingSafe();
    if (!messaging) {
        return { sent: 0, skipped: true, reason: 'firebase_admin_unavailable' };
    }
    const tokens = await fetchTokensForUser(pool, userUuidStr);
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

async function notifyTravelerNewDriverMessage(pool, { travelerUuid, reqUuid, driverUuid, previewText, tripTitle }) {
    const title = tripTitle ? `채팅 · ${String(tripTitle).slice(0, 40)}` : '버스기사 메시지';
    const body = previewText ? String(previewText).slice(0, 180) : '새 메시지가 도착했습니다.';
    return notifyUserDevices(pool, {
        userUuidStr: travelerUuid,
        title,
        body,
        data: {
            type: 'CHAT_DRIVER_MESSAGE',
            reqUuid: String(reqUuid),
            driverUuid: String(driverUuid),
        },
    });
}

async function notifyDriverNewTravelerMessage(pool, { driverUuid, reqUuid, travelerUuid, previewText, tripTitle }) {
    const title = tripTitle ? `채팅 · ${String(tripTitle).slice(0, 40)}` : '여행자 메시지';
    const body = previewText ? String(previewText).slice(0, 180) : '새 메시지가 도착했습니다.';
    return notifyUserDevices(pool, {
        userUuidStr: driverUuid,
        title,
        body,
        data: {
            type: 'CHAT_TRAVELER_MESSAGE',
            reqUuid: String(reqUuid),
            travelerUuid: String(travelerUuid),
        },
    });
}

module.exports = {
    notifyUserDevices,
    notifyTravelerNewDriverMessage,
    notifyDriverNewTravelerMessage,
};
