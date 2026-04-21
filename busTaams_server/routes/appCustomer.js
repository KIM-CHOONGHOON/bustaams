const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../crypto');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

/**
 * [App 전용 고객 서비스]
 * 모든 데이터(이름, 휴대폰, 이메일)는 암호화 없이 평문으로 처리됩니다.
 * DB 스키마 변경에 따라 _UUID 필드는 모두 _ID 필드로 대체되었습니다.
 */


// 1. 프로필 정보 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            'SELECT USER_NM, HP_NO, USER_ID, USER_TYPE, PROFILE_IMG_PATH, PROFILE_FILE_ID FROM TB_USER WHERE USER_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        res.status(200).json({
            status: 200,
            data: {
                name: user.USER_NM || '사용자',
                phone: user.HP_NO,
                email: user.USER_ID,
                userType: user.USER_TYPE,
                userId: user.USER_ID,
                userImage: user.PROFILE_IMG_PATH // PROFILE_IMG_PATH 사용
            }
        });
    } catch (error) {
        console.error('App Customer profile fetch error:', error);
        res.status(500).json({ status: 500, error: '프로필 데이터를 가져오는 데 실패했습니다.' });
    }
});

// 2. 프로필 정보 업데이트
router.post('/profile/update', authenticateToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
        const userId = req.user.userId;
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

        const sql = `UPDATE TB_USER SET ${updates.join(', ')} WHERE USER_ID = ?`;
        params.push(userId);

        await pool.execute(sql, params);

        res.status(200).json({ status: 200, message: '정보가 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('App Customer profile update error:', error);
        res.status(500).json({ status: 500, error: '회원 정보를 수정하는 데 실패했습니다.' });
    }
});

// 3. 비밀번호 변경
router.post('/profile/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: '비밀번호를 입력해주세요.' });
    }

    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        await connection.beginTransaction();

        const [rows] = await connection.execute('SELECT PASSWORD FROM TB_USER WHERE USER_ID = ? AND USER_STAT = "ACTIVE"', [userId]);
        
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.PASSWORD);
        
        if (!isMatch) {
            await connection.rollback();
            return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // 1. 비밀번호 업데이트
        await connection.execute('UPDATE TB_USER SET PASSWORD = ? WHERE USER_ID = ?', [hashedNewPassword, userId]);

        // 2. 변경 로그 기록 (TB_USER_PWD_LOG)
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
        
        // OS 정보 간단 추출
        let os = 'Unknown';
        if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
        else if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Macintosh')) os = 'MacOS';

        await connection.execute(
            `INSERT INTO TB_USER_PWD_LOG (USER_ID, CHG_DEVICE, CHG_OS, CHG_IP, CHG_AGENT, CHANGE_DT)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [userId, 'APP', os, clientIp, userAgent]
        );

        await connection.commit();
        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('App Password change error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 4. 대시보드 요약 정보
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 사용자의 정보(이름, 프로필 사진)와 견적 현황을 가져오는 쿼리
        // DATA_STAT: AUCTION, BUS_CHANGE -> 견적진행중 (countProgressing)
        // DATA_STAT: BIDDING -> 승인대기중 (countWaitingApproval)
        const [rows] = await pool.execute(
            `SELECT 
                u.USER_NM as userName,
                u.PROFILE_IMG_PATH as profileImage,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.USER_ID AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE')) as countProgressing,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.USER_ID AND DATA_STAT = 'BIDDING') as countWaitingApproval
             FROM TB_USER u
             WHERE u.USER_ID = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
        }

        const stats = rows[0];
        
        res.status(200).json({
            success: true,
            status: 200,
            data: {
                userName: stats.userName || '사용자',
                // 만약 프로필 이미지가 상대 경로라면 절대 경로(또는 필요한 포맷)로 처리할 수 있도록 보완 가능
                profileImage: stats.profileImage || null,
                countProgressing: stats.countProgressing || 0,
                countWaitingApproval: stats.countWaitingApproval || 0,
                status: 'CONNECTED'
            }
        });
    } catch (error) {
        console.error('App dashboard error:', error);
        res.status(500).json({ success: false, error: '대시보드 데이터를 가져오는 데 실패했습니다.' });
    }
});

// 5. 대기 중인 요청 목록 (진행중 / 승인대기중 필터링 적용)
router.get('/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.query; // 'progress' 또는 'waiting'

        let statusFilter = "DATA_STAT IN ('AUCTION', 'BIDDING', 'BUS_CHANGE')"; // 기본값
        if (type === 'progress') {
            statusFilter = "DATA_STAT IN ('AUCTION', 'BUS_CHANGE')";
        } else if (type === 'waiting') {
            statusFilter = "DATA_STAT = 'BIDDING'";
        }

        const sql = `
            SELECT REQ_ID as reqUuid, TRIP_TITLE, START_ADDR, END_ADDR, 
                   DATE_FORMAT(START_DT, '%Y-%m-%d') as startDt, DATA_STAT as status
            FROM TB_AUCTION_REQ
            WHERE TRAVELER_ID = ? AND ${statusFilter}
            ORDER BY REG_DT DESC
        `;

        const [rows] = await pool.execute(sql, [userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('App pending-requests error:', error);
        res.status(500).json({ error: '조회 실패' });
    }
});

// 6. 프로필 이미지 업로드
router.post('/profile/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
        }

        const userId = req.user.userId;
        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        await pool.execute(
            'UPDATE TB_USER SET PROFILE_IMG_PATH = ? WHERE USER_ID = ?',
            [imageUrl, userId]
        );

        res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            message: '프로필 이미지가 성공적으로 업로드되었습니다.'
        });
    } catch (error) {
        console.error('App profile image upload error:', error);
        res.status(500).json({ success: false, error: '이미지 업로드 중 서버 오류가 발생했습니다.' });
    }
});

// 7. 예약 상세 정보 조회 (TB_AUCTION_REQ + TB_AUCTION_REQ_VIA)
router.get('/reservation/:id', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const travelerId = req.user.userId;

        // [A] 마스터 정보 조회
        const [rows] = await pool.execute(`
            SELECT 
                REQ_ID as reqUuid,
                TRIP_TITLE as tripName,
                START_ADDR as from_addr,
                END_ADDR as to_addr,
                DATE_FORMAT(START_DT, '%Y-%m-%d %H:%i') as start_date,
                DATE_FORMAT(END_DT, '%Y-%m-%d %H:%i') as end_date,
                REQ_AMT as total_price,
                DATA_STAT as status,
                REQ_AMT as specialRequest, 
                PASSENGER_CNT as passengerCount,
                TRAVELER_ID as ownerId,
                CASE 
                    WHEN DATA_STAT = 'AUCTION' THEN '입찰중'
                    WHEN DATA_STAT = 'BIDDING' THEN '낙찰진행중'
                    WHEN DATA_STAT = 'CONFIRM' THEN '예약확정'
                    WHEN DATA_STAT = 'DONE' THEN '운행완료'
                    ELSE '상태확인필요'
                END as statusText
            FROM TB_AUCTION_REQ 
            WHERE REQ_ID = ?
        `, [reqId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '해당 예약 번호를 찾을 수 없습니다.' });
        }

        const reservation = rows[0];

        // [보안 체크] 소유자 대조
        if (reservation.ownerId !== travelerId) {
            return res.status(403).json({ success: false, error: '본인의 예약 내역만 조회할 수 있습니다.' });
        }

        // [B] 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_ORD as ord
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_ORD ASC
        `, [reqId]);

        const fullRoute = [];
        fullRoute.push({ type: 'START', addr: reservation.from_addr, title: '출발지', time: reservation.start_date });
        
        viaRows.forEach(v => {
            if (v.type === 'START_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '가는길 경유지' });
            else if (v.type === 'ROUND_TRIP') fullRoute.push({ type: 'ROUND', addr: v.addr, title: '도착지(회차)' });
            else if (v.type === 'END_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '복귀길 경유지' });
        });
        
        fullRoute.push({ type: 'END', addr: reservation.from_addr, title: '복귀지', time: reservation.end_date });
        reservation.route = fullRoute;

        // [C] 신청 차량 목록 및 입찰 현황 조회
        const [busRows] = await pool.execute(`
            SELECT 
                REQ_BUS_ID as reqBusUuid,
                BUS_TYPE_CD as busType,
                REQ_BUS_CNT as count,
                TOLLS_AMT as price,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
                 JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
                 WHERE b.REQ_ID = rb.REQ_ID AND db.SERVICE_CLASS = rb.BUS_TYPE_CD AND b.DATA_STAT = 'BIDDING') as bidCount,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
                 JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
                 WHERE b.REQ_ID = rb.REQ_ID AND db.SERVICE_CLASS = rb.BUS_TYPE_CD AND b.DATA_STAT = 'CONFIRM') as confirmedCount
            FROM TB_AUCTION_REQ_BUS rb
            WHERE rb.REQ_ID = ?
        `, [reqId]);

        reservation.requestedBuses = busRows;

        res.json({
            success: true,
            data: reservation
        });
    } catch (error) {
        console.error('App Reservation Detail error:', error);
        res.status(500).json({ success: false, error: '상세 정보를 가져오는 데 실패했습니다.' });
    }
});

// 8. 특정 요청/차종에 대한 입찰 목록 조회
router.get('/received-bids', authenticateToken, async (req, res) => {
    try {
        const { reqUuid: reqId } = req.query;
        if (!reqId) {
            return res.status(400).json({ success: false, error: '요청 ID가 필요합니다.' });
        }

        let sql = `
            SELECT 
                b.RES_ID as id,
                u.USER_NM as captain,
                u.PROFILE_IMG_PATH as avatar,
                db.SERVICE_CLASS as busType,
                db.MODEL_NM as title,
                b.DRIVER_BIDDING_PRICE as price,
                b.DRIVER_BIDDING_PRICE as baseFare,
                b.REQ_ORD_COMMENT as memo,
                b.DATA_STAT as status
            FROM TB_BUS_RESERVATION b
            JOIN TB_USER u ON b.DRIVER_ID = u.USER_ID
            JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            WHERE b.REQ_ID = ? AND b.DATA_STAT IN ('BIDDING', 'CONFIRM')
        `;
        const params = [reqId];

        sql += " ORDER BY b.REG_DT DESC";

        const [rows] = await pool.execute(sql, params);
        
        // [추가] 상단 요약 정보를 위해 예약 마스터 정보 조회
        const [masterRows] = await pool.execute(`
            SELECT 
                TRIP_TITLE as tripName,
                DATE_FORMAT(START_DT, '%Y.%m.%d') as startDate,
                DATE_FORMAT(END_DT, '%Y.%m.%d') as endDate,
                START_ADDR as from_addr,
                END_ADDR as to_addr
            FROM TB_AUCTION_REQ
            WHERE REQ_ID = ?
        `, [reqId]);
        const master = masterRows.length > 0 ? masterRows[0] : null;

        // [추가] 상세 경로 정보 조회
        if (master) {
            const [viaRows] = await pool.execute(`
                SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_ORD as ord
                FROM TB_AUCTION_REQ_VIA
                WHERE REQ_ID = ?
                ORDER BY VIA_ORD ASC
            `, [reqId]);

            const fullRoute = [];
            fullRoute.push({ type: 'START', addr: master.from_addr, title: '출발지' });
            viaRows.forEach(v => {
                if (v.type === 'START_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '가는길 경유지' });
                else if (v.type === 'ROUND_TRIP') fullRoute.push({ type: 'ROUND', addr: v.addr, title: '도착지(회차)' });
                else if (v.type === 'END_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '복귀길 경유지' });
            });
            fullRoute.push({ type: 'END', addr: master.from_addr, title: '복귀지' });
            master.route = fullRoute;
        }

        // 이미지 경로 처리
        const host = req.get('host');
        const protocol = req.protocol;
        const processedRows = rows.map(row => {
            let avatar = row.avatar;
            if (avatar && avatar.startsWith('/uploads')) {
                avatar = `${protocol}://${host}${avatar}`;
            }
            return {
                ...row,
                avatar: avatar
            };
        });

        res.json({ 
            success: true, 
            data: processedRows,
            reservation: master 
        });
    } catch (error) {
        console.error('Fetch received bids error:', error);
        res.status(500).json({ success: false, error: '입찰 목록 조회 실패' });
    }
});


// 9. 특정 입찰 상세 정보 조회 (앱 전용)
router.get('/bid-detail/:id', authenticateToken, async (req, res) => {
    try {
        const resId = req.params.id;

        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                u.USER_NM as driverName,
                u.PROFILE_IMG_PATH as avatar,
                u.JOIN_DT as joinDt,
                u.HP_NO as hpNo,
                db.SERVICE_CLASS as busType,
                db.MODEL_NM as busModel,
                db.MANUFACTURE_YEAR as busYear,
                db.SERVICE_CLASS as seats,
                b.DRIVER_BIDDING_PRICE as totalPrice,
                b.DRIVER_BIDDING_PRICE as baseFare,
                0 as tollFare,
                0 as fuelFare,
                0 as roomBoardFare,
                0 as otherFare,
                b.REQ_ORD_COMMENT as memo,
                db.AMENITIES as amenities,
                db.VEHICLE_PHOTOS_JSON as photos
            FROM TB_BUS_RESERVATION b
            JOIN TB_USER u ON b.DRIVER_ID = u.USER_ID
            JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            WHERE b.RES_ID = ?
        `, [resId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '해당 입찰 정보를 찾을 수 없습니다.' });
        }

        const bid = rows[0];

        // 이미지 경로 처리
        const host = req.get('host');
        const protocol = req.protocol;
        const processUrl = (path) => {
            if (!path) return null;
            if (path.startsWith('http')) return path;
            const cleanPath = path.startsWith('/uploads') ? path : '/' + path;
            return `${protocol}://${host}${cleanPath}`;
        };

        bid.avatar = processUrl(bid.avatar);
        
        // 편의시설 파싱
        if (bid.amenities && typeof bid.amenities === 'string') {
            try {
                bid.amenities = JSON.parse(bid.amenities);
            } catch (e) {
                bid.amenities = [];
            }
        }

        // 사진 처리
        let photoPaths = [];
        if (bid.photos) {
            try {
                const photos = typeof bid.photos === 'string' ? JSON.parse(bid.photos) : bid.photos;
                if (Array.isArray(photos)) {
                    photoPaths = photos.map(p => processUrl(p.url || p));
                }
            } catch (e) {}
        }
        bid.photos = photoPaths.filter(p => p !== null);

        // 경력 계산
        const joinYear = bid.joinDt ? new Date(bid.joinDt).getFullYear() : new Date().getFullYear();
        const currentYear = new Date().getFullYear();
        bid.experience = Math.max(1, currentYear - joinYear);

        res.json({
            success: true,
            data: bid
        });
    } catch (error) {
        console.error('App Bid Detail Error:', error);
        res.status(500).json({ success: false, error: '상세 정보 조회 실패' });
    }
});

// 10. 입찰 선정 및 예약 확정 (앱 전용)
router.post('/confirm-bid', authenticateToken, async (req, res) => {
    const { bidUuid: resId } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. 해당 입찰 정보 조회 (REQ_ID 확인용)
        const [bidRows] = await connection.execute(
            'SELECT REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?',
            [resId]
        );

        if (bidRows.length === 0) {
            throw new Error('해당 입찰을 찾을 수 없습니다.');
        }

        const reqId = bidRows[0].REQ_ID;

        // 2. 선택된 입찰은 'CONFIRM' 처리
        await connection.execute(
            "UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM' WHERE RES_ID = ?",
            [resId]
        );

        // 3. 모든 요청 차량이 예약되었는지 확인하여 마스터 상태 변경
        const [totalNeededRows] = await connection.execute(
            "SELECT SUM(REQ_BUS_CNT) as totalNeeded FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?",
            [reqId]
        );
        const [totalConfirmedRows] = await connection.execute(
            "SELECT COUNT(*) as totalConfirmed FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'",
            [reqId]
        );

        const totalNeeded = totalNeededRows[0].totalNeeded || 0;
        const totalConfirmed = totalConfirmedRows[0].totalConfirmed || 0;

        if (totalConfirmed >= totalNeeded) {
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM' WHERE REQ_ID = ?",
                [reqId]
            );
        } else if (totalConfirmed > 0) {
            // 일부 확정 상태
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'BIDDING' WHERE REQ_ID = ?",
                [reqId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: '선택하신 차량의 예약이 확정되었습니다.' });
    } catch (error) {
        await connection.rollback();
        console.error('Confirm bid error:', error);
        res.status(500).json({ success: false, error: error.message || '예약 확정 중 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
