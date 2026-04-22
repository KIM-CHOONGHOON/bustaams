const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

/**
 * API 1: 경로 및 예상 비용 사전 조회
 * POST /api/bid/estimate
 */
router.post('/estimate', async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng, waypoints, busType } = req.body;

        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ error: '출발지와 도착지 좌표는 필수입니다.' });
        }

        const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
        
        // 카카오 API 키가 없는 경우 개발용 더미 데이터 반환
        if (!KAKAO_API_KEY) {
            console.warn('⚠️ KAKAO_API_KEY가 설정되지 않았습니다. 더미 데이터를 반환합니다.');
            return res.status(200).json({
                summary: {
                    distance: 154200, // 154.2 km
                    duration: 7200,   // 120 min
                    fare: { toll: 15000 }
                },
                sections: [
                    { distance: 154200, duration: 7200, toll: 15000 }
                ],
                fuelPrice: 1650,
                restAreaCount: 2
            });
        }

        // 1. 카카오 모빌리티 길찾기 API 호출 (다중 경유지 지원)
        // 참고: https://developers.kakao.com/docs/latest/ko/kakaonavi/rest-api#request-direction
        const origin = `${startLng},${startLat}`;
        const destination = `${endLng},${endLat}`;
        const waypointStr = waypoints && waypoints.length > 0 
            ? waypoints.map(wp => `${wp.lng},${wp.lat}`).join('|') 
            : '';

        const response = await axios.get('https://apis-navi.kakaomobility.com/v1/directions', {
            params: {
                origin,
                destination,
                waypoints: waypointStr,
                priority: 'RECOMMEND'
            },
            headers: {
                Authorization: `KakaoAK ${KAKAO_API_KEY}`
            }
        });

        const route = response.data.routes[0];
        if (!route || route.result_code !== 0) {
            throw new Error(route.result_msg || '경로를 찾을 수 없습니다.');
        }

        // 2. 휴게소 카운트 (간이 로직: 카카오 응답의 guides나 pois 활용 가능, 여기서는 구역 수 기반 또는 Mock)
        // 실제 운영 시에는 별도의 POI 검색 로직이 필요함 (명세서 4.3 참조)
        const restAreaCount = Math.floor(route.summary.distance / 50000); // 50km 마다 1개 가정 (Mock)

        // 3. 실시간 유가 (Opinet API 연동 전까지 고정값 또는 Mock)
        const currentFuelPrice = 1650; // Mock

        res.status(200).json({
            summary: route.summary,
            sections: route.sections,
            fuelPrice: currentFuelPrice,
            restAreaCount
        });

    } catch (error) {
        console.error('Estimate API Error:', error.message);
        res.status(500).json({ error: '경로 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * API 2: 입찰 요청 등록 (저장)
 * POST /api/bid/request
 */
router.post('/request', async (req, res) => {
    let connection;
    try {
        const {
            userId, busType, busFuelEff, passengerCnt, calcBusCnt, busCnt, startDt, endDt, roundTripYn,
            startAddr, startDetailAddr, startLat, startLng,
            endAddr, endDetailAddr, endLat, endLng,
            totalDistanceKm, totalDurationMin, restAreaCnt,
            fuelPricePerL, estFuelCost, totalTollFee,
            mealPrice, lodgingPrice, tipPrice, incidentalSubtotal,
            comment, estTotalServicePrice, waypoints
        } = req.body;

        // 필수 값 검증
        if (!userId || !busType || !startDt || !endDt || !startAddr || !endAddr) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        // 1. TB_BID_REQUEST 저장
        const requestQuery = `
            INSERT INTO TB_BID_REQUEST (
                USER_ID, BUS_TYPE, BUS_FUEL_EFF, PASSENGER_CNT, CALC_BUS_CNT, BUS_CNT, START_DT, END_DT, ROUND_TRIP_YN,
                START_ADDR, START_DETAIL_ADDR, START_LAT, START_LNG,
                END_ADDR, END_DETAIL_ADDR, END_LAT, END_LNG,
                TOTAL_DISTANCE_KM, TOTAL_DURATION_MIN, REST_AREA_CNT,
                FUEL_PRICE_PER_L, EST_FUEL_COST, TOTAL_TOLL_FEE,
                MEAL_PRICE, LODGING_PRICE, TIP_PRICE, INCIDENTAL_SUBTOTAL,
                COMMENT, EST_TOTAL_SERVICE_PRICE, STATUS, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
        `;

        const [result] = await connection.execute(requestQuery, [
            userId, busType, busFuelEff, passengerCnt, calcBusCnt || 1, busCnt || 1, startDt, endDt, roundTripYn || 'N',
            startAddr, startDetailAddr, startLat, startLng,
            endAddr, endDetailAddr, endLat, endLng,
            totalDistanceKm, totalDurationMin, restAreaCnt,
            fuelPricePerL, estFuelCost, totalTollFee,
            mealPrice, lodgingPrice, tipPrice, incidentalSubtotal,
            comment, estTotalServicePrice, custId, custId
        ]);

        const requestId = result.insertId;

        // 2. TB_BID_WAYPOINT 저장
        if (waypoints && waypoints.length > 0) {
            const waypointQuery = `
                INSERT INTO TB_BID_WAYPOINT (
                    REQUEST_ID, WAYPOINT_ADDR, WAYPOINT_DETAIL_ADDR, LAT, LNG, SORT_ORDER,
                    DIST_FROM_PREV, TOLL_FROM_PREV, DURATION_FROM_PREV, REG_ID, MOD_ID
                ) VALUES ?
            `;
            const waypointValues = waypoints.map((wp, index) => [
                requestId, wp.addr, wp.detail, wp.lat, wp.lng, wp.order || (index + 1),
                wp.distance || 0, wp.toll || 0, wp.duration || 0, custId, custId
            ]);

            await connection.query(waypointQuery, [waypointValues]);
        }

        await connection.commit();

        res.status(201).json({
            message: '입찰 요청이 성공적으로 등록되었습니다.',
            requestId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Bid Request Error:', error);
        res.status(500).json({ error: '입찰 요청 저장 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
