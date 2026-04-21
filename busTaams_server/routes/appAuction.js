const express = require('express');
const router = express.Router();
const pool = require('../db');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// JWT 인증 미들웨어 (내부용)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });

    jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        req.user = user;
        next();
    });
};

// [Helper] Geocoding & Distance Matrix (Simulated for now - User should integrate Map API keys)
async function getRouteInfo(startCoords, waypoints, endCoords) {
    // 실제 구현 시 네이버/카카오 API 호출 로직이 들어갈 자리입니다.
    // 여기서는 목업 데이터를 반환하거나 간단한 거리 계산 로직을 시뮬레이션합니다.
    
    let currentCoords = startCoords;
    const optimizedWaypoints = [];
    
    // Greedy 알고리즘으로 가까운 순서대로 정렬 (시뮬레이션)
    const remaining = [...waypoints];
    let order = 1;
    
    while (remaining.length > 0) {
        // 실제로는 API를 통해 최적 순서를 받아오거나 거리를 비교해야 합니다.
        // 여기서는 입력된 순서를 유지하되 DIST/TIME 정보를 채워줍니다.
        const wp = remaining.shift();
        
        optimizedWaypoints.push({
            ...wp,
            viaOrd: order++,
            lat: wp.lat || 37.5665, // Mock
            lng: wp.lng || 126.9780, // Mock
            distFromPrev: 10.5, // Mock (km)
            timeFromPrev: 20    // Mock (min)
        });
    }

    return optimizedWaypoints;
}

/**
 * 🚌 버스 대절 견적 요청 등록 (App 전용)
 * 출발지 -> 경유지 Group A -> 도착지(회차지) -> 경유지 Group B -> 복귀지
 */
router.post('/request', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            tripName, departure, destination, 
            goingWaypoints, returningWaypoints,
            startDate, endDate, passengerCount,
            specialRequest, selectedBuses, grandTotal
        } = req.body;

        const travelerUuid = req.user.userUuid;
        const reqUuid = randomUUID();
        const reqUuidBuf = Buffer.from(reqUuid.replace(/-/g, ''), 'hex');
        const travelerUuidBuf = Buffer.from(travelerUuid.replace(/-/g, ''), 'hex');

        // 1. 마스터 정보 저장 (TB_AUCTION_REQ)
        const masterQuery = `
            INSERT INTO TB_AUCTION_REQ (
                REQ_UUID, TRAVELER_UUID, TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_STAT, EXPIRE_DT,
                REG_ID, REQ_AMT, REQ_COMMENT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BIDDING', DATE_ADD(NOW(), INTERVAL 1 DAY), ?, ?, ?)
        `;
        await connection.execute(masterQuery, [
            reqUuidBuf, travelerUuidBuf, tripName, departure, destination,
            startDate, endDate, passengerCount,
            req.user.userId, grandTotal || 0, specialRequest || ''
        ]);

        // 2. 차량 정보 저장 (TB_AUCTION_REQ_BUS)
        if (selectedBuses && selectedBuses.length > 0) {
            const busQuery = `
                INSERT INTO TB_AUCTION_REQ_BUS (
                    REQ_BUS_UUID, REQ_UUID, BUS_TYPE_CD, REQ_BUS_CNT, REQ_AMT, REG_ID
                ) VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, ?)
            `;
            for (const bus of selectedBuses) {
                await connection.execute(busQuery, [
                    reqUuidBuf, bus.name, bus.count, bus.price, req.user.userId
                ]);
            }
        }

        // 3. 경유지 정보 저장 (TB_AUCTION_REQ_VIA)
        // [A] 가는 길 경유지 (START_WAY)
        if (goingWaypoints && goingWaypoints.length > 0) {
            let ord = 1;
            for (const addr of goingWaypoints) {
                if (!addr) continue;
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        VIA_UUID, REQ_UUID, VIA_TYPE, VIA_ORD, VIA_ADDR, 
                        LAT, LNG, DIST_FROM_PREV, TIME_FROM_PREV, REG_ID
                    ) VALUES (UUID_TO_BIN(UUID()), ?, 'START_WAY', ?, ?, 0, 0, 10, 15, ?)
                `, [reqUuidBuf, ord++, addr, req.user.userId]);
            }
        }

        // [B] 회차지 (ROUND_TRIP)
        await connection.execute(`
            INSERT INTO TB_AUCTION_REQ_VIA (
                VIA_UUID, REQ_UUID, VIA_TYPE, VIA_ORD, VIA_ADDR, 
                LAT, LNG, DIST_FROM_PREV, TIME_FROM_PREV, REG_ID
            ) VALUES (UUID_TO_BIN(UUID()), ?, 'ROUND_TRIP', 99, ?, 0, 0, 15, 20, ?)
        `, [reqUuidBuf, destination, req.user.userId]);

        // [C] 오는 길 경유지 (END_WAY)
        if (returningWaypoints && returningWaypoints.length > 0) {
            let ord = 101; 
            for (const addr of returningWaypoints) {
                if (!addr) continue;
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        VIA_UUID, REQ_UUID, VIA_TYPE, VIA_ORD, VIA_ADDR, 
                        LAT, LNG, DIST_FROM_PREV, TIME_FROM_PREV, REG_ID
                    ) VALUES (UUID_TO_BIN(UUID()), ?, 'END_WAY', ?, ?, 0, 0, 8, 12, ?)
                `, [reqUuidBuf, ord++, addr, req.user.userId]);
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: '견적 요청이 성공적으로 등록되었습니다.', reqUuid });
    } catch (error) {
        await connection.rollback();
        console.error('App Auction Request Error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
