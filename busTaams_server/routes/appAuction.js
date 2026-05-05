const express = require('express');
const router = express.Router();
const { pool, getNextId } = require('../db');
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

/**
 * 🚌 버스 대절 견적 요청 등록 (App 전용)
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

        const userId = req.user.userId;
        
        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        const reqId = await getNextId('TB_AUCTION_REQ', 'REQ_ID', 10);

        // 1. 마스터 정보 저장 (TB_AUCTION_REQ)
        const masterQuery = `
            INSERT INTO TB_AUCTION_REQ (
                REQ_ID, TRAVELER_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_AMT, DATA_STAT, EXPIRE_DT,
                REG_ID, MOD_ID, REQ_COMMENT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUCTION', DATE_ADD(NOW(), INTERVAL 1 DAY), ?, ?, ?)
        `;
        await connection.execute(masterQuery, [
            reqId, custId, tripName, departure, destination,
            startDate, endDate, passengerCount, grandTotal || 0,
            custId, custId, specialRequest || ''
        ]);

        // 2. 차량 정보 저장 (TB_AUCTION_REQ_BUS)
        if (selectedBuses && selectedBuses.length > 0) {
            const busQuery = `
                INSERT INTO TB_AUCTION_REQ_BUS (
                    REQ_BUS_SEQ, REQ_ID, BUS_TYPE_CD, DATA_STAT, RES_BUS_AMT, REG_ID, MOD_ID
                ) VALUES (?, ?, ?, 'AUCTION', ?, ?, ?)
            `;
            let busSeq = 1;
            for (const bus of selectedBuses) {
                for (let i = 0; i < (bus.count || 1); i++) {
                    await connection.execute(busQuery, [
                        busSeq++, reqId, bus.name, bus.price, custId, custId
                    ]);
                }
            }
        }

        // 3. 경유지 정보 저장 (TB_AUCTION_REQ_VIA)
        const saveWaypoint = async (addr, type, seq) => {
            if (!addr) return;
            await connection.execute(`
                INSERT INTO TB_AUCTION_REQ_VIA (
                    REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, 
                    LAT, LNG, DIST_FROM_PREV, TIME_FROM_PREV, REG_ID
                ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?)
            `, [reqId, seq, type, addr, custId]);
        };

        // [A] 가는 길 경유지
        let currentSeq = 1;
        if (goingWaypoints && Array.isArray(goingWaypoints)) {
            for (const addr of goingWaypoints) {
                await saveWaypoint(addr, 'START_WAY', currentSeq++);
            }
        }

        // [B] 회차지
        await saveWaypoint(destination, 'ROUND_TRIP', currentSeq++);

        // [C] 오는 길 경유지
        if (returningWaypoints && Array.isArray(returningWaypoints)) {
            for (const addr of returningWaypoints) {
                await saveWaypoint(addr, 'END_WAY', currentSeq++);
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: '견적 요청이 성공적으로 등록되었습니다.', reqId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('App Auction Request Error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
