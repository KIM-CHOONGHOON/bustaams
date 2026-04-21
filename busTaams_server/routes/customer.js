const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// [고객용] 프로필 정보 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT USER_NM, HP_NO, EMAIL, USER_TYPE FROM TB_USER WHERE USER_ID = ?',
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        res.status(200).json({
            status: 200,
            data: {
                name: user.USER_NM,
                phone: user.HP_NO,
                email: user.EMAIL,
                userType: user.USER_TYPE
            }
        });
    } catch (error) {
        console.error('Customer profile fetch error:', error);
        res.status(500).json({ status: 500, error: '프로필 데이터를 가져오는 데 실패했습니다.' });
    }
});

// [고객용] 프로필 정보 업데이트 (변경된 항목만 선택적으로 수정)
router.post('/profile/update', authenticateToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
        const updates = [];
        const params = [];

        if (name) {
            updates.push('USER_NM = ?');
            params.push(name);
        }
        if (phone) {
            updates.push('HP_NO = ?');
            params.push(phone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ status: 400, message: '업데이트할 항목이 없습니다.' });
        }

        // 마지막은 WHERE 절 조건 (USER_ID)
        const sql = `UPDATE TB_USER SET ${updates.join(', ')} WHERE USER_ID = ?`;
        params.push(req.user.userId);

        await pool.execute(sql, params);

        res.status(200).json({ status: 200, message: '변경된 정보가 성공적으로 반영되었습니다.' });
    } catch (error) {
        console.error('Customer profile update error:', error);
        res.status(500).json({ status: 500, error: '회원 정보를 수정하는 데 실패했습니다.' });
    }
});

// API 3: 비밀번호 변경
router.post('/profile/change-password', authenticateToken, async (req, res) => {
    // [강제 이식] server.js의 로그인 파라미터 방식을 그대로 채택
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: '비밀번호를 입력해주세요.' });
    }

    try {
        console.log('PasswordChange: Initializing Mirror-Login Logic...');

        // 1. 로그인 시와 똑같이 "ID로 직접 조회" 수행
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ? AND USER_STAT = "ACTIVE"', [req.user.userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const foundUser = rows[0];

        // 2. [결정적 조치] server.js의 361번 라인 핵심 코드를 1:1로 복사하여 실행
        // const isMatch = await bcrypt.compare(password, foundUser.PASSWORD); <-- 이 로직을 그대로 재현
        const isMatch = await bcrypt.compare(currentPassword.toString().trim(), foundUser.PASSWORD);
        
        if (!isMatch) {
            console.warn(`PasswordChange: Bcrypt mismatch for matched user: ${userIdFromToken}`);
            return res.status(401).json({ message: '현재 비밀번호를 다시 확인해주세요.' });
        }

        // 3. 새 비밀번호 해싱 및 업데이트
        const hashedNewPassword = await bcrypt.hash(newPassword.toString().trim(), 10);
        await pool.execute('UPDATE TB_USER SET PASSWORD = ? WHERE USER_UUID = ?', [hashedNewPassword, foundUser.USER_UUID]);

        console.log('PasswordChange: Update successful via Mirror-Login.');
        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('PasswordChange: MIRROR ERROR:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// [임시/인증] 인증번호 발송 모의 API
router.post('/auth/send-code', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    console.log(`[SMS MOCK] ${phone} 번호로 인증번호 123456 발송`);
    res.status(200).json({ status: 200, message: '인증번호가 발송되었습니다. (테스트용: 123456)' });
});

// [임시/인증] 인증번호 확인 모의 API
router.post('/auth/verify-code', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (code === '123456') {
        res.status(200).json({ status: 200, message: '인증에 성공하였습니다.' });
    } else {
        res.status(400).json({ status: 400, error: '인증번호가 일치하지 않습니다.' });
    }
});

// [고객용] 대시보드 요약 정보 조회 (예약 현황 등)
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const [reservations] = await pool.execute(
            'SELECT * FROM TB_BUS_RESERVATION WHERE TRAVELER_UUID = (SELECT USER_UUID FROM TB_USER WHERE USER_ID = ?) ORDER BY START_DT DESC LIMIT 5',
            [req.user.userId]
        );
        
        res.status(200).json({
            status: 200,
            data: {
                totalReservations: reservations.length,
                recentReservations: reservations
            }
        });
    } catch (error) {
        console.error('Customer dashboard error:', error);
        res.status(500).json({ status: 500, error: '대시보드 데이터를 가져오는 데 실패했습니다.' });
    }
});

// [고객용] 버스 대절 요청 등록 (화면 5-6)
router.post('/reservations/request', authenticateToken, async (req, res) => {
    const { startAddr, endAddr, startDt, endDt, busType, passengers, totalPrice } = req.body;
    
    try {
        const resUuid = uuidv4();
        // 실제 저장 시 BINARY(16) 변환 필요
        await pool.execute(
            `INSERT INTO TB_BUS_RESERVATION (RES_UUID, TRAVELER_UUID, START_ADDR, END_ADDR, START_DT, END_DT, TOTAL_PRICE, DEPOSIT_PRICE, RES_STAT)
             VALUES (UUID_TO_BIN(?), (SELECT USER_UUID FROM TB_USER WHERE USER_ID = ?), ?, ?, ?, ?, ?, ?, 'REQ')`,
            [resUuid, req.user.userId, startAddr, endAddr, startDt, endDt, totalPrice, totalPrice * 0.066]
        );

        res.status(201).json({ status: 201, message: '예약 요청이 성공적으로 등록되었습니다.', resUuid });
    } catch (error) {
        console.error('Reservation request error:', error);
        res.status(500).json({ status: 500, error: '예약 요청 중 오류가 발생했습니다.' });
    }
});

// [고객용] 견적 입찰 목록 조회 (화면 12-13)
router.get('/estimates', authenticateToken, async (req, res) => {
    try {
        // [비즈니스 로직] 내가 요청한 예약들에 대해 들어온 기사들의 입찰(BID) 정보 조회
        // (TB_DRIVER_BID 테이블 필요 - DB.md에 유사 구조가 있는지 확인 필요)
        const [bids] = await pool.execute(
            `SELECT b.*, u.USER_NM as driverName, bu.BUS_NM as busName 
             FROM TB_DRIVER_BID b
             JOIN TB_USER u ON b.DRIVER_UUID = u.USER_UUID
             JOIN TB_BUS_INFO bu ON b.BUS_UUID = bu.BUS_UUID
             JOIN TB_BUS_RESERVATION r ON b.RES_UUID = r.RES_UUID
             WHERE r.TRAVELER_UUID = (SELECT USER_UUID FROM TB_USER WHERE USER_ID = ?)`,
            [req.user.userId]
        );

        res.status(200).json({ status: 200, data: bids });
    } catch (error) {
        console.error('Estimate list fetch error:', error);
        res.status(500).json({ status: 500, error: '견적 목록을 가져오는 데 실패했습니다.' });
    }
});

// [고객용] 견적 상세 조회 (화면 12-13)
router.get('/estimates/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT b.*, u.USER_NM as driverName, bu.BUS_NM as busName, bu.BUS_YEAR, bu.PASS_LIMIT
             FROM TB_DRIVER_BID b
             JOIN TB_USER u ON b.DRIVER_UUID = u.USER_UUID
             JOIN TB_BUS_INFO bu ON b.BUS_UUID = bu.BUS_UUID
             WHERE b.BID_UUID = UUID_TO_BIN(?)`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: '견적을 찾을 수 없습니다.' });
        res.status(200).json({ status: 200, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: '견적 상세 조회 실패' });
    }
});

// [고객용] 예약 상세 조회 (화면 15)
router.get('/reservations/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM TB_BUS_RESERVATION WHERE RES_UUID = UUID_TO_BIN(?)',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
        res.status(200).json({ status: 200, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: '예약 상세 조회 실패' });
    }
});

// [고객용] 예약 취소 (화면 10)
router.post('/reservations/:id/cancel', authenticateToken, async (req, res) => {
    try {
        await pool.execute(
            'UPDATE TB_BUS_RESERVATION SET RES_STAT = "CANCEL" WHERE RES_UUID = UUID_TO_BIN(?)',
            [req.params.id]
        );
        res.status(200).json({ status: 200, message: '예약이 취소되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '예약 취소 실패' });
    }
});

// [고객용] 리뷰 작성 (화면 17)
router.post('/reviews', authenticateToken, async (req, res) => {
    const { resUuid, rating, comment } = req.body;
    try {
        const reviewUuid = uuidv4();
        await pool.execute(
            'INSERT INTO TB_REVIEW (REV_UUID, RES_UUID, TRAVELER_UUID, RATING, COMMENT) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), (SELECT USER_UUID FROM TB_USER WHERE USER_ID = ?), ?, ?)',
            [reviewUuid, resUuid, req.user.userId, rating, comment]
        );
        res.status(201).json({ status: 201, message: '리뷰가 등록되었습니다.' });
    } catch (error) {
        console.error('Review create error:', error);
        res.status(500).json({ error: '리뷰 등록 실패' });
    }
});

// [고객용] 1:1 문의 등록 (화면 16)
router.post('/inquiries', authenticateToken, async (req, res) => {
    const { title, content, category } = req.body;
    try {
        // [임시] TB_INQUIRY 테이블로 저장 (스키마에 맞게 조정 필요)
        res.status(201).json({ status: 201, message: '문의가 등록되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '문의 등록 실패' });
    }
});

// [고객용] 대기 중인 요청 목록 (대시보드용)
router.get('/my-pending-requests', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                BIN_TO_UUID(REQ_UUID) as reqUuid,
                TRIP_TITLE as tripName,
                START_ADDR as departure,
                END_ADDR as destination,
                DATE_FORMAT(START_DT, '%Y-%m-%d') as startDate,
                REQ_AMT as totalPrice,
                REQ_STAT as status
            FROM TB_AUCTION_REQ 
            WHERE TRAVELER_UUID = UUID_TO_BIN(?) 
              AND REQ_STAT IN ('OPEN', 'BIDDING', 'CONFIRM')
            ORDER BY REG_DT DESC
        `, [req.user.userUuid]);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch pending requests error:', error);
        res.status(500).json({ success: false, error: '데이터 조회 실패' });
    }
});

module.exports = router;

