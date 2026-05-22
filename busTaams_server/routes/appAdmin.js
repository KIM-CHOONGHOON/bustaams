const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { decrypt } = require('../crypto');

module.exports = (pool) => {
    // 1. 대시보드 KPI 현황 API (조회 전용)
    router.get('/dashboard/kpi', async (req, res) => {
        try {
            const [reqRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ WHERE DATE(REG_DT) = CURDATE()`
            );
            const todayRequests = reqRows[0]?.cnt || 0;

            const [bidRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ_BUS WHERE DATA_STAT = 'BIDDING'`
            );
            const activeBids = bidRows[0]?.cnt || 0;

            const [confRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ_BUS WHERE DATA_STAT IN ('CONFIRM', 'COMPLETED')`
            );
            const confirmedReservations = confRows[0]?.cnt || 0;

            const [userRows] = await pool.execute(
                `SELECT COUNT(DISTINCT d.CUST_ID) as cnt
                 FROM TB_DRIVER_DOCS d
                 INNER JOIN TB_USER u ON d.CUST_ID = u.CUST_ID
                 WHERE d.APPROVE_STAT = 'WAIT'
                   AND u.USER_TYPE = 'DRIVER'
                   AND u.USER_STAT = 'ACTIVE'`
            );
            const pendingDrivers = userRows[0]?.cnt || 0;
            
            res.status(200).json({
                todayRequests,
                activeBids,
                confirmedReservations,
                pendingDrivers
            });
        } catch (error) {
            console.error('Admin Dashboard KPI Error:', error);
            res.status(200).json({
                todayRequests: 0,
                activeBids: 0,
                confirmedReservations: 0,
                pendingDrivers: 0
            });
        }
    });

    // 2. 관리자 목록 조회 API (실제 DB 조회)
    router.get('/list', async (req, res) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    ADMIN_ID as adminId, 
                    ADMIN_NM as adminNm, 
                    ADMIN_GRADE as role, 
                    DEPT_NM as deptNm, 
                    HP_NO as hpNo, 
                    EMAIL as email, 
                    ADMIN_STAT as adminStat,
                    DATE_FORMAT(REG_DT, '%Y-%m-%d') as regDt 
                 FROM TB_ADMIN 
                 ORDER BY REG_DT DESC`
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Admin List API Error:', error);
            res.status(500).json({ error: '관리자 목록을 불러오는 데 실패했습니다.' });
        }
    });

    // 3. 신규 관리자 등록 API (실제 DB INSERT)
    router.post('/signup', async (req, res) => {
        try {
            const { adminId, password, adminNm, deptNm, hpNo, email, role, registeredBy } = req.body;
            
            if (!adminId || !password || !adminNm) {
                return res.status(400).json({ error: '아이디, 비밀번호, 이름은 필수 입력 항목입니다.' });
            }

            // 중복 아이디 체크
            const [existRows] = await pool.execute(
                `SELECT 1 FROM TB_ADMIN WHERE ADMIN_ID = ?`,
                [adminId]
            );
            if (existRows.length > 0) {
                return res.status(400).json({ error: '이미 존재하는 관리자 ID입니다.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const adminGrade = role || 'MANAGER'; // SUPER, MANAGER, SALES 중 하나
            const regId = registeredBy || 'SYSTEM'; // 등록자 ID

            await pool.execute(
                `INSERT INTO TB_ADMIN (
                    ADMIN_ID, PASSWORD, ADMIN_NM, DEPT_NM, ADMIN_GRADE, HP_NO, EMAIL, ADMIN_STAT,
                    REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?, NOW(), ?)`,
                [adminId, hashedPassword, adminNm, deptNm || null, adminGrade, hpNo || null, email || null, regId, regId]
            );

            res.status(201).json({ message: '관리자가 성공적으로 등록되었습니다.' });
        } catch (error) {
            console.error('Signup API Error:', error);
            res.status(500).json({ error: `서버 내부 오류: ${error.message}` });
        }
    });

    // 4. 관리자 로그인 API (실제 DB 검증)
    router.post('/login', async (req, res) => {
        try {
            const { adminId, password } = req.body;
            if (!adminId || !password) {
                return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
            }

            const [rows] = await pool.execute(
                `SELECT * FROM TB_ADMIN WHERE ADMIN_ID = ?`,
                [adminId]
            );

            if (rows.length === 0) {
                return res.status(401).json({ error: '존재하지 않는 관리자 아이디입니다.' });
            }

            const adminObj = rows[0];

            if (adminObj.ADMIN_STAT !== 'ACTIVE') {
                if (adminObj.ADMIN_STAT === 'LOCKED') {
                    return res.status(403).json({ error: '잠금 처리된 계정입니다. 최고 관리자에게 문의하세요.' });
                } else if (adminObj.ADMIN_STAT === 'LEAVE') {
                    return res.status(403).json({ error: '퇴사 처리된 계정입니다. 로그인할 수 없습니다.' });
                } else {
                    return res.status(403).json({ error: '비활성화 상태의 관리자 계정입니다.' });
                }
            }
            console.log(`[DEBUG Admin Login] adminId: ${adminId}, inputPasswordLength: ${password ? password.length : 0}`);

            const isMatch = await bcrypt.compare(password, adminObj.PASSWORD);
            if (!isMatch) {
                return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
            }

            // 로그인 성공 시 마지막 로그인 시간 업데이트
            await pool.execute(
                `UPDATE TB_ADMIN SET LAST_LOGIN_DT = CURRENT_TIMESTAMP WHERE ADMIN_ID = ?`,
                [adminId]
            );

            res.status(200).json({
                message: '로그인 성공',
                admin: {
                    adminId: adminObj.ADMIN_ID,
                    adminNm: adminObj.ADMIN_NM,
                    deptNm: adminObj.DEPT_NM,
                    email: adminObj.EMAIL,
                    role: adminObj.ADMIN_GRADE
                }
            });
        } catch (error) {
            console.error('Login API Error:', error);
            res.status(500).json({ error: '로그인 처리 중 서버 오류가 발생했습니다.' });
        }
    });

    // 5. 결제완료 예약(여행) 목록 조회 API
    router.get('/reservations', async (req, res) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    r.REQ_ID as reqId,
                    r.TRAVELER_ID as travelerId,
                    u.USER_NM as travelerName,
                    r.TRIP_TITLE as tripTitle,
                    r.START_ADDR as startAddr,
                    r.END_ADDR as endAddr,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDt,
                    DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDt,
                    r.PASSENGER_CNT as passengerCnt,
                    r.REQ_AMT as reqAmt,
                    r.DATA_STAT as dataStat,
                    r.PAYMENT_STS as paymentSts,
                    DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt
                 FROM TB_AUCTION_REQ r
                 LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
                 WHERE r.PAYMENT_STS IS NOT NULL AND r.PAYMENT_STS != ''
                 ORDER BY r.REG_DT DESC`
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Admin Reservations API Error:', error);
            res.status(500).json({ error: '예약 목록 조회 중 오류가 발생했습니다.' });
        }
    });

    // 6. 예약 결제 확정 처리 API (세 개 테이블 상태값 CONFIRM 업데이트)
    router.post('/reservations/confirm', async (req, res) => {
        const { reqId } = req.body;
        if (!reqId) {
            return res.status(400).json({ error: '요청 ID(reqId)가 필요합니다.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 0. TB_BUS_RESERVATION에서 상태가 'BIDDING'인 기사의 ID를 조회
            const [bidRows] = await connection.execute(
                `SELECT DRIVER_ID FROM TB_BUS_RESERVATION 
                 WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING' LIMIT 1`,
                [reqId]
            );

            // 1. TB_AUCTION_REQ 상태를 CONFIRM으로 업데이트하고 PAYMENT_STS를 '2'로 변경
            await connection.execute(
                `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM', PAYMENT_STS = '2', MOD_DT = NOW() WHERE REQ_ID = ?`,
                [reqId]
            );

            // 2. TB_AUCTION_REQ_BUS 상태를 CONFIRM으로 업데이트
            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'CONFIRM', MOD_DT = NOW() WHERE REQ_ID = ?`,
                [reqId]
            );

            // 3. TB_BUS_RESERVATION 상태 및 확정일시를 CONFIRM으로 업데이트 (상태가 'BIDDING'인 예약 건만 확정 처리)
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM', CONFIRM_DT = NOW(), MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'`,
                [reqId]
            );

            // 4. 매칭된 기사 정보가 존재하면 TB_MOM_MEMBER 횟수 차감 및 데이터 갱신
            if (bidRows.length > 0 && bidRows[0].DRIVER_ID) {
                const driverId = bidRows[0].DRIVER_ID;
                
                // 공통코드에서 기본 청약 횟수 조회 (FEE_POLICY_CNT.DRIVER)
                const [codeRows] = await connection.execute(
                    `SELECT CD_FNUM FROM TB_COMMON_CODE WHERE GRP_CD = 'FEE_POLICY_CNT' AND DTL_CD = 'DRIVER' LIMIT 1`
                );
                const basicCnt = codeRows[0] && codeRows[0].CD_FNUM ? Math.floor(Number(codeRows[0].CD_FNUM)) : 10000;
                
                // 현재 년월(YYYYMM) 생성
                const now = new Date();
                const yyyyMM = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
                
                // TB_MOM_MEMBER 업데이트 또는 삽입
                await connection.execute(
                    `INSERT INTO TB_MOM_MEMBER (
                        CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                     ) VALUES (?, ?, 'DRIVER', ?, 1, ?, NOW(), ?, NOW(), ?)
                     ON DUPLICATE KEY UPDATE
                        USE_CNT = USE_CNT + 1,
                        REMAINING_CNT = IF(BASIC_CNT > USE_CNT, BASIC_CNT - USE_CNT, 0),
                        MOD_DT = NOW(),
                        MOD_ID = ?`,
                    [driverId, yyyyMM, basicCnt, basicCnt - 1, driverId, driverId, driverId]
                );
            }

            await connection.commit();
            res.status(200).json({ message: '성공적으로 결제 처리 및 예약 확정이 완료되었습니다.' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Confirm Payment API Error:', error);
            res.status(500).json({ error: '결제 처리 중 서버 오류가 발생했습니다.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // 7. 일반 회원(여행자) 및 버스 기사 목록 조회 API (검색 필터 포함)
    router.get('/members', async (req, res) => {
        try {
            const { userType, searchType, searchKeyword } = req.query;

            // 기본값 설정: TRAVELER
            const targetType = userType === 'DRIVER' ? 'DRIVER' : 'TRAVELER';

            let query;
            const params = [];

            if (targetType === 'DRIVER') {
                query = `
                    SELECT 
                        u.CUST_ID as custId,
                        u.USER_ID as userId,
                        u.USER_NM as userNm,
                        u.HP_NO as hpNo,
                        u.EMAIL as email,
                        u.USER_TYPE as userType,
                        u.USER_STAT as userStat,
                        DATE_FORMAT(u.JOIN_DT, '%Y-%m-%d %H:%i') as joinDt,
                        (SELECT ROUND(AVG(r.STAR_RATING), 2) FROM TB_TRIP_REVIEW r WHERE r.DRIVER_ID = u.CUST_ID) as ratingAvg,
                        (SELECT COUNT(*) FROM TB_TRIP_REVIEW r WHERE r.DRIVER_ID = u.CUST_ID) as reviewCnt,
                        v.VEHICLE_NO as vehicleNo,
                        v.MODEL_NM as modelNm,
                        v.SERVICE_CLASS as serviceClass,
                        v.MILEAGE as mileage
                    FROM TB_USER u
                    LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON u.CUST_ID = v.CUST_ID
                    WHERE u.USER_TYPE = 'DRIVER'
                `;
            } else {
                query = `
                    SELECT 
                        u.CUST_ID as custId,
                        u.USER_ID as userId,
                        u.USER_NM as userNm,
                        u.HP_NO as hpNo,
                        u.EMAIL as email,
                        u.USER_TYPE as userType,
                        u.USER_STAT as userStat,
                        DATE_FORMAT(u.JOIN_DT, '%Y-%m-%d %H:%i') as joinDt
                    FROM TB_USER u
                    WHERE u.USER_TYPE = 'TRAVELER'
                `;
            }

            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'userNm') {
                    query += ` AND u.USER_NM LIKE ?`;
                    params.push(keyword);
                } else if (searchType === 'userId') {
                    query += ` AND u.USER_ID LIKE ?`;
                    params.push(keyword);
                } else if (searchType === 'hpNo') {
                    query += ` AND u.HP_NO LIKE ?`;
                    params.push(keyword);
                } else {
                    // 전체 통합 검색 fallback
                    query += ` AND (u.USER_NM LIKE ? OR u.USER_ID LIKE ? OR u.HP_NO LIKE ?)`;
                    params.push(keyword, keyword, keyword);
                }
            }

            query += ` ORDER BY u.JOIN_DT DESC`;

            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch members error:', error);
            res.status(500).json({ error: '회원 목록 조회에 실패했습니다.' });
        }
    });

    // 8. 전체 여행 목록 조회 API (검색 필터 포함)
    router.get('/trips', async (req, res) => {
        try {
            const { searchType, searchKeyword, startDtFrom, startDtTo } = req.query;

            let query = `
                SELECT 
                    r.REQ_ID as reqId,
                    r.TRAVELER_ID as travelerId,
                    u.USER_NM as travelerName,
                    r.TRIP_TITLE as tripTitle,
                    r.START_ADDR as startAddr,
                    r.END_ADDR as endAddr,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDt,
                    DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDt,
                    r.PASSENGER_CNT as passengerCnt,
                    r.REQ_AMT as reqAmt,
                    r.DATA_STAT as dataStat,
                    r.PAYMENT_STS as paymentSts,
                    DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt
                FROM TB_AUCTION_REQ r
                LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
            `;
            const params = [];
            const conditions = [];

            // 출발일자 기간 필터
            if (startDtFrom && startDtFrom.trim()) {
                conditions.push(`DATE(r.START_DT) >= ?`);
                params.push(startDtFrom.trim());
            }
            if (startDtTo && startDtTo.trim()) {
                conditions.push(`DATE(r.START_DT) <= ?`);
                params.push(startDtTo.trim());
            }

            // 키워드 검색 필터
            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'tripTitle') {
                    conditions.push(`r.TRIP_TITLE LIKE ?`);
                    params.push(keyword);
                } else if (searchType === 'travelerName') {
                    conditions.push(`u.USER_NM LIKE ?`);
                    params.push(keyword);
                } else {
                    conditions.push(`(r.TRIP_TITLE LIKE ? OR u.USER_NM LIKE ?)`);
                    params.push(keyword, keyword);
                }
            }

            if (conditions.length > 0) {
                query += ` WHERE ` + conditions.join(` AND `);
            }

            query += ` ORDER BY r.REG_DT DESC`;

            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Admin Trips API Error:', error);
            res.status(500).json({ error: '여행 목록 조회 중 오류가 발생했습니다.' });
        }
    });

    // 8-1. 여정 상세 정보 조회 API (기사 응찰 현황, 문자 이력, 문의 내역, 거래제재 내역 포함)
    router.get('/trips/:reqId/details', async (req, res) => {
        try {
            const { reqId } = req.params;
            if (!reqId) {
                return res.status(400).json({ error: '요청 ID(reqId)가 필요합니다.' });
            }

            // 1. 여정 기본 정보 + 여행자 연락처 등 상세 정보 조회
            const [tripRows] = await pool.execute(
                `SELECT 
                    r.REQ_ID as reqId,
                    r.TRAVELER_ID as travelerId,
                    u.USER_NM as travelerName,
                    u.HP_NO as travelerPhone,
                    r.TRIP_TITLE as tripTitle,
                    r.START_ADDR as startAddr,
                    r.END_ADDR as endAddr,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDt,
                    DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDt,
                    r.PASSENGER_CNT as passengerCnt,
                    r.REQ_AMT as reqAmt,
                    r.DATA_STAT as dataStat,
                    r.PAYMENT_STS as paymentSts,
                    DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt
                 FROM TB_AUCTION_REQ r
                 LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
                 WHERE r.REQ_ID = ?`,
                [reqId]
            );

            if (tripRows.length === 0) {
                return res.status(404).json({ error: '해당 여정 요청을 찾을 수 없습니다.' });
            }
            const trip = tripRows[0];

            // 2. 기사 응찰 목록 조회
            const [bidRows] = await pool.execute(
                `SELECT 
                    br.RES_ID as resId,
                    br.REQ_BUS_SEQ as reqBusSeq,
                    br.DRIVER_ID as driverId,
                    u.USER_NM as driverName,
                    u.HP_NO as driverPhone,
                    v.VEHICLE_NO as vehicleNo,
                    v.MODEL_NM as modelNm,
                    br.DRIVER_BIDDING_PRICE as biddingPrice,
                    br.DATA_STAT as bidStat,
                    DATE_FORMAT(br.CONFIRM_DT, '%Y-%m-%d %H:%i') as confirmDt
                 FROM TB_BUS_RESERVATION br
                 LEFT JOIN TB_USER u ON br.DRIVER_ID = u.CUST_ID
                 LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON br.BUS_ID = v.BUS_ID
                 WHERE br.REQ_ID = ?
                 ORDER BY br.REG_DT DESC`,
                [reqId]
            );

            // 3. 여행자의 문의사항 최근 5건 조회
            const [inquiryRows] = await pool.execute(
                `SELECT 
                    INQ_SEQ as inqSeq,
                    INQ_CATEGORY as inqCategory,
                    TITLE as title,
                    CONTENT as content,
                    REPLY_CONTENT as replyContent,
                    INQ_STAT as inqStat,
                    DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i') as regDt
                 FROM TB_INQUIRY
                 WHERE CUST_ID = ?
                 ORDER BY REG_DT DESC
                 LIMIT 5`,
                [trip.travelerId]
            );

            // 4. 여행자의 누적 취소/거래제한 내역 조회
            const [cancelManageRows] = await pool.execute(
                `SELECT 
                    CUST_ID as custId,
                    CANCEL_CNT as cancelCnt,
                    TRADE_RESTRICT_YN as tradeRestrictYn,
                    RESTRICT_STAT as restrictStat,
                    DATE_FORMAT(RESTRICT_START_DT, '%Y-%m-%d %H:%i') as restrictStartDt,
                    DATE_FORMAT(RESTRICT_END_DT, '%Y-%m-%d %H:%i') as restrictEndDt
                 FROM TB_USER_CANCEL_MANAGE
                 WHERE CUST_ID = ?`,
                [trip.travelerId]
            );
            const cancelManage = cancelManageRows.length > 0 ? cancelManageRows[0] : {
                custId: trip.travelerId,
                cancelCnt: 0,
                tradeRestrictYn: 'N',
                restrictStat: 'N',
                restrictStartDt: null,
                restrictEndDt: null
            };

            // 5. 해당 여정 관련 SMS 발송 이력 조회
            const [smsRows] = await pool.execute(
                `SELECT 
                    LOG_SEQ as logSeq,
                    SEND_CATEGORY as sendCategory,
                    RECEIVER_PHONE as receiverPhone,
                    MSG_CONTENT as msgContent,
                    SEND_STAT as sendStat,
                    DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i') as regDt
                 FROM TB_SMS_LOG
                 WHERE REQ_ID = ?
                 ORDER BY REG_DT DESC`,
                [reqId]
            );

            res.status(200).json({
                trip,
                bids: bidRows,
                inquiries: inquiryRows,
                cancelManage,
                smsLogs: smsRows
            });
        } catch (error) {
            console.error('Admin Trip Details API Error:', error);
            res.status(500).json({ error: '여정 상세 정보 조회 중 오류가 발생했습니다.' });
        }
    });

    // 9. 추천인(내 로그인 아이디)으로 가입한 버스기사 목록 조회 API
    router.get('/my-customers', async (req, res) => {
        try {
            const { adminId } = req.query;
            if (!adminId) {
                return res.status(400).json({ error: '관리자 ID(adminId)가 필요합니다.' });
            }

            // RECOM_CODE = adminId 이고 USER_TYPE = 'DRIVER' 인 회원 목록 조회
            const query = `
                SELECT 
                    CUST_ID as custId,
                    USER_ID as userId,
                    USER_NM as userNm,
                    HP_NO as hpNo,
                    EMAIL as email,
                    USER_STAT as userStat,
                    RECOM_CODE as recomCode,
                    DATE_FORMAT(JOIN_DT, '%Y-%m-%d %H:%i') as joinDt
                FROM TB_USER
                WHERE USER_TYPE = 'DRIVER' AND TRIM(RECOM_CODE) = TRIM(?)
                ORDER BY JOIN_DT DESC
            `;
            const [rows] = await pool.execute(query, [adminId]);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch my-customers error:', error);
            res.status(500).json({ error: '추천 회원 목록 조회에 실패했습니다.' });
        }
    });

    // 10. 추천인(내 로그인 아이디)으로 가입한 버스기사들의 운행 실적 목록 조회 API
    router.get('/my-performance', async (req, res) => {
        try {
            const { adminId, perfYm } = req.query;
            if (!adminId) {
                return res.status(400).json({ error: '관리자 ID(adminId)가 필요합니다.' });
            }

            // perfYm이 있으면 CONFIRM_DT 월 필터 조건 추가
            const ymCondition = perfYm && perfYm.trim()
                ? `AND DATE_FORMAT(r.CONFIRM_DT, '%Y%m') = '${perfYm.trim().replace(/[^0-9]/g, '')}'`
                : '';

            // RECOM_CODE = adminId 인 버스 기사가 운행한 예약 내역 조회
            const query = `
                SELECT 
                    r.RES_ID as resId,
                    r.REQ_ID as reqId,
                    r.DRIVER_ID as driverId,
                    d.USER_NM as driverName,
                    d.USER_ID as driverUserId,
                    req.TRIP_TITLE as tripTitle,
                    t.USER_NM as travelerName,
                    r.DRIVER_BIDDING_PRICE as biddingPrice,
                    r.RES_FEE_TOTAL_AMT as feeTotalAmt,
                    r.DATA_STAT as dataStat,
                    DATE_FORMAT(r.CONFIRM_DT, '%Y-%m-%d %H:%i') as confirmDt,
                    DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt,
                    req.START_ADDR as startAddr,
                    req.END_ADDR as endAddr
                FROM TB_BUS_RESERVATION r
                INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                INNER JOIN TB_AUCTION_REQ req ON r.REQ_ID = req.REQ_ID
                LEFT JOIN TB_USER t ON req.TRAVELER_ID = t.CUST_ID
                WHERE TRIM(d.RECOM_CODE) = TRIM(?) ${ymCondition}
                ORDER BY r.CONFIRM_DT DESC
            `;
            const [rows] = await pool.execute(query, [adminId]);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch my-performance error:', error);
            res.status(500).json({ error: '운행 실적 목록 조회에 실패했습니다.' });
        }
    });


    // 11. 관리자 권한 및 정보 변경 API
    router.patch('/:adminId/status', async (req, res) => {
        try {
            const { adminId } = req.params;
            const { role, status, adminNm, deptNm, hpNo, email } = req.body;

            const sets = [];
            const params = [];

            if (role) {
                sets.push('ADMIN_GRADE = ?');
                params.push(role);
            }
            if (status) {
                sets.push('ADMIN_STAT = ?');
                params.push(status);
            }
            if (adminNm !== undefined) {
                sets.push('ADMIN_NM = ?');
                params.push(adminNm);
            }
            if (deptNm !== undefined) {
                sets.push('DEPT_NM = ?');
                params.push(deptNm);
            }
            if (hpNo !== undefined) {
                sets.push('HP_NO = ?');
                params.push(hpNo);
            }
            if (email !== undefined) {
                sets.push('EMAIL = ?');
                params.push(email);
            }

            if (sets.length === 0) {
                return res.status(400).json({ error: '변경할 정보가 입력되지 않았습니다.' });
            }

            params.push(adminId);

            const query = `UPDATE TB_ADMIN SET ${sets.join(', ')}, MOD_DT = NOW() WHERE ADMIN_ID = ?`;
            await pool.execute(query, params);

            res.status(200).json({ message: '관리자 정보가 성공적으로 업데이트되었습니다.' });
        } catch (error) {
            console.error('Update admin error:', error);
            res.status(500).json({ error: '관리자 정보 변경 중 서버 오류가 발생했습니다.' });
        }
    });

    // 12. 여정/입찰 정산 목록 조회 API (CONFIRM_DT 기준 매출 조회)
    router.get('/settlement', async (req, res) => {
        try {
            const { confirmDtFrom, confirmDtTo, searchType, searchKeyword } = req.query;

            const listParams = [];
            const conditions = [`br.DATA_STAT = 'CONFIRM'`];

            // 확정일자 기간 필터 (TB_BUS_RESERVATION.CONFIRM_DT 기준)
            if (confirmDtFrom && confirmDtFrom.trim()) {
                conditions.push(`DATE(br.CONFIRM_DT) >= ?`);
                listParams.push(confirmDtFrom.trim());
            }
            if (confirmDtTo && confirmDtTo.trim()) {
                conditions.push(`DATE(br.CONFIRM_DT) <= ?`);
                listParams.push(confirmDtTo.trim());
            }

            // 키워드 검색 필터
            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'tripTitle') {
                    conditions.push(`req.TRIP_TITLE LIKE ?`);
                    listParams.push(keyword);
                } else if (searchType === 'travelerName') {
                    conditions.push(`traveler.USER_NM LIKE ?`);
                    listParams.push(keyword);
                } else if (searchType === 'driverName') {
                    conditions.push(`driver.USER_NM LIKE ?`);
                    listParams.push(keyword);
                } else {
                    conditions.push(`(req.TRIP_TITLE LIKE ? OR traveler.USER_NM LIKE ? OR driver.USER_NM LIKE ?)`);
                    listParams.push(keyword, keyword, keyword);
                }
            }

            const whereClause = `WHERE ` + conditions.join(` AND `);

            // 목록 조회
            const listQuery = `
                SELECT
                    br.RES_ID                                          as resId,
                    br.REQ_ID                                          as reqId,
                    req.TRIP_TITLE                                     as tripTitle,
                    req.START_ADDR                                     as startAddr,
                    req.END_ADDR                                       as endAddr,
                    DATE_FORMAT(req.START_DT,    '%Y-%m-%d %H:%i')    as startDt,
                    traveler.USER_NM                                   as travelerName,
                    traveler.HP_NO                                     as travelerPhone,
                    driver.USER_NM                                     as driverName,
                    v.VEHICLE_NO                                       as vehicleNo,
                    br.DRIVER_BIDDING_PRICE                            as driverBiddingPrice,
                    br.RES_FEE_TOTAL_AMT                               as resFeeTotal,
                    DATE_FORMAT(br.CONFIRM_DT,   '%Y-%m-%d %H:%i')    as confirmDt
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
                LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
                LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
                LEFT  JOIN TB_BUS_DRIVER_VEHICLE v   ON br.BUS_ID      = v.BUS_ID
                ${whereClause}
                ORDER BY br.CONFIRM_DT DESC
            `;

            // 누적 합계 조회 (같은 조건)
            const summaryQuery = `
                SELECT
                    COUNT(*)                                        as totalCount,
                    IFNULL(SUM(req.REQ_AMT),          0)            as totalReqAmt,
                    IFNULL(SUM(req.REQ_AMT) * 0.06,   0)            as totalFee6pct
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
                LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
                LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
                ${whereClause}
            `;

            const [listRows]    = await pool.execute(listQuery,    listParams);
            const [summaryRows] = await pool.execute(summaryQuery, listParams);

            res.status(200).json({
                list:    listRows,
                summary: summaryRows[0] || { totalCount: 0, totalReqAmt: 0, totalFee6pct: 0 },
            });
        } catch (error) {
            console.error('Settlement API Error:', error);
            res.status(500).json({ error: '정산 데이터 조회 중 오류가 발생했습니다.' });
        }
    });

    // 13. 영업사원별 실적 집계 API
    router.get('/sales-performance', async (req, res) => {
        try {
            const { perfYm } = req.query; // 실적년월 (YYYYMM 형식, 예: 202505)

            // perfYm이 있으면 CONFIRM_DT 월 필터 조건 추가
            const ymCondition = perfYm && perfYm.trim()
                ? `AND DATE_FORMAT(r.CONFIRM_DT, '%Y%m') = '${perfYm.trim().replace(/[^0-9]/g, '')}' `
                : '';

            const query = `
                SELECT 
                    a.ADMIN_ID as adminId,
                    a.ADMIN_NM as adminName,
                    (SELECT COUNT(*) FROM TB_USER WHERE USER_TYPE = 'DRIVER' AND TRIM(RECOM_CODE) = TRIM(a.ADMIN_ID)) as driverCount,
                    (SELECT COUNT(*) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID) ${ymCondition}) as matchCount,
                    (SELECT IFNULL(SUM(r.DRIVER_BIDDING_PRICE), 0) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID) ${ymCondition}) as totalBidding,
                    (SELECT IFNULL(SUM(r.RES_FEE_TOTAL_AMT), 0) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID) ${ymCondition}) as totalFee
                FROM TB_ADMIN a
                WHERE a.ADMIN_GRADE = 'SALES'
                ORDER BY totalFee DESC, driverCount DESC
            `;
            const [rows] = await pool.execute(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Sales performance API error:', error);
            res.status(500).json({ error: '영업사원 실적 집계 중 오류가 발생했습니다.' });
        }
    });

    // 13. 버스기사 상세 정보 조회 API
    router.get('/drivers/:custId/details', async (req, res) => {
        try {
            const { custId } = req.params;

            // 1. 기사 기본 및 프로필 정보 (TB_DRIVER_DETAIL 실제 컬럼: SELF_INTRO, BIRTH_YMD, SEX, ADDRESS 등)
            const driverQuery = `
                SELECT 
                    u.CUST_ID as custId,
                    u.USER_ID as userId,
                    u.USER_NM as userNm,
                    u.HP_NO as hpNo,
                    u.EMAIL as email,
                    u.USER_TYPE as userType,
                    u.USER_STAT as userStat,
                    DATE_FORMAT(u.JOIN_DT, '%Y-%m-%d %H:%i') as joinDt,
                    d.SELF_INTRO as introText,
                    d.BIRTH_YMD as birthYmd,
                    d.SEX as sex,
                    d.ADDRESS as address,
                    d.DETAIL_ADDRESS as detailAddress,
                    (SELECT ROUND(AVG(r.STAR_RATING), 2) FROM TB_TRIP_REVIEW r WHERE r.DRIVER_ID = u.CUST_ID) as ratingAvg,
                    (SELECT COUNT(*) FROM TB_TRIP_REVIEW r WHERE r.DRIVER_ID = u.CUST_ID) as reviewCnt
                FROM TB_USER u
                LEFT JOIN TB_DRIVER_DETAIL d ON u.CUST_ID = d.CUST_ID
                WHERE u.CUST_ID = ? AND u.USER_TYPE = 'DRIVER'
            `;
            const [driverRows] = await pool.execute(driverQuery, [custId]);
            if (driverRows.length === 0) {
                return res.status(404).json({ error: '해당 버스기사 회원을 찾을 수 없습니다.' });
            }

            // 2. 버스 차량 정보
            const vehicleQuery = `
                SELECT 
                    BUS_ID as busId,
                    VEHICLE_NO as vehicleNo,
                    MODEL_NM as modelNm,
                    MANUFACTURE_YEAR as manufactureYear,
                    MILEAGE as mileage,
                    SERVICE_CLASS as serviceClass,
                    AMENITIES as amenities,
                    HAS_ADAS as hasAdas,
                    DATE_FORMAT(LAST_INSPECT_DT, '%Y-%m-%d') as lastInspectDt,
                    DATE_FORMAT(INSURANCE_EXP_DT, '%Y-%m-%d') as insuranceExpDt,
                    VEHICLE_PHOTOS_JSON as vehiclePhotosJson,
                    BIZ_REG_FILE_ID as bizRegFileId,
                    TRANS_LIC_FILE_ID as transLicFileId,
                    INS_CERT_FILE_ID as insCertFileId
                FROM TB_BUS_DRIVER_VEHICLE
                WHERE CUST_ID = ?
            `;
            const [vehicleRows] = await pool.execute(vehicleQuery, [custId]);

            // 3. 기사 평가/리뷰 정보 (최근 5건)
            const reviewsQuery = `
                SELECT 
                    r.RES_ID as resId,
                    r.REVIEW_SEQ as reviewSeq,
                    r.STAR_RATING as starRating,
                    r.COMMENT_TEXT as commentText,
                    r.REPLY_TEXT as replyText,
                    DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt,
                    u.USER_NM as writerName
                FROM TB_TRIP_REVIEW r
                LEFT JOIN TB_USER u ON r.WRITER_ID = u.CUST_ID
                WHERE r.DRIVER_ID = ?
                ORDER BY r.REG_DT DESC
                LIMIT 5
            `;
            const [reviewsRows] = await pool.execute(reviewsQuery, [custId]);

            // 4. 기사 청약 횟수 정보 (TB_MOM_MEMBER)
            const momMemberQuery = `
                SELECT 
                    CUST_ID as custId,
                    YYYYMM as yyyymm,
                    FEE_POLICY as feePolicy,
                    BASIC_CNT as basicCnt,
                    USE_CNT as useCnt,
                    REMAINING_CNT as remainingCnt,
                    DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i') as regDt
                FROM TB_MOM_MEMBER
                WHERE CUST_ID = ?
                ORDER BY YYYYMM DESC
            `;
            const [momMemberRows] = await pool.execute(momMemberQuery, [custId]);

            // 5. 기사 자격 서류 정보 조회 (TB_DRIVER_DOCS)
            const docsQuery = `
                SELECT 
                    d1.DOC_TYPE as docType,
                    d1.DOC_TYPE_SEQ as docTypeSeq,
                    d1.GCS_PATH as gcsPath,
                    d1.ORG_FILE_NM as orgFileNm,
                    d1.ORG_FILE_EXT as orgFileExt,
                    d1.FILE_SIZE as fileSize,
                    d1.LICENSE_TYPE_CD as licenseTypeCd,
                    d1.DOC_NO_ENC as docNoEnc,
                    DATE_FORMAT(d1.ISSUE_DT, '%Y-%m-%d') as issueDt,
                    DATE_FORMAT(d1.EXP_DT, '%Y-%m-%d') as expDt,
                    d1.APPROVE_STAT as approveStat,
                    d1.REJECT_REASON as rejectReason,
                    d1.APPROVER_ID as approverId,
                    DATE_FORMAT(d1.APPROVE_DT, '%Y-%m-%d %H:%i') as approveDt
                FROM TB_DRIVER_DOCS d1
                INNER JOIN (
                    SELECT CUST_ID, DOC_TYPE, MAX(DOC_TYPE_SEQ) as maxSeq
                    FROM TB_DRIVER_DOCS
                    WHERE CUST_ID = ?
                    GROUP BY CUST_ID, DOC_TYPE
                ) d2 ON d1.CUST_ID = d2.CUST_ID AND d1.DOC_TYPE = d2.DOC_TYPE AND d1.DOC_TYPE_SEQ = d2.maxSeq
            `;
            const [docRows] = await pool.execute(docsQuery, [custId]);
            
            const documents = docRows.map(row => {
                let docNo = '';
                if (row.docNoEnc) {
                    try {
                        docNo = decrypt(row.docNoEnc);
                    } catch (e) {
                        console.error(`Failed to decrypt docNoEnc for docType ${row.docType}:`, e.message);
                        docNo = row.docNoEnc;
                    }
                }
                return {
                    ...row,
                    docNo,
                    docNoEnc: undefined
                };
            });

            // 6. 차량 관련 서류 정보 추가 연동
            const vehicle = vehicleRows[0];
            if (vehicle) {
                const fileIds = [vehicle.bizRegFileId, vehicle.transLicFileId, vehicle.insCertFileId].filter(Boolean);
                if (fileIds.length > 0) {
                    const [fileRows] = await pool.execute(
                        `SELECT FILE_ID as fileId, GCS_PATH as gcsPath, ORG_FILE_NM as orgFileNm, FILE_EXT as orgFileExt, FILE_SIZE as fileSize 
                         FROM TB_FILE_MASTER 
                         WHERE FILE_ID IN (${fileIds.map(() => '?').join(',')})`,
                        fileIds
                    );
                    
                    fileRows.forEach(f => {
                        let type = '';
                        if (f.fileId === vehicle.bizRegFileId) type = 'VEHICLE_BIZ_REG';
                        else if (f.fileId === vehicle.transLicFileId) type = 'VEHICLE_TRANSPORT_PERMIT';
                        else if (f.fileId === vehicle.insCertFileId) type = 'VEHICLE_INSURANCE';
                        
                        if (type) {
                            documents.push({
                                docType: type,
                                docTypeSeq: 1,
                                gcsPath: f.gcsPath,
                                orgFileNm: f.orgFileNm,
                                orgFileExt: f.orgFileExt,
                                fileSize: f.fileSize,
                                licenseTypeCd: null,
                                docNo: 'VEHICLE-FILE',
                                issueDt: null,
                                expDt: null,
                                approveStat: 'APPROVE', // 차량 서류는 업로드 자체로 승인 간주
                                rejectReason: null,
                                approverId: null,
                                approveDt: null
                            });
                        }
                    });
                }
            }

            res.status(200).json({
                driver: driverRows[0],
                vehicle: vehicleRows[0] || null,
                reviews: reviewsRows,
                momMember: momMemberRows,
                documents: documents
            });
        } catch (error) {
            console.error('Driver details API error:', error);
            res.status(500).json({ error: '버스기사 상세 정보 조회 중 오류가 발생했습니다.' });
        }
    });

    // 14. 버스기사 서류 승인 API
    router.patch('/drivers/:custId/docs/:docType/:seq/approve', async (req, res) => {
        try {
            const { custId, docType, seq } = req.params;
            const approverId = 'ADMIN';

            const updateQuery = `
                UPDATE TB_DRIVER_DOCS 
                SET APPROVE_STAT = 'APPROVE',
                    REJECT_REASON = NULL,
                    APPROVER_ID = ?,
                    APPROVE_DT = NOW(),
                    MOD_ID = ?,
                    MOD_DT = NOW()
                WHERE CUST_ID = ? AND DOC_TYPE = ? AND DOC_TYPE_SEQ = ?
            `;
            const [result] = await pool.execute(updateQuery, [approverId, approverId, custId, docType, seq]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '해당 서류를 찾을 수 없거나 이미 업데이트되었습니다.' });
            }

            res.status(200).json({ success: true, message: '서류가 성공적으로 승인되었습니다.' });
        } catch (error) {
            console.error('Approve driver document error:', error);
            res.status(500).json({ error: '서류 승인 처리 중 오류가 발생했습니다.' });
        }
    });

    // 15. 버스기사 서류 반려 API
    router.patch('/drivers/:custId/docs/:docType/:seq/reject', async (req, res) => {
        try {
            const { custId, docType, seq } = req.params;
            const { rejectReason } = req.body;
            const approverId = 'ADMIN';

            if (!rejectReason || String(rejectReason).trim() === '') {
                return res.status(400).json({ error: '반려 사유를 입력해주세요.' });
            }

            const updateQuery = `
                UPDATE TB_DRIVER_DOCS 
                SET APPROVE_STAT = 'REJECT',
                    REJECT_REASON = ?,
                    APPROVER_ID = ?,
                    APPROVE_DT = NOW(),
                    MOD_ID = ?,
                    MOD_DT = NOW()
                WHERE CUST_ID = ? AND DOC_TYPE = ? AND DOC_TYPE_SEQ = ?
            `;
            const [result] = await pool.execute(updateQuery, [rejectReason, approverId, approverId, custId, docType, seq]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '해당 서류를 찾을 수 없거나 이미 업데이트되었습니다.' });
            }

            res.status(200).json({ success: true, message: '서류가 성공적으로 반려되었습니다.' });
        } catch (error) {
            console.error('Reject driver document error:', error);
            res.status(500).json({ error: '서류 반려 처리 중 오류가 발생했습니다.' });
        }
    });

    return router;
};

