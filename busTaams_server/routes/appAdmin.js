const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

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
                `SELECT COUNT(*) as cnt FROM TB_USER WHERE USER_TYPE = 'DRIVER' AND USER_STAT IN ('WAIT', 'PENDING')`
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
            const { adminId, password, adminNm, deptNm, hpNo, email, role } = req.body;
            
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

            await pool.execute(
                `INSERT INTO TB_ADMIN (
                    ADMIN_ID, PASSWORD, ADMIN_NM, DEPT_NM, ADMIN_GRADE, HP_NO, EMAIL, ADMIN_STAT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                [adminId, hashedPassword, adminNm, deptNm || null, adminGrade, hpNo || null, email || null]
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
            const logMsg = `[${new Date().toISOString()}] Login Attempt - adminId: ${adminId}, inputPwdLen: ${password ? password.length : 0}, hashInDb: "${adminObj.PASSWORD}"\n`;
            require('fs').appendFileSync('d:\\project_bustaams\\busTaams_server\\admin_debug.log', logMsg, 'utf8');
            console.log(`[DEBUG Admin Login] adminId: ${adminId}, inputPasswordLength: ${password ? password.length : 0}, hashInDb: "${adminObj.PASSWORD}"`);
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
                 WHERE r.PAYMENT_STS = '1'
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

            // 3. TB_BUS_RESERVATION 상태를 CONFIRM으로 업데이트 (취소/변경 상태 제외)
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM', MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE')`,
                [reqId]
            );

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

            let query = `
                SELECT 
                    CUST_ID as custId,
                    USER_ID as userId,
                    USER_NM as userNm,
                    HP_NO as hpNo,
                    EMAIL as email,
                    USER_TYPE as userType,
                    USER_STAT as userStat,
                    DATE_FORMAT(JOIN_DT, '%Y-%m-%d %H:%i') as joinDt
                FROM TB_USER 
                WHERE USER_TYPE = ?
            `;
            const params = [targetType];

            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'userNm') {
                    query += ` AND USER_NM LIKE ?`;
                    params.push(keyword);
                } else if (searchType === 'userId') {
                    query += ` AND USER_ID LIKE ?`;
                    params.push(keyword);
                } else if (searchType === 'hpNo') {
                    query += ` AND HP_NO LIKE ?`;
                    params.push(keyword);
                } else {
                    // 전체 통합 검색 fallback
                    query += ` AND (USER_NM LIKE ? OR USER_ID LIKE ? OR HP_NO LIKE ?)`;
                    params.push(keyword, keyword, keyword);
                }
            }

            query += ` ORDER BY JOIN_DT DESC`;

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
            const { searchType, searchKeyword } = req.query;

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

            if (searchKeyword && searchKeyword.trim()) {
                const keyword = `%${searchKeyword.trim()}%`;
                if (searchType === 'tripTitle') {
                    query += ` WHERE r.TRIP_TITLE LIKE ?`;
                    params.push(keyword);
                } else if (searchType === 'travelerName') {
                    query += ` WHERE u.USER_NM LIKE ?`;
                    params.push(keyword);
                } else {
                    query += ` WHERE (r.TRIP_TITLE LIKE ? OR u.USER_NM LIKE ?)`;
                    params.push(keyword, keyword);
                }
            }

            query += ` ORDER BY r.REG_DT DESC`;

            const [rows] = await pool.execute(query, params);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Admin Trips API Error:', error);
            res.status(500).json({ error: '여행 목록 조회 중 오류가 발생했습니다.' });
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
            const { adminId } = req.query;
            if (!adminId) {
                return res.status(400).json({ error: '관리자 ID(adminId)가 필요합니다.' });
            }

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
                WHERE TRIM(d.RECOM_CODE) = TRIM(?)
                ORDER BY r.REG_DT DESC
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

    // 12. 영업사원별 실적 집계 API
    router.get('/sales-performance', async (req, res) => {
        try {
            const query = `
                SELECT 
                    a.ADMIN_ID as adminId,
                    a.ADMIN_NM as adminName,
                    a.DEPT_NM as deptName,
                    a.ADMIN_GRADE as role,
                    (SELECT COUNT(*) FROM TB_USER WHERE USER_TYPE = 'DRIVER' AND TRIM(RECOM_CODE) = TRIM(a.ADMIN_ID)) as driverCount,
                    (SELECT COUNT(*) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID)) as matchCount,
                    (SELECT IFNULL(SUM(r.DRIVER_BIDDING_PRICE), 0) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID)) as totalBidding,
                    (SELECT IFNULL(SUM(r.RES_FEE_TOTAL_AMT), 0) FROM TB_BUS_RESERVATION r INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER' WHERE TRIM(d.RECOM_CODE) = TRIM(a.ADMIN_ID)) as totalFee
                FROM TB_ADMIN a
                ORDER BY totalFee DESC, driverCount DESC
            `;
            const [rows] = await pool.execute(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Sales performance API error:', error);
            res.status(500).json({ error: '영업사원 실적 집계 중 오류가 발생했습니다.' });
        }
    });

    return router;
};

