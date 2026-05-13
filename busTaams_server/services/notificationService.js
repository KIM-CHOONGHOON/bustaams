/**
 * 통합 알림 서비스 — Firebase Cloud Messaging + DB History
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

/**
 * 특정 사용자의 모든 기기 토큰 조회
 * @param {import('mysql2/promise').Pool} pool 
 * @param {string} custId 
 */
async function fetchFcmTokens(pool, custId) {
    if (!custId) return [];
    const [rows] = await pool.execute(
        `SELECT FCM_TOKEN FROM TB_USER_DEVICE_TOKEN WHERE CUST_ID = ?`,
        [custId]
    );
    return (rows || []).map((r) => r.FCM_TOKEN).filter(Boolean);
}

/**
 * 알림 내역을 DB에 저장
 */
async function saveNotificationToDb(pool, { custId, title, body, link, type }) {
    const sql = `
        INSERT INTO TB_NOTIFICATION (CUST_ID, TITLE, BODY, LINK, NOTIF_TYPE)
        VALUES (?, ?, ?, ?, ?)
    `;
    try {
        await pool.execute(sql, [custId, title, body, link || null, type || 'SYSTEM']);
    } catch (e) {
        console.error('Failed to save notification to DB:', e.message);
    }
}

/**
 * 데이터 페이로드를 문자열로 변환 (FCM 요구사항)
 */
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
 * 통합 알림 전송 함수
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ 
 *   custId: string, 
 *   title: string, 
 *   body: string, 
 *   link?: string, 
 *   type?: string, 
 *   data?: object 
 * }} opts
 */
async function sendNotification(pool, { custId, title, body, link, type, data }) {
    // 1. DB에 알림 내역 저장 (알림 센터용)
    await saveNotificationToDb(pool, { custId, title, body, link, type });

    const messaging = getMessagingSafe();
    if (!messaging) {
        console.warn('Firebase Admin Messaging unavailable.');
        return { sent: 0, skipped: true, reason: 'firebase_admin_unavailable' };
    }

    // 2. 해당 사용자의 기기 토큰 조회
    const tokens = await fetchFcmTokens(pool, custId);
    if (!tokens.length) {
        return { sent: 0, skipped: false, reason: 'no_tokens' };
    }

    // 3. 메시지 페이로드 구성
    const dataPayload = stringifyData({
        ...data,
        link: link || '',
        type: type || 'SYSTEM',
        timestamp: new Date().toISOString()
    });

    const shortBody = String(body || '').slice(0, 200);
    const messages = tokens.map((token) => ({
        token,
        notification: { 
            title: String(title || 'BusTaams').slice(0, 100), 
            body: shortBody 
        },
        data: dataPayload,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
        webpush: {
            notification: {
                title: String(title || 'BusTaams').slice(0, 100),
                body: shortBody.slice(0, 120),
                icon: '/logo192.png' // 앱 아이콘 경로 (웹 기준)
            },
        },
    }));

    try {
        const resp = await messaging.sendEach(messages);
        console.log(`Push notification sent to CUST_ID ${custId}: success=${resp.successCount}, failure=${resp.failureCount}`);
        return { sent: resp.successCount, failure: resp.failureCount };
    } catch (e) {
        console.warn('FCM sendEach Error:', e.message);
        return { sent: 0, error: e.message };
    }
}

module.exports = {
    sendNotification,
    fetchFcmTokens
};
