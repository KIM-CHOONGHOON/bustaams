const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

/**
 * [App] 채팅 관련 라우터
 * TB_CHAT_LOG, TB_CHAT_LOG_HIST, TB_CHAT_LOG_PART 연동
 */

// JWT 인증 미들웨어 (server.js와 동일한 로직)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });

    jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
        req.user = user;
        next();
    });
};

// 1. 채팅방 정보 조회 및 생성 (Reservation ID 기준)
router.get('/room/:resId', authenticateToken, async (req, res) => {
    const { resId } = req.params;
    const { custId } = req.user;

    try {
        // 1. 기존 방 확인 (RES_ID 기준)
        const [rooms] = await pool.execute(
            `SELECT CHAT_LOG_SEQ as CHAT_SEQ, REQ_ID, RES_ID, CHAT_TITLE 
             FROM TB_CHAT_LOG 
             WHERE RES_ID = ?`,
            [resId]
        );

        let chatSeq;
        let chatRoom;

        if (rooms.length > 0) {
            chatRoom = rooms[0];
            chatSeq = chatRoom.CHAT_SEQ;
        } else {
            // 2. 새로운 방 생성
            // 예약 정보에서 관련자 ID 가져오기
            const [resRows] = await pool.execute(
                `SELECT REQ_ID, TRAVELER_ID, DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?`,
                [resId]
            );

            if (resRows.length === 0) {
                return res.status(404).json({ success: false, error: '예약 정보를 찾을 수 없습니다.' });
            }

            const { REQ_ID, TRAVELER_ID, DRIVER_ID } = resRows[0];
            const chatTitle = `${resId} 관련 대화`;

            // TB_CHAT_LOG 삽입 (ROOM_KIND: DRIVER - 기사 매칭 방)
            const [result] = await pool.execute(
                `INSERT INTO TB_CHAT_LOG (
                    ROOM_KIND, CHAT_TITLE, REQ_ID, RES_ID, CREATED_BY_CUST_ID, REG_ID
                ) VALUES ('DRIVER', ?, ?, ?, ?, ?)`,
                [chatTitle, REQ_ID, resId, custId, custId]
            );

            chatSeq = result.insertId;
            chatRoom = { CHAT_SEQ: chatSeq, CHAT_TITLE: chatTitle, RES_ID: resId };

            // 3. 참가자 등록 (여행자, 기사)
            // INSERT IGNORE 를 사용하여 중복 방지
            await pool.execute(
                `INSERT IGNORE INTO TB_CHAT_LOG_PART (CHAT_LOG_SEQ, CUST_ID, PART_TYPE) VALUES (?, ?, 'TRAVELER')`,
                [chatSeq, TRAVELER_ID]
            );
            await pool.execute(
                `INSERT IGNORE INTO TB_CHAT_LOG_PART (CHAT_LOG_SEQ, CUST_ID, PART_TYPE) VALUES (?, ?, 'DRIVER')`,
                [chatSeq, DRIVER_ID]
            );
        }

        // 상대방 정보 가져오기 (기사면 여행자 정보, 여행자면 기사 정보)
        const [parts] = await pool.execute(
            `SELECT p.CUST_ID, p.PART_TYPE, u.USER_NM, 
                    CASE 
                        WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) 
                        WHEN u.USER_IMAGE IS NOT NULL AND u.USER_IMAGE LIKE 'http%' THEN CONCAT('/api/common/display-image?path=', u.USER_IMAGE)
                        WHEN u.USER_IMAGE IS NOT NULL THEN CONCAT('/uploads/profiles/', u.USER_IMAGE)
                        ELSE NULL 
                    END as USER_IMAGE 
             FROM TB_CHAT_LOG_PART p
             JOIN TB_USER u ON p.CUST_ID = u.CUST_ID
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
             WHERE p.CHAT_LOG_SEQ = ? AND p.CUST_ID != ?`,
            [chatSeq, custId]
        );

        res.json({
            success: true,
            data: {
                chatSeq,
                chatTitle: chatRoom.CHAT_TITLE,
                resId: chatRoom.RES_ID,
                otherUser: parts[0] || null
            }
        });
    } catch (err) {
        console.error('[Chat API] Room Error:', err);
        res.status(500).json({ success: false, error: '채팅방 정보를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 2. 채팅 내역 조회
router.get('/history/:chatSeq', authenticateToken, async (req, res) => {
    const { chatSeq } = req.params;
    const { custId } = req.user;

    try {
        // 내역 조회 시 해당 방의 로그인한 사용자 LAST_READ_DT를 현재 시간으로 즉시 업데이트 (한글 주석)
        try {
            await pool.execute(
                `UPDATE TB_CHAT_LOG_PART 
                 SET LAST_READ_DT = NOW() 
                 WHERE CHAT_LOG_SEQ = ? AND CUST_ID = ?`,
                [chatSeq, custId]
            );
        } catch (updateErr) {
            console.error('[Chat API] LAST_READ_DT 업데이트 오류:', updateErr);
        }

        const [rows] = await pool.execute(
            `SELECT HIST_SEQ, CHAT_LOG_SEQ as chatSeq, SENDER_CUST_ID, SENDER_ROLE, MSG_KIND, MSG_BODY, FILE_ID, 
                    DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') as regDt
             FROM TB_CHAT_LOG_HIST
             WHERE CHAT_LOG_SEQ = ?
             ORDER BY REG_DT ASC`,
            [chatSeq]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[Chat API] History Error:', err);
        res.status(500).json({ success: false, error: '채팅 내역을 가져오는 중 오류가 발생했습니다.' });
    }
});

// 3. 메시지 전송
router.post('/send', authenticateToken, async (req, res) => {
    const { chatSeq, msgBody, msgKind = 'TEXT', fileId = null } = req.body;
    const { custId, userType } = req.user;

    if (!chatSeq || !msgBody) {
        return res.status(400).json({ success: false, error: '필수 데이터가 누락되었습니다.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. 메시지 저장 (TB_CHAT_LOG_HIST)
        await connection.execute(
            `INSERT INTO TB_CHAT_LOG_HIST (CHAT_LOG_SEQ, SENDER_CUST_ID, SENDER_ROLE, MSG_KIND, MSG_BODY, FILE_ID)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [chatSeq, custId, userType, msgKind, msgBody, fileId]
        );

        // 2. 마스터 업데이트 (TB_CHAT_LOG - 최신 메시지 정보 갱신)
        await connection.execute(
            `UPDATE TB_CHAT_LOG 
             SET LAST_MSG_DT = NOW(), 
                 MSG_BODY = ?, 
                 SENDER_ROLE = ?,
                 MSG_KIND = ?
             WHERE CHAT_LOG_SEQ = ?`,
            [msgBody, userType, msgKind, chatSeq]
        );

        // 3. 보낸 사람 본인의 LAST_READ_DT도 즉시 업데이트 (한글 주석)
        await connection.execute(
            `UPDATE TB_CHAT_LOG_PART 
             SET LAST_READ_DT = NOW() 
             WHERE CHAT_LOG_SEQ = ? AND CUST_ID = ?`,
            [chatSeq, custId]
        );

        await connection.commit();
        res.json({ success: true });

        // 3. 푸시 알림 비동기 전송 (한글 주석)
        // 트랜잭션 커밋 완료 후 대화 상대방에게 실시간 FCM 푸시 알림을 발송합니다.
        // API 응답 시간이나 트랜잭션 릴리즈를 지연시키지 않도록 비동기 즉시실행함수로 감싸 처리합니다.
        (async () => {
            try {
                const [roomRows] = await pool.execute(
                    `SELECT l.REQ_ID, req.TRIP_TITLE,
                            (SELECT CUST_ID FROM TB_CHAT_LOG_PART WHERE CHAT_LOG_SEQ = l.CHAT_LOG_SEQ AND PART_TYPE = 'TRAVELER') as travelerId,
                            (SELECT CUST_ID FROM TB_CHAT_LOG_PART WHERE CHAT_LOG_SEQ = l.CHAT_LOG_SEQ AND PART_TYPE = 'DRIVER') as driverId
                     FROM TB_CHAT_LOG l
                     LEFT JOIN TB_AUCTION_REQ req ON l.REQ_ID = req.REQ_ID
                     WHERE l.CHAT_LOG_SEQ = ?`,
                    [chatSeq]
                );

                if (roomRows.length > 0) {
                    const { REQ_ID, TRIP_TITLE, travelerId, driverId } = roomRows[0];

                    // 보낸 사람이 기사(DRIVER)인 경우 -> 여행자(TRAVELER)에게 알림 발송
                    if (userType === 'DRIVER' && travelerId) {
                        const { notifyTravelerNewDriverMessage } = require('../services/chatPush');
                        await notifyTravelerNewDriverMessage(pool, {
                            travelerCustId: travelerId,
                            reqId: REQ_ID,
                            driverCustId: custId,
                            previewText: msgBody,
                            tripTitle: TRIP_TITLE
                        });
                        console.log(`[Chat Push] 기사(${custId})가 여행자(${travelerId})에게 메시지 알림을 전송했습니다. REQ_ID: ${REQ_ID}`);
                    }
                    // 보낸 사람이 여행자(TRAVELER)인 경우 -> 기사(DRIVER)에게 알림 발송
                    else if (userType === 'TRAVELER' && driverId) {
                        const { notifyDriverNewTravelerMessage } = require('../services/chatPush');
                        await notifyDriverNewTravelerMessage(pool, {
                            driverCustId: driverId,
                            reqId: REQ_ID,
                            travelerCustId: custId,
                            previewText: msgBody,
                            tripTitle: TRIP_TITLE
                        });
                        console.log(`[Chat Push] 여행자(${custId})가 기사(${driverId})에게 메시지 알림을 전송했습니다. REQ_ID: ${REQ_ID}`);
                    }
                }
            } catch (pushErr) {
                console.error('[Chat Push Error] 푸시 알림 발송에 실패했습니다:', pushErr);
            }
        })();
    } catch (err) {
        await connection.rollback();
        console.error('[Chat API] Send Error:', err);
        res.status(500).json({ success: false, error: '메시지 전송 중 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

// 4. 채팅 목록 조회
router.get('/list', authenticateToken, async (req, res) => {
    const { custId } = req.user;
    try {
        // 1. 기존 채팅방 + 2. 성사된 예약(채팅방 없음) UNION 조회 (TB_AUCTION_REQ 조인하여 여행 정보 가져옴) (한글 주석)
        const [rows] = await pool.execute(
            `SELECT * FROM (
                SELECT l.CHAT_LOG_SEQ as chatSeq, l.RES_ID as resId, l.CHAT_TITLE as chatTitle, 
                        l.MSG_BODY as lastMsg, 
                        l.LAST_MSG_DT as lastMsgDt,
                        DATE_FORMAT(l.LAST_MSG_DT, '%Y-%m-%d %H:%i') as lastMsgTime,
                        l.SENDER_ROLE as lastSenderRole,
                        'CHAT' as sourceType,
                        NULL as otherCustId,
                        req.TRIP_TITLE as tripTitle,
                        DATE_FORMAT(req.START_DT, '%Y-%m-%d') as tripDate,
                        (
                            SELECT COUNT(*) 
                            FROM TB_CHAT_LOG_HIST h
                            JOIN TB_CHAT_LOG_PART p2 ON h.CHAT_LOG_SEQ = p2.CHAT_LOG_SEQ
                            WHERE h.CHAT_LOG_SEQ = l.CHAT_LOG_SEQ 
                              AND p2.CUST_ID = p.CUST_ID
                              AND h.SENDER_CUST_ID != p.CUST_ID
                              AND (p2.LAST_READ_DT IS NULL OR h.REG_DT > p2.LAST_READ_DT)
                        ) as unreadCount
                 FROM TB_CHAT_LOG l
                 JOIN TB_CHAT_LOG_PART p ON l.CHAT_LOG_SEQ = p.CHAT_LOG_SEQ
                 LEFT JOIN TB_BUS_RESERVATION res ON l.RES_ID = res.RES_ID
                 LEFT JOIN TB_AUCTION_REQ req ON res.REQ_ID = req.REQ_ID
                 WHERE p.CUST_ID = ?
                UNION ALL
                SELECT NULL as chatSeq, r.RES_ID as resId, CONCAT(r.RES_ID, ' 관련 대화') as chatTitle,
                        '채팅방이 생성되었습니다. 메시지를 보내보세요.' as lastMsg,
                        r.REG_DT as lastMsgDt,
                        DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as lastMsgTime,
                        NULL as lastSenderRole,
                        'RESERVATION' as sourceType,
                        CASE WHEN r.DRIVER_ID = ? THEN r.TRAVELER_ID ELSE r.DRIVER_ID END as otherCustId,
                        req.TRIP_TITLE as tripTitle,
                        DATE_FORMAT(req.START_DT, '%Y-%m-%d') as tripDate,
                        0 as unreadCount
                FROM TB_BUS_RESERVATION r
                LEFT JOIN TB_AUCTION_REQ req ON r.REQ_ID = req.REQ_ID
                WHERE (r.DRIVER_ID = ? OR r.TRAVELER_ID = ?)
                  AND r.DATA_STAT IN ('CONFIRM', 'DONE')
                  AND NOT EXISTS (SELECT 1 FROM TB_CHAT_LOG l WHERE l.RES_ID = r.RES_ID)
            ) t
            ORDER BY lastMsgDt DESC`,
            [custId, custId, custId, custId]
        );

        // 각 항목의 상대방 정보 추가
        const roomsWithOther = await Promise.all(rows.map(async (room) => {
            let otherCustId = room.otherCustId;

            // 채팅방이 있는 경우 파트너 테이블에서 상대방 ID 조회
            if (!otherCustId && room.chatSeq) {
                const [parts] = await pool.execute(
                    `SELECT CUST_ID FROM TB_CHAT_LOG_PART WHERE CHAT_LOG_SEQ = ? AND CUST_ID != ?`,
                    [room.chatSeq, custId]
                );
                if (parts.length > 0) otherCustId = parts[0].CUST_ID;
            }

            if (otherCustId) {
                const [userDetails] = await pool.execute(
                    `SELECT u.USER_NM, 
                            CASE 
                                WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) 
                                WHEN u.USER_IMAGE IS NOT NULL AND u.USER_IMAGE LIKE 'http%' THEN CONCAT('/api/common/display-image?path=', u.USER_IMAGE)
                                WHEN u.USER_IMAGE IS NOT NULL THEN CONCAT('/uploads/profiles/', u.USER_IMAGE)
                                ELSE NULL 
                            END as USER_IMAGE
                     FROM TB_USER u
                     LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
                     WHERE u.CUST_ID = ?`,
                    [otherCustId]
                );
                return {
                    ...room,
                    otherUser: userDetails[0] || null
                };
            }
            return { ...room, otherUser: null };
        }));

        res.json({ success: true, data: roomsWithOther });
    } catch (err) {
        console.error('[Chat API] List Error:', err);
        res.status(500).json({ success: false, error: '채팅 목록을 가져오는 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
