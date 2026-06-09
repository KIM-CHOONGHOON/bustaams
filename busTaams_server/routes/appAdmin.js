const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { decrypt } = require('../crypto');

module.exports = (pool) => {
    // 1. 대시보드 KPI 현황 API (조회 전용)
    router.get('/dashboard/kpi', async (req, res) => {
        try {
            // 1. 견적 요청 대기 (AUCTION 상태)
            const [auctionRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ WHERE DATA_STAT = 'AUCTION'`
            );
            const auctionRequests = auctionRows[0]?.cnt || 0;

            // 전체 견적 요청 건수
            const [totalReqRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ`
            );
            const totalRequests = totalReqRows[0]?.cnt || 0;

            // 2. 진행 중인 입찰 (BIDDING 상태)
            const [bidRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ WHERE DATA_STAT = 'BIDDING'`
            );
            const activeBids = bidRows[0]?.cnt || 0;

            // 3. 확정된 예약 (CONFIRM 상태만 - 완료된 DONE 제외)
            const [confRows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_AUCTION_REQ WHERE DATA_STAT = 'CONFIRM'`
            );
            const confirmedReservations = confRows[0]?.cnt || 0;

            // 4. 신규 승인 대기 기사
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
                auctionRequests,
                totalRequests,
                activeBids,
                confirmedReservations,
                pendingDrivers
            });
        } catch (error) {
            console.error('Admin Dashboard KPI Error:', error);
            res.status(200).json({
                auctionRequests: 0,
                totalRequests: 0,
                activeBids: 0,
                confirmedReservations: 0,
                pendingDrivers: 0
            });
        }
    });

    // 1-1. 대시보드 최근 7일간 트렌드 조회 API
    router.get('/dashboard/trend', async (req, res) => {
        try {
            const query = `
                SELECT 
                    DATE_FORMAT(d.dt, '%m-%d') as date,
                    IFNULL((SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE DATE(REG_DT) = d.dt), 0) as requests,
                    IFNULL((SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE DATA_STAT = 'CONFIRM' AND DATE(REG_DT) = d.dt), 0) as confirmed
                FROM (
                    SELECT CURDATE() - INTERVAL 6 DAY as dt UNION ALL
                    SELECT CURDATE() - INTERVAL 5 DAY UNION ALL
                    SELECT CURDATE() - INTERVAL 4 DAY UNION ALL
                    SELECT CURDATE() - INTERVAL 3 DAY UNION ALL
                    SELECT CURDATE() - INTERVAL 2 DAY UNION ALL
                    SELECT CURDATE() - INTERVAL 1 DAY UNION ALL
                    SELECT CURDATE()
                ) d
            `;
            const [rows] = await pool.execute(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Admin Dashboard Trend Error:', error);
            res.status(500).json({ error: '트렌드 데이터 조회 실패' });
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
                    BANK_NM as bankNm,
                    ACCT_NO as acctNo,
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
            const { adminId, adminNm, deptNm, hpNo, email, role, registeredBy } = req.body;
            
            if (!adminId || !adminNm || !hpNo) {
                return res.status(400).json({ error: '아이디, 이름, 휴대폰 번호는 필수 입력 항목입니다.' });
            }

            // 중복 아이디 체크
            const [existRows] = await pool.execute(
                `SELECT 1 FROM TB_ADMIN WHERE ADMIN_ID = ?`,
                [adminId]
            );
            if (existRows.length > 0) {
                return res.status(400).json({ error: '이미 존재하는 관리자 ID입니다.' });
            }

            // 휴대폰 번호 뒷 4자리 추출하여 임시 비밀번호 설정
            let tempPassword = '';
            const cleanedHp = hpNo.replace(/[^0-9]/g, '');
            if (cleanedHp.length >= 4) {
                tempPassword = cleanedHp.slice(-4);
            } else {
                // 휴대폰 번호가 4자리 미만일 때 Fallback 예외 처리
                tempPassword = adminId.length >= 4 ? adminId.slice(-4) : '1234';
            }

            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            const adminGrade = role || 'MANAGER'; // SUPER, MANAGER, SALES 중 하나
            const regId = registeredBy || adminId || 'SYSTEM'; // 등록자 ID

            // PWD_CHG_DT를 NULL로 명시적 입력하여 최초 로그인 비밀번호 변경 대상 상태로 등록
            // 단, SALES(영업사원) 등급인 경우에는 강제 비밀번호 변경을 거치지 않으므로 PWD_CHG_DT를 NOW()로 등록
            const pwdChgDtVal = adminGrade === 'SALES' ? 'NOW()' : 'NULL';
            const { bankNm, acctNo } = req.body;

            await pool.execute(
                `INSERT INTO TB_ADMIN (
                    ADMIN_ID, PASSWORD, ADMIN_NM, DEPT_NM, ADMIN_GRADE, HP_NO, EMAIL, ADMIN_STAT,
                    REG_DT, REG_ID, MOD_DT, MOD_ID, PWD_CHG_DT, BANK_NM, ACCT_NO
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?, NOW(), ?, ${pwdChgDtVal}, ?, ?)`,
                [adminId, hashedPassword, adminNm, deptNm || null, adminGrade, hpNo || null, email || null, regId, regId, bankNm || null, acctNo || null]
            );

            res.status(201).json({ 
                message: '관리자가 성공적으로 등록되었습니다.',
                tempPassword: tempPassword
            });
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

            // PWD_CHG_DT가 NULL인지 확인하여 최초 로그인(비밀번호 변경 필요) 감지
            // 단, SALES(영업사원) 등급은 최초 로그인 시 비밀번호 변경 강제가 없으므로 requirePasswordChange를 false로 처리
            const requirePasswordChange = adminObj.ADMIN_GRADE === 'SALES' ? false : (adminObj.PWD_CHG_DT === null);

            // 비밀번호 변경이 불필요한 경우에만 최종 로그인 시각 업데이트
            if (!requirePasswordChange) {
                await pool.execute(
                    `UPDATE TB_ADMIN SET LAST_LOGIN_DT = CURRENT_TIMESTAMP WHERE ADMIN_ID = ?`,
                    [adminId]
                );
            }

            res.status(200).json({
                message: requirePasswordChange ? '로그인 성공 (비밀번호 변경 필요)' : '로그인 성공',
                requirePasswordChange,
                admin: {
                    adminId: adminObj.ADMIN_ID,
                    adminNm: adminObj.ADMIN_NM,
                    deptNm: adminObj.DEPT_NM,
                    hpNo: adminObj.HP_NO,
                    email: adminObj.EMAIL,
                    role: adminObj.ADMIN_GRADE,
                    bankNm: adminObj.BANK_NM,
                    acctNo: adminObj.ACCT_NO
                }
            });
        } catch (error) {
            console.error('Login API Error:', error);
            res.status(500).json({ error: '로그인 처리 중 서버 오류가 발생했습니다.' });
        }
    });

    // 4-1. 관리자 비밀번호 변경 API
    router.post('/change-password', async (req, res) => {
        try {
            const { adminId, currentPassword, newPassword } = req.body;
            if (!adminId || !currentPassword || !newPassword) {
                return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다.' });
            }

            const [rows] = await pool.execute(
                `SELECT * FROM TB_ADMIN WHERE ADMIN_ID = ?`,
                [adminId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: '존재하지 않는 관리자입니다.' });
            }

            const adminObj = rows[0];

            // 현재 비밀번호 검증
            const isMatch = await bcrypt.compare(currentPassword, adminObj.PASSWORD);
            if (!isMatch) {
                return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
            }

            // 새 비밀번호 해싱 및 업데이트
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await pool.execute(
                `UPDATE TB_ADMIN 
                 SET PASSWORD = ?, PWD_CHG_DT = NOW(), LAST_LOGIN_DT = CURRENT_TIMESTAMP, MOD_DT = NOW(), MOD_ID = ?
                 WHERE ADMIN_ID = ?`,
                [hashedNewPassword, adminId, adminId]
            );

            res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
        } catch (error) {
            console.error('Change Password API Error:', error);
            res.status(500).json({ error: '비밀번호 변경 처리 중 서버 오류가 발생했습니다.' });
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
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as destAddr,
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
                        u.RECOM_CODE as recomCode,
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
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as destAddr,
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

            const [tripRows] = await pool.execute(
                `SELECT 
                    r.REQ_ID as reqId,
                    r.TRAVELER_ID as travelerId,
                    u.USER_NM as travelerName,
                    u.HP_NO as travelerPhone,
                    r.TRIP_TITLE as tripTitle,
                    r.START_ADDR as startAddr,
                    r.END_ADDR as endAddr,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as destAddr,
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

            // 4-2. 요청한 버스 스펙 조회 (TB_AUCTION_REQ_BUS)
            const [busRows] = await pool.execute(
                `SELECT 
                    ab.REQ_BUS_SEQ as reqBusSeq,
                    ab.BUS_TYPE_CD as busTypeCd,
                    cc.CD_NM_KO as busTypeNm,
                    ab.DATA_STAT as dataStat,
                    ab.RES_BUS_AMT as resBusAmt
                 FROM TB_AUCTION_REQ_BUS ab
                 LEFT JOIN TB_COMMON_CODE cc ON cc.GRP_CD = 'BUS_TYPE' AND cc.DTL_CD = ab.BUS_TYPE_CD
                 WHERE ab.REQ_ID = ?`,
                [reqId]
            );

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
                buses: busRows,
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
                    req.END_ADDR as endAddr,
                    dd.FEE_POLICY as feePolicy
                FROM TB_BUS_RESERVATION r
                INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
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
            const { role, status, adminNm, deptNm, hpNo, email, modifiedBy, bankNm, acctNo } = req.body;

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
            if (bankNm !== undefined) {
                sets.push('BANK_NM = ?');
                params.push(bankNm);
            }
            if (acctNo !== undefined) {
                sets.push('ACCT_NO = ?');
                params.push(acctNo);
            }

            // MOD_ID 기록
            const modId = modifiedBy || 'SYSTEM';
            sets.push('MOD_ID = ?');
            params.push(modId);

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
            const conditions = [`req.DATA_STAT = 'DONE'`];

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
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = req.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as destAddr,
                    DATE_FORMAT(req.START_DT,    '%Y-%m-%d %H:%i')    as startDt,
                    traveler.USER_NM                                   as travelerName,
                    traveler.HP_NO                                     as travelerPhone,
                    driver.USER_NM                                     as driverName,
                    v.VEHICLE_NO                                       as vehicleNo,
                    br.DRIVER_BIDDING_PRICE                            as driverBiddingPrice,
                    br.RES_FEE_TOTAL_AMT                               as resFeeTotal,
                    DATE_FORMAT(br.CONFIRM_DT,   '%Y-%m-%d %H:%i')    as confirmDt,
                    driver.RECOM_CODE                                  as recomCode,
                    dd.FEE_POLICY                                      as feePolicy,
                    CASE 
                        WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                        THEN br.DRIVER_BIDDING_PRICE * 0.055
                        ELSE 0
                    END as driverPayout,
                    CASE 
                        WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                        THEN br.DRIVER_BIDDING_PRICE * 0.011
                        ELSE br.DRIVER_BIDDING_PRICE * 0.066
                    END as platformFee,
                    CASE 
                        WHEN driver.RECOM_CODE IS NOT NULL AND TRIM(driver.RECOM_CODE) != ''
                        THEN 
                            CASE 
                                WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                                THEN br.DRIVER_BIDDING_PRICE * 0.106
                                ELSE br.DRIVER_BIDDING_PRICE * 0.066
                            END
                        ELSE 0
                    END as salesCommission
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
                LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
                LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
                LEFT  JOIN TB_DRIVER_DETAIL dd       ON br.DRIVER_ID   = dd.CUST_ID
                LEFT  JOIN TB_BUS_DRIVER_VEHICLE v   ON br.BUS_ID      = v.BUS_ID
                ${whereClause}
                ORDER BY br.CONFIRM_DT DESC
            `;

            // 누적 합계 조회 (같은 조건)
            const summaryQuery = `
                SELECT
                    COUNT(*)                                        as totalCount,
                    IFNULL(SUM(br.DRIVER_BIDDING_PRICE), 0)         as totalBiddingPrice,
                    IFNULL(SUM(
                        CASE 
                            WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                            THEN br.DRIVER_BIDDING_PRICE * 0.055
                            ELSE 0
                        END
                    ), 0) as totalDriverPayout,
                    IFNULL(SUM(
                        CASE 
                            WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                            THEN br.DRIVER_BIDDING_PRICE * 0.011
                            ELSE br.DRIVER_BIDDING_PRICE * 0.066
                        END
                    ), 0) as totalPlatformFee,
                    IFNULL(SUM(
                        CASE 
                            WHEN driver.RECOM_CODE IS NOT NULL AND TRIM(driver.RECOM_CODE) != ''
                            THEN 
                                CASE 
                                    WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                                    THEN br.DRIVER_BIDDING_PRICE * 0.106
                                    ELSE br.DRIVER_BIDDING_PRICE * 0.066
                                END
                            ELSE 0
                        END
                    ), 0) as totalSalesCommission
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ   req      ON br.REQ_ID      = req.REQ_ID
                LEFT  JOIN TB_USER          traveler ON req.TRAVELER_ID = traveler.CUST_ID
                LEFT  JOIN TB_USER          driver   ON br.DRIVER_ID   = driver.CUST_ID
                LEFT  JOIN TB_DRIVER_DETAIL dd       ON br.DRIVER_ID   = dd.CUST_ID
                ${whereClause}
            `;

            const [listRows]    = await pool.execute(listQuery,    listParams);
            const [summaryRows] = await pool.execute(summaryQuery, listParams);

            // 기사 정액제 매출 조회 조건 생성
            const payConditions = [`ph.PAY_STAT = 'SUCCESS'`];
            const payParams = [];

            if (confirmDtFrom && confirmDtFrom.trim()) {
                payConditions.push(`DATE(ph.PAY_COMPLETED_DT) >= ?`);
                payParams.push(confirmDtFrom.trim());
            }
            if (confirmDtTo && confirmDtTo.trim()) {
                payConditions.push(`DATE(ph.PAY_COMPLETED_DT) <= ?`);
                payParams.push(confirmDtTo.trim());
            }

            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'driverName') {
                    payConditions.push(`d.USER_NM LIKE ?`);
                    payParams.push(keyword);
                } else if (searchType === 'travelerName' || searchType === 'tripTitle') {
                    // 이 카테고리는 기사 정액제 매출에 매칭되지 않으므로 결과를 리턴하지 않게 만듬
                    payConditions.push(`1 = 0`);
                } else {
                    payConditions.push(`d.USER_NM LIKE ?`);
                    payParams.push(keyword);
                }
            }

            const payWhereClause = `WHERE ` + payConditions.join(` AND `);
            const payListQuery = `
                SELECT
                    ph.PAY_HIST_SEQ as payHistSeq,
                    ph.DRIVER_ID as driverId,
                    d.USER_NM as driverName,
                    d.HP_NO as driverPhone,
                    ph.BILLING_YYYYMM as billingYyyymm,
                    ph.PAY_AMT as payAmt,
                    ph.PAY_STAT as payStat,
                    DATE_FORMAT(ph.PAY_COMPLETED_DT, '%Y-%m-%d %H:%i') as payCompletedDt,
                    ph.CARD_NICKNAME_SNAPSHOT as cardNickname,
                    ph.CARD_LAST_FOUR_SNAPSHOT as cardLastFour,
                    dd.FEE_POLICY as feePolicy,
                    cc.CD_NM_KO as feePolicyLabel
                FROM TB_DRIVER_PAYMENT_HIST ph
                INNER JOIN TB_USER d ON ph.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
                LEFT JOIN TB_COMMON_CODE cc ON cc.GRP_CD = 'FEE_POLICY' AND cc.DTL_CD = dd.FEE_POLICY
                ${payWhereClause}
                ORDER BY ph.PAY_COMPLETED_DT DESC
            `;

            const paySummaryQuery = `
                SELECT
                    COUNT(*) as totalCount,
                    IFNULL(SUM(ph.PAY_AMT), 0) as totalAmt
                FROM TB_DRIVER_PAYMENT_HIST ph
                INNER JOIN TB_USER d ON ph.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
                ${payWhereClause}
            `;

            const [payListRows] = await pool.execute(payListQuery, payParams);
            const [paySummaryRows] = await pool.execute(paySummaryQuery, payParams);

            res.status(200).json({
                list:    listRows,
                summary: summaryRows[0] || { totalCount: 0, totalBiddingPrice: 0, totalDriverPayout: 0, totalPlatformFee: 0, totalSalesCommission: 0 },
                subscriptionList: payListRows,
                subscriptionSummary: paySummaryRows[0] || { totalCount: 0, totalAmt: 0 }
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
                    (SELECT IFNULL(SUM(
                        CASE 
                            WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                            THEN r.DRIVER_BIDDING_PRICE * 0.106
                            ELSE r.DRIVER_BIDDING_PRICE * 0.066
                        END
                     ), 0) 
                     FROM TB_BUS_RESERVATION r 
                     INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' 
                     LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
                     WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID) ${ymCondition}) as totalFee
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

    // 16. 영업사원(SALES) 목록 조회 API (추천인 등록용)
    router.get('/sales-agents', async (req, res) => {
        try {
            const { searchKeyword } = req.query;
            let query = `SELECT ADMIN_ID as adminId, ADMIN_NM as adminName, DEPT_NM as deptNm FROM TB_ADMIN WHERE ADMIN_GRADE = 'SALES' AND ADMIN_STAT = 'ACTIVE'`;
            const params = [];
            if (searchKeyword && searchKeyword.trim()) {
                query += ` AND (ADMIN_ID LIKE ? OR ADMIN_NM LIKE ?)`;
                params.push(`%${searchKeyword.trim()}%`, `%${searchKeyword.trim()}%`);
            }
            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch sales agents error:', error);
            res.status(500).json({ error: '영업사원 목록 조회에 실패했습니다.' });
        }
    });

    // 17. 버스기사 추천인 등록 API
    router.patch('/drivers/:custId/recommender', async (req, res) => {
        try {
            const { custId } = req.params;
            const { recomCode } = req.body;
            if (!recomCode) {
                return res.status(400).json({ error: '추천인 ID가 누락되었습니다.' });
            }
            // Check if the recommender code exists and is a SALES admin
            const [adminRows] = await pool.execute(
                `SELECT ADMIN_ID FROM TB_ADMIN WHERE ADMIN_ID = ? AND ADMIN_GRADE = 'SALES' AND ADMIN_STAT = 'ACTIVE'`,
                [recomCode]
            );
            if (adminRows.length === 0) {
                return res.status(400).json({ error: '유효한 영업사원(SALES) ID가 아닙니다.' });
            }

            // Update user's recomCode
            await pool.execute(
                `UPDATE TB_USER SET RECOM_CODE = ?, MOD_DT = NOW() WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'`,
                [recomCode, custId]
            );

            res.status(200).json({ message: '추천인이 성공적으로 등록되었습니다.' });
        } catch (error) {
            console.error('Register recommender error:', error);
            res.status(500).json({ error: '추천인 등록 중 오류가 발생했습니다.' });
        }
    });

    // 18. 공통 코드 그룹 목록 조회 API
    router.get('/common-codes/groups', async (req, res) => {
        try {
            const query = `
                SELECT 
                    GRP_CD as grpCd,
                    MAX(CD_NM_KO) as grpNm,
                    COUNT(*) as codeCount
                FROM TB_COMMON_CODE
                GROUP BY GRP_CD
                ORDER BY GRP_CD ASC
            `;
            const [rows] = await pool.execute(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch common code groups error:', error);
            res.status(500).json({ error: '공통 코드 그룹 목록 조회에 실패했습니다.' });
        }
    });

    // 18-2. 공통 코드 목록 조회 API
    router.get('/common-codes', async (req, res) => {
        try {
            const { searchType, searchKeyword, grpCd } = req.query;
            let query = `
                SELECT 
                    GRP_CD as grpCd,
                    DTL_CD as dtlCd,
                    CD_NM_KO as cdNmKo,
                    CD_NM_EN as cdNmEn,
                    CD_FNUM as cdFnum,
                    CD_TNUM as cdTnum,
                    USE_YN as useYn,
                    DISP_ORD as dispOrd,
                    CD_DESC as cdDesc,
                    DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i') as regDt,
                    REG_ID as regId,
                    DATE_FORMAT(MOD_DT, '%Y-%m-%d %H:%i') as modDt,
                    MOD_ID as modId
                FROM TB_COMMON_CODE
            `;
            const params = [];
            const conditions = [];

            if (grpCd && grpCd.trim()) {
                conditions.push('GRP_CD = ?');
                params.push(grpCd.trim());
            }

            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'grpCd') {
                    conditions.push('GRP_CD LIKE ?');
                    params.push(keyword);
                } else if (searchType === 'cdNmKo') {
                    conditions.push('CD_NM_KO LIKE ?');
                    params.push(keyword);
                } else {
                    conditions.push('(GRP_CD LIKE ? OR DTL_CD LIKE ? OR CD_NM_KO LIKE ?)');
                    params.push(keyword, keyword, keyword);
                }
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY GRP_CD ASC, DISP_ORD ASC, DTL_CD ASC';

            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch common codes error:', error);
            res.status(500).json({ error: '공통 코드 목록 조회에 실패했습니다.' });
        }
    });

    // 18-3. 공통 코드 일괄(그룹-하위코드 세트) 등록 API
    router.post('/common-codes/bulk', async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { grpCd, grpDesc, codes, regId } = req.body;

            if (!grpCd || !grpCd.trim() || !codes || !Array.isArray(codes) || codes.length === 0) {
                return res.status(400).json({ error: '그룹 코드와 최소 1개 이상의 하위 코드 정보가 필요합니다.' });
            }

            await connection.beginTransaction();

            const creator = regId || 'ADMIN';
            const grp = grpCd.toUpperCase().trim();

            for (const item of codes) {
                const { dtlCd, cdNmKo, cdNmEn, cdFnum, cdTnum, useYn, dispOrd, cdDesc } = item;
                if (!dtlCd || !dtlCd.trim() || !cdNmKo || !cdNmKo.trim()) {
                    throw new Error('하위 코드의 상세코드와 한글명은 필수 입력 항목입니다.');
                }

                const dtl = dtlCd.toUpperCase().trim();

                // 중복 검사
                const [existRows] = await connection.execute(
                    'SELECT 1 FROM TB_COMMON_CODE WHERE GRP_CD = ? AND DTL_CD = ?',
                    [grp, dtl]
                );

                if (existRows.length > 0) {
                    throw new Error(`이미 존재하는 코드 조합입니다. (그룹: ${grp}, 상세: ${dtl})`);
                }

                const insertQuery = `
                    INSERT INTO TB_COMMON_CODE (
                        GRP_CD, DTL_CD, CD_NM_KO, CD_NM_EN, CD_FNUM, CD_TNUM, USE_YN, DISP_ORD, CD_DESC, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                `;

                await connection.execute(insertQuery, [
                    grp,
                    dtl,
                    cdNmKo.trim(),
                    cdNmEn ? cdNmEn.trim() : null,
                    cdFnum || 0,
                    cdTnum || 0,
                    useYn || 'Y',
                    dispOrd || 0,
                    cdDesc || grpDesc || null,
                    creator,
                    creator
                ]);
            }

            await connection.commit();
            res.status(200).json({ success: true, message: '공통 코드 그룹 및 하위 코드 세트가 성공적으로 등록되었습니다.' });
        } catch (error) {
            await connection.rollback();
            console.error('Insert bulk common codes error:', error);
            res.status(500).json({ error: error.message || '공통 코드 일괄 등록 중 오류가 발생했습니다.' });
        } finally {
            connection.release();
        }
    });

    // 19. 공통 코드 추가 API
    router.post('/common-codes', async (req, res) => {
        try {
            const { grpCd, dtlCd, cdNmKo, cdNmEn, cdFnum, cdTnum, useYn, dispOrd, cdDesc, regId } = req.body;

            if (!grpCd || !dtlCd || !cdNmKo) {
                return res.status(400).json({ error: '그룹 코드, 상세 코드, 코드 한글명은 필수 입력 항목입니다.' });
            }

            // 중복 검사
            const [existRows] = await pool.execute(
                'SELECT 1 FROM TB_COMMON_CODE WHERE GRP_CD = ? AND DTL_CD = ?',
                [grpCd, dtlCd]
            );

            if (existRows.length > 0) {
                return res.status(400).json({ error: '이미 존재하는 그룹 코드와 상세 코드의 조합입니다.' });
            }

            const query = `
                INSERT INTO TB_COMMON_CODE (
                    GRP_CD, DTL_CD, CD_NM_KO, CD_NM_EN, CD_FNUM, CD_TNUM, USE_YN, DISP_ORD, CD_DESC, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
            `;

            await pool.execute(query, [
                grpCd.trim(),
                dtlCd.trim(),
                cdNmKo.trim(),
                cdNmEn ? cdNmEn.trim() : null,
                cdFnum || 0,
                cdTnum || 0,
                useYn || 'Y',
                dispOrd || 0,
                cdDesc || null,
                regId || 'ADMIN',
                regId || 'ADMIN'
            ]);

            res.status(200).json({ success: true, message: '공통 코드가 성공적으로 등록되었습니다.' });
        } catch (error) {
            console.error('Insert common code error:', error);
            res.status(500).json({ error: '공통 코드 등록 중 오류가 발생했습니다.' });
        }
    });

    // 20. 공통 코드 수정 API
    router.put('/common-codes/:grpCd/:dtlCd', async (req, res) => {
        try {
            const { grpCd, dtlCd } = req.params;
            const { cdNmKo, cdNmEn, cdFnum, cdTnum, useYn, dispOrd, cdDesc, modId } = req.body;

            if (!cdNmKo) {
                return res.status(400).json({ error: '코드 한글명은 필수 입력 항목입니다.' });
            }

            const query = `
                UPDATE TB_COMMON_CODE SET
                    CD_NM_KO = ?,
                    CD_NM_EN = ?,
                    CD_FNUM = ?,
                    CD_TNUM = ?,
                    USE_YN = ?,
                    DISP_ORD = ?,
                    CD_DESC = ?,
                    MOD_DT = NOW(),
                    MOD_ID = ?
                WHERE GRP_CD = ? AND DTL_CD = ?
            `;

            const [result] = await pool.execute(query, [
                cdNmKo.trim(),
                cdNmEn ? cdNmEn.trim() : null,
                cdFnum || 0,
                cdTnum || 0,
                useYn || 'Y',
                dispOrd || 0,
                cdDesc || null,
                modId || 'ADMIN',
                grpCd,
                dtlCd
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '해당 공통 코드를 찾을 수 없습니다.' });
            }

            res.status(200).json({ success: true, message: '공통 코드가 성공적으로 수정되었습니다.' });
        } catch (error) {
            console.error('Update common code error:', error);
            res.status(500).json({ error: '공통 코드 수정 중 오류가 발생했습니다.' });
        }
    });

    // 21. 공통 코드 삭제 API
    router.delete('/common-codes/:grpCd/:dtlCd', async (req, res) => {
        try {
            const { grpCd, dtlCd } = req.params;

            const [result] = await pool.execute(
                'DELETE FROM TB_COMMON_CODE WHERE GRP_CD = ? AND DTL_CD = ?',
                [grpCd, dtlCd]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '해당 공통 코드를 찾을 수 없습니다.' });
            }

            res.status(200).json({ success: true, message: '공통 코드가 성공적으로 삭제되었습니다.' });
        } catch (error) {
            console.error('Delete common code error:', error);
            res.status(500).json({ error: '공통 코드 삭제 중 오류가 발생했습니다.' });
        }
    });

    // =========================================================================
    // [세금계산서 관리 API]
    // =========================================================================

    // 22. 발행 완료된 세금계산서 목록 조회 API
    router.get('/tax-invoices', async (req, res) => {
        try {
            const { yyyyMM, targetType, searchKeyword } = req.query;
            let query = `
                SELECT 
                    TAX_INVOICE_ID as taxInvoiceId,
                    TARGET_TYPE as targetType,
                    TARGET_ID as targetId,
                    YYYYMM as yyyyMM,
                    SUPPLY_AMT as supplyAmt,
                    TAX_AMT as taxAmt,
                    TOTAL_AMT as totalAmt,
                    INVOICE_STAT as invoiceStat,
                    SUPPLIER_BIZ_NO as supplierBizNo,
                    SUPPLIER_NM as supplierNm,
                    SUPPLIER_CEO as supplierCeo,
                    SUPPLIER_ADDR as supplierAddr,
                    SUPPLIER_BIZ_TYPE as supplierBizType,
                    SUPPLIER_ITEM as supplierItem,
                    NTS_APPROVE_NO as ntsApproveNo,
                    DATE_FORMAT(ISSUE_DT, '%Y-%m-%d %H:%i:%s') as issueDt,
                    REMARKS as remarks
                FROM TB_TAX_INVOICE
                WHERE 1=1
            `;
            const params = [];

            if (yyyyMM && yyyyMM.trim()) {
                query += ` AND YYYYMM = ?`;
                params.push(yyyyMM.trim().replace(/[^0-9]/g, ''));
            }
            if (targetType && targetType.trim()) {
                query += ` AND TARGET_TYPE = ?`;
                params.push(targetType.trim());
            }
            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                query += ` AND (SUPPLIER_NM LIKE ? OR SUPPLIER_BIZ_NO LIKE ? OR SUPPLIER_CEO LIKE ?)`;
                params.push(keyword, keyword, keyword);
            }

            query += ` ORDER BY REG_DT DESC`;

            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Fetch tax invoices error:', error);
            res.status(500).json({ error: '세금계산서 목록 조회 중 오류가 발생했습니다.' });
        }
    });

    // 23. 특정 월의 수당 기준, 세금계산서 미발행/대상자 목록 조회 API
    router.get('/tax-invoices/unissued', async (req, res) => {
        try {
            const { yyyyMM } = req.query;
            if (!yyyyMM || !yyyyMM.trim()) {
                return res.status(400).json({ error: '조회 귀속월(yyyyMM)은 필수 항목입니다.' });
            }
            const cleanYm = yyyyMM.trim().replace(/[^0-9]/g, '');

            // 1) 운전기사 미발행 대상자 조회
            const driverQuery = `
                SELECT 
                    'DRIVER' as targetType,
                    d.CUST_ID as targetId,
                    d.USER_NM as targetName,
                    d.HP_NO as hpNo,
                    d.EMAIL as email,
                    dd.FEE_POLICY as feePolicy,
                    cc.CD_NM_KO as feePolicyLabel,
                    SUM(br.DRIVER_BIDDING_PRICE) as totalBiddingPrice,
                    SUM(br.DRIVER_BIDDING_PRICE * 0.055) as allowanceAmt,
                    pbi.BIZ_NO as supplierBizNo,
                    pbi.BIZ_NM as supplierNm,
                    pbi.CEO_NM as supplierCeo,
                    pbi.BIZ_ADDR as supplierAddr,
                    pbi.BIZ_TYPE as supplierBizType,
                    pbi.BIZ_ITEM as supplierItem
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ req ON br.REQ_ID = req.REQ_ID AND req.DATA_STAT = 'DONE'
                INNER JOIN TB_USER d ON br.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
                LEFT JOIN TB_COMMON_CODE cc ON cc.GRP_CD = 'FEE_POLICY' AND cc.DTL_CD = dd.FEE_POLICY
                LEFT JOIN TB_PARTNER_BIZ_INFO pbi ON pbi.TARGET_TYPE = 'DRIVER' AND pbi.TARGET_ID = d.CUST_ID
                LEFT JOIN TB_TAX_INVOICE ti ON ti.TARGET_TYPE = 'DRIVER' AND ti.TARGET_ID = d.CUST_ID AND ti.YYYYMM = ? AND ti.INVOICE_STAT != 'CANCELLED'
                WHERE dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH')
                  AND DATE_FORMAT(br.CONFIRM_DT, '%Y%m') = ?
                  AND ti.TAX_INVOICE_ID IS NULL
                GROUP BY d.CUST_ID, d.USER_NM, d.HP_NO, d.EMAIL, dd.FEE_POLICY, cc.CD_NM_KO,
                         pbi.BIZ_NO, pbi.BIZ_NM, pbi.CEO_NM, pbi.BIZ_ADDR, pbi.BIZ_TYPE, pbi.BIZ_ITEM
            `;

            // 2) 영업사원 미발행 대상자 조회
            const salesQuery = `
                SELECT 
                    'SALES' as targetType,
                    a.ADMIN_ID as targetId,
                    a.ADMIN_NM as targetName,
                    a.HP_NO as hpNo,
                    a.EMAIL as email,
                    'SALES' as feePolicy,
                    '영업사원' as feePolicyLabel,
                    SUM(br.DRIVER_BIDDING_PRICE) as totalBiddingPrice,
                    SUM(
                        CASE 
                            WHEN dd.FEE_POLICY IN ('DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH') 
                            THEN br.DRIVER_BIDDING_PRICE * 0.106
                            ELSE br.DRIVER_BIDDING_PRICE * 0.066
                        END
                    ) as allowanceAmt,
                    pbi.BIZ_NO as supplierBizNo,
                    pbi.BIZ_NM as supplierNm,
                    pbi.CEO_NM as supplierCeo,
                    pbi.BIZ_ADDR as supplierAddr,
                    pbi.BIZ_TYPE as supplierBizType,
                    pbi.BIZ_ITEM as supplierItem
                FROM TB_BUS_RESERVATION br
                INNER JOIN TB_AUCTION_REQ req ON br.REQ_ID = req.REQ_ID AND req.DATA_STAT = 'DONE'
                INNER JOIN TB_USER d ON br.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
                LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
                INNER JOIN TB_ADMIN a ON TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID) AND a.ADMIN_GRADE = 'SALES'
                LEFT JOIN TB_PARTNER_BIZ_INFO pbi ON pbi.TARGET_TYPE = 'SALES' AND pbi.TARGET_ID = a.ADMIN_ID
                LEFT JOIN TB_TAX_INVOICE ti ON ti.TARGET_TYPE = 'SALES' AND ti.TARGET_ID = a.ADMIN_ID AND ti.YYYYMM = ? AND ti.INVOICE_STAT != 'CANCELLED'
                WHERE DATE_FORMAT(br.CONFIRM_DT, '%Y%m') = ?
                  AND ti.TAX_INVOICE_ID IS NULL
                GROUP BY a.ADMIN_ID, a.ADMIN_NM, a.HP_NO, a.EMAIL,
                         pbi.BIZ_NO, pbi.BIZ_NM, pbi.CEO_NM, pbi.BIZ_ADDR, pbi.BIZ_TYPE, pbi.BIZ_ITEM
            `;

            const [driverRows] = await pool.execute(driverQuery, [cleanYm, cleanYm]);
            const [salesRows] = await pool.execute(salesQuery, [cleanYm, cleanYm]);

            // 두 대상 목록을 병합하여 응답
            const combinedList = [
                ...driverRows.map(r => ({ ...r, allowanceAmt: Math.round(Number(r.allowanceAmt)) })),
                ...salesRows.map(r => ({ ...r, allowanceAmt: Math.round(Number(r.allowanceAmt)) }))
            ];

            res.status(200).json(combinedList);
        } catch (error) {
            console.error('Fetch unissued tax invoices error:', error);
            res.status(500).json({ error: '미발행 대상 조회 중 오류가 발생했습니다.' });
        }
    });

    // 24. 세금계산서 신규 발행 API
    router.post('/tax-invoices', async (req, res) => {
        let connection;
        try {
            const {
                targetType,
                targetId,
                yyyyMM,
                supplyAmt,
                taxAmt,
                totalAmt,
                supplierBizNo,
                supplierNm,
                supplierCeo,
                supplierAddr,
                supplierBizType,
                supplierItem,
                email,
                remarks,
                regId
            } = req.body;

            if (!targetType || !targetId || !yyyyMM || !supplyAmt || !supplierBizNo || !supplierNm || !supplierCeo || !supplierAddr) {
                return res.status(400).json({ error: '필수 항목들이 누락되었습니다. (대상구분, 대상ID, 귀속월, 공급가액, 공급자 사업자정보)' });
            }

            const cleanYm = yyyyMM.trim().replace(/[^0-9]/g, '');

            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1) 파트너 사업자 정보 테이블 저장/업데이트 (UPSERT)
            const upsertBizInfoQuery = `
                INSERT INTO TB_PARTNER_BIZ_INFO (
                    TARGET_TYPE, TARGET_ID, BIZ_NO, BIZ_NM, CEO_NM, BIZ_ADDR, BIZ_TYPE, BIZ_ITEM, EMAIL, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                ON DUPLICATE KEY UPDATE
                    BIZ_NO = ?, BIZ_NM = ?, CEO_NM = ?, BIZ_ADDR = ?, BIZ_TYPE = ?, BIZ_ITEM = ?, EMAIL = ?, MOD_DT = NOW(), MOD_ID = ?
            `;
            await connection.execute(upsertBizInfoQuery, [
                targetType, targetId, supplierBizNo, supplierNm, supplierCeo, supplierAddr, supplierBizType || null, supplierItem || null, email || null, regId || 'ADMIN', regId || 'ADMIN',
                supplierBizNo, supplierNm, supplierCeo, supplierAddr, supplierBizType || null, supplierItem || null, email || null, regId || 'ADMIN'
            ]);

            // 2) 세금계산서 ID 생성 (TAX-YYYYMM-XXXX)
            const [maxSeqRows] = await connection.execute(
                "SELECT MAX(SUBSTRING(TAX_INVOICE_ID, 12, 4)) as maxSeq FROM TB_TAX_INVOICE WHERE YYYYMM = ?",
                [cleanYm]
            );
            const maxSeq = maxSeqRows[0]?.maxSeq ? parseInt(maxSeqRows[0].maxSeq, 10) : 0;
            const nextSeqStr = String(maxSeq + 1).padStart(4, '0');
            const taxInvoiceId = `TAX-${cleanYm}-${nextSeqStr}`;

            // 국세청 승인번호 임의 생성 (가상 연동 승인번호)
            const approveNo = `${cleanYm}${String(Math.floor(1000000000 + Math.random() * 9000000000))}`;

            // 기본 공급받는자(청솔테크) 정보 고정
            const buyerBizNo = '120-87-85472';
            const buyerNm = '(주)청솔테크';
            const buyerCeo = '이청솔';
            const buyerAddr = '서울시 마포구 백범로 31길 21, 5층';
            const buyerBizType = '서비스, 도소매';
            const buyerItem = '소프트웨어 개발 및 공급업';

            // 3) 세금계산서 등록
            const insertInvoiceQuery = `
                INSERT INTO TB_TAX_INVOICE (
                    TAX_INVOICE_ID, TARGET_TYPE, TARGET_ID, YYYYMM, SUPPLY_AMT, TAX_AMT, TOTAL_AMT, INVOICE_STAT,
                    SUPPLIER_BIZ_NO, SUPPLIER_NM, SUPPLIER_CEO, SUPPLIER_ADDR, SUPPLIER_BIZ_TYPE, SUPPLIER_ITEM,
                    BUYER_BIZ_NO, BUYER_NM, BUYER_CEO, BUYER_ADDR, BUYER_BIZ_TYPE, BUYER_ITEM,
                    NTS_APPROVE_NO, ISSUE_DT, REMARKS, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, NOW(), ?)
            `;

            await connection.execute(insertInvoiceQuery, [
                taxInvoiceId, targetType, targetId, cleanYm, supplyAmt, taxAmt || 0, totalAmt || supplyAmt,
                supplierBizNo, supplierNm, supplierCeo, supplierAddr, supplierBizType || null, supplierItem || null,
                buyerBizNo, buyerNm, buyerCeo, buyerAddr, buyerBizType, buyerItem,
                approveNo, remarks || null, regId || 'ADMIN', regId || 'ADMIN'
            ]);

            await connection.commit();
            res.status(200).json({ success: true, message: '세금계산서가 성공적으로 발행되었습니다.', taxInvoiceId, approveNo });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Create tax invoice error:', error);
            res.status(500).json({ error: '세금계산서 발행 중 오류가 발생했습니다.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // 25. 세금계산서 발행 취소 API
    router.patch('/tax-invoices/:taxInvoiceId/status', async (req, res) => {
        try {
            const { taxInvoiceId } = req.params;
            const { status, modId } = req.body;

            if (!status || !['ISSUED', 'CANCELLED'].includes(status)) {
                return res.status(400).json({ error: '올바른 상태값을 지정하십시오. (ISSUED 또는 CANCELLED)' });
            }

            const query = `
                UPDATE TB_TAX_INVOICE SET
                    INVOICE_STAT = ?,
                    MOD_DT = NOW(),
                    MOD_ID = ?
                WHERE TAX_INVOICE_ID = ?
            `;

            const [result] = await pool.execute(query, [status, modId || 'ADMIN', taxInvoiceId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: '해당 세금계산서를 찾을 수 없습니다.' });
            }

            res.status(200).json({ success: true, message: '세금계산서 상태가 성공적으로 업데이트되었습니다.' });
        } catch (error) {
            console.error('Update tax invoice status error:', error);
            res.status(500).json({ error: '세금계산서 상태 변경 중 오류가 발생했습니다.' });
        }
    });

    // ==========================================
    // ⚙️ BATCH JOB MONITORING APIs
    // ==========================================

    // 1. 배치 대시보드 통계 API
    router.get('/batch/stats', async (req, res) => {
        try {
            // 전체 배치 수
            const [totalRows] = await pool.execute('SELECT COUNT(*) as cnt FROM TB_BATCH_JOB_MST');
            const total = totalRows[0]?.cnt || 0;

            // 대기/실행 중 배치 수
            const [runningRows] = await pool.execute("SELECT COUNT(*) as cnt FROM TB_BATCH_HIST WHERE EXEC_STAT = 'RUNNING'");
            const running = runningRows[0]?.cnt || 0;

            // 최근 7일 내 성공 및 실패 수
            const [succRows] = await pool.execute("SELECT COUNT(*) as cnt FROM TB_BATCH_HIST WHERE EXEC_STAT = 'SUCCESS' AND REG_DT >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
            const success = succRows[0]?.cnt || 0;

            const [failRows] = await pool.execute("SELECT COUNT(*) as cnt FROM TB_BATCH_HIST WHERE EXEC_STAT = 'FAILED' AND REG_DT >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
            const fail = failRows[0]?.cnt || 0;

            res.status(200).json({ total, running, success, fail });
        } catch (error) {
            console.error('Batch Stats API Error:', error);
            res.status(200).json({ total: 0, running: 0, success: 0, fail: 0 });
        }
    });

    // 2. 배치 작업 목록 조회 API
    router.get('/batch/list', async (req, res) => {
        try {
            const query = `
                SELECT 
                    m.BATCH_JOB_ID as jobId,
                    m.BATCH_JOB_NM as jobName,
                    m.JOB_DESC as description,
                    m.EXEC_FILE_PATH as execPath,
                    m.EXEC_CYCLE as execCycle,
                    m.USE_YN as useYn,
                    m.RETRY_POLICY as retryPolicy,
                    m.MAX_RETRY_CNT as maxRetry,
                    s.EXEC_TIME as execTime,
                    s.EXEC_MONTH as execMonth,
                    s.EXEC_DAY as execDay,
                    s.EXEC_DOW as execDow,
                    s.CALC_RULE as calcRule,
                    s.HOLIDAY_RULE as holidayRule,
                    h.EXEC_STAT as lastStatus,
                    DATE_FORMAT(h.END_DT, '%Y-%m-%d %H:%i:%s') as lastRunTime,
                    h.ERR_MSG as lastError
                FROM TB_BATCH_JOB_MST m
                LEFT JOIN TB_BATCH_SCHED s ON m.BATCH_JOB_ID = s.BATCH_JOB_ID
                LEFT JOIN (
                    SELECT h1.* FROM TB_BATCH_HIST h1
                    INNER JOIN (
                        SELECT BATCH_JOB_ID, MAX(EXEC_ID) as max_id 
                        FROM TB_BATCH_HIST 
                        GROUP BY BATCH_JOB_ID
                    ) h2 ON h1.EXEC_ID = h2.max_id
                ) h ON m.BATCH_JOB_ID = h.BATCH_JOB_ID
                ORDER BY m.REG_DT DESC
            `;
            const [rows] = await pool.execute(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Batch List API Error:', error);
            res.status(500).json({ error: '배치 작업 목록 조회 실패' });
        }
    });

    // 3. 차기 신규 배치 ID 생성 API
    router.get('/nextBatchId', async (req, res) => {
        try {
            const { cycle, businessType } = req.query;
            const prefix = `JOB_${businessType || 'PARTNER'}_${cycle || 'DAILY'}`;
            const [rows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM TB_BATCH_JOB_MST WHERE BATCH_JOB_ID LIKE ?`,
                [`${prefix}%`]
            );
            const count = (rows[0]?.cnt || 0) + 1;
            const nextId = `${prefix}_${String(count).padStart(2, '0')}`;
            res.status(200).json({ nextId });
        } catch (error) {
            console.error('Next Batch ID API Error:', error);
            res.status(500).json({ error: '차기 배치 ID 계산 실패' });
        }
    });

    // 4. 신규 배치 작업 등록 API
    router.post('/newBatchRegistration', async (req, res) => {
        const { jobId, jobName, description, useYn, execPath, execCycle, retryPolicy, maxRetry, execTime, execMonth, execDay, execDow, calcRule, holidayRule } = req.body;
        
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1) 마스터 저장
            await connection.execute(`
                INSERT INTO TB_BATCH_JOB_MST (
                    BATCH_JOB_ID, BATCH_JOB_NM, JOB_DESC, EXEC_FILE_PATH, EXEC_CYCLE, USE_YN, RETRY_POLICY, MAX_RETRY_CNT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [jobId, jobName, description || null, execPath, execCycle, useYn || 'Y', retryPolicy || 'RETRYABLE', maxRetry || 3]);

            // 2) 스케줄 저장
            await connection.execute(`
                INSERT INTO TB_BATCH_SCHED (
                    BATCH_JOB_ID, EXEC_TIME, EXEC_MONTH, EXEC_DAY, EXEC_DOW, CALC_RULE, holiday_rule, USE_YN
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [jobId, execTime, execMonth || '*', execDay || '*', execDow || '*', calcRule || 'T', holidayRule || 'RUN', useYn || 'Y']);

            await connection.commit();
            res.status(200).json({ success: true, message: '배치 작업이 정상 등록되었습니다.' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('New Batch Registration Error:', error);
            res.status(500).json({ error: '배치 작업 등록 중 서버 오류가 발생했습니다.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // 5. 배치 수동 기동 API (비동기 Mock 실행 시뮬레이션)
    router.post('/batch/run/:jobId', async (req, res) => {
        try {
            const { jobId } = req.params;
            
            // 1) 현재 실행 상태 기록 (RUNNING)
            const [histResult] = await pool.execute(`
                INSERT INTO TB_BATCH_HIST (
                    BATCH_JOB_ID, JOB_DT, JOB_ROUND, EXEC_STAT, START_DT, DRY_RUN_YN, REQ_USR_ID, REQ_REASON
                ) VALUES (?, CURDATE(), IFNULL((SELECT MAX(h.JOB_ROUND) + 1 FROM TB_BATCH_HIST h WHERE h.BATCH_JOB_ID = ? AND h.JOB_DT = CURDATE()), 1), 'RUNNING', NOW(), 'N', 'ADMIN', 'Manual Execution via Dashboard')
            `, [jobId, jobId]);

            const execId = histResult.insertId;

            // 2) 비동기 지연 처리를 통해 백그라운드 구동 시뮬레이션 또는 실제 구동
            if (jobId === 'JOB_DONE_TOUR') {
                (async () => {
                    try {
                        const jobModule = require('../batch/jobs/JOB_DONE_TOUR');
                        await jobModule.run(execId);
                    } catch (e) {
                        console.error('JOB_DONE_TOUR execution error:', e);
                        try {
                            await pool.execute(`
                                UPDATE TB_BATCH_HIST 
                                SET EXEC_STAT = 'FAILED', END_DT = NOW(), ERR_MSG = ?
                                WHERE EXEC_ID = ?
                            `, [e.message.substring(0, 255), execId]);
                        } catch (dbErr) {
                            console.error('Failed to write failure history:', dbErr);
                        }
                    }
                })();
            } else {
                setTimeout(async () => {
                    try {
                        // 성공 처리 완료 (미구현 배치 전용 모의 시뮬레이션)
                        await pool.execute(`
                            UPDATE TB_BATCH_HIST 
                            SET EXEC_STAT = 'SUCCESS', END_DT = NOW(), TARGET_CNT = 5, SUCC_CNT = 5, FAIL_CNT = 0
                            WHERE EXEC_ID = ?
                        `, [execId]);
                    } catch (e) {
                        console.error('Manual batch background update error:', e);
                    }
                }, 2000);
            }

            res.status(200).json({ success: true, message: '배치 실행이 성공적으로 요청되었습니다.' });
        } catch (error) {
            console.error('Run Batch API Error:', error);
            res.status(500).json({ error: '배치 실행 요청 처리 실패' });
        }
    });

    // 6. 배치 강제 락 해제 API
    router.post('/batch/unlock', async (req, res) => {
        try {
            await pool.execute('DELETE FROM TB_BATCH_LOCK');
            res.status(200).json({ success: true, message: '모든 배치의 잠금이 해제되었습니다.' });
        } catch (error) {
            console.error('Force Unlock API Error:', error);
            res.status(500).json({ error: '잠금 강제 해제 실패' });
        }
    });

    // 7. 배치 스케줄 목록 조회 API
    router.get('/batch/schedules', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT s.*, m.BATCH_JOB_NM as jobName 
                FROM TB_BATCH_SCHED s
                LEFT JOIN TB_BATCH_JOB_MST m ON s.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY s.SCHED_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Schedules Error:', error);
            res.status(500).json([]);
        }
    });

    // 8. 배치 수행 계획 목록 조회 API
    router.get('/batch/plans', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT p.*, m.BATCH_JOB_NM as jobName 
                FROM TB_BATCH_PLAN p
                LEFT JOIN TB_BATCH_JOB_MST m ON p.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY p.PLAN_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Plans Error:', error);
            res.status(500).json([]);
        }
    });

    // 9. 배치 실행 결과 이력 조회 API
    router.get('/batch/histories', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT h.*, m.BATCH_JOB_NM as jobName 
                FROM TB_BATCH_HIST h
                LEFT JOIN TB_BATCH_JOB_MST m ON h.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY h.EXEC_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Histories Error:', error);
            res.status(500).json([]);
        }
    });

    // 10. 배치 처리 상세 조회 API
    router.get('/batch/details', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT d.*, h.BATCH_JOB_ID as jobId, m.BATCH_JOB_NM as jobName
                FROM TB_BATCH_DTL d
                LEFT JOIN TB_BATCH_HIST h ON d.EXEC_ID = h.EXEC_ID
                LEFT JOIN TB_BATCH_JOB_MST m ON h.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY d.DTL_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Details Error:', error);
            res.status(500).json([]);
        }
    });

    // 11. 배치 재실행 요청 목록 조회 API
    router.get('/batch/retries', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT r.*, h.BATCH_JOB_ID as jobId, m.BATCH_JOB_NM as jobName
                FROM TB_BATCH_RETRY_REQ r
                LEFT JOIN TB_BATCH_HIST h ON r.ORIG_EXEC_ID = h.EXEC_ID
                LEFT JOIN TB_BATCH_JOB_MST m ON h.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY r.RETRY_REQ_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Retries Error:', error);
            res.status(500).json([]);
        }
    });

    // 12. 배치 알림 이력 조회 API
    router.get('/batch/notifications', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT n.*, h.BATCH_JOB_ID as jobId, m.BATCH_JOB_NM as jobName
                FROM TB_BATCH_NOTI_HIST n
                LEFT JOIN TB_BATCH_HIST h ON n.EXEC_ID = h.EXEC_ID
                LEFT JOIN TB_BATCH_JOB_MST m ON h.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY n.NOTI_ID DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Notifications Error:', error);
            res.status(500).json([]);
        }
    });

    // 13. 배치 실행 잠금 상태 조회 API
    router.get('/batch/locks', async (req, res) => {
        try {
            const [rows] = await pool.execute(`
                SELECT l.*, m.BATCH_JOB_NM as jobName
                FROM TB_BATCH_LOCK l
                LEFT JOIN TB_BATCH_JOB_MST m ON l.BATCH_JOB_ID = m.BATCH_JOB_ID
                ORDER BY l.ACQUIRED_DT DESC
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Get Locks Error:', error);
            res.status(500).json([]);
        }
    });

    return router;
};

