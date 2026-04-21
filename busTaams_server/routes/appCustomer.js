const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
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
 */

// UUID Buffer를 String으로 변환 (HEX 기반 안전 변환)
const bufferToUuid = (buf) => {
    if (!buf) return null;
    return buf.toString('hex').toUpperCase();
};

// UUID String을 Buffer(16)로 변환 (모든 버전 호환)
const uuidToBuffer = (uuid) => {
    if (!uuid) return null;
    if (Buffer.isBuffer(uuid)) return uuid;
    try {
        const cleanUuid = typeof uuid === 'string' ? uuid.replace(/-/g, '') : uuid.toString();
        return Buffer.from(cleanUuid, 'hex');
    } catch (e) {
        return null;
    }
};

// 1. 프로필 정보 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [rows] = await pool.execute(
            'SELECT USER_NM, HP_NO, USER_ID, USER_TYPE, USER_IMAGE, HEX(USER_UUID) as userUuid FROM TB_USER WHERE USER_UUID = ?',
            [userUuidBuf]
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
                email: user.USER_ID, // USER_ID는 평문 저장 (ID_ENC가 별도로 있음)
                userType: user.USER_TYPE,
                userUuid: user.userUuid,
                userImage: user.USER_IMAGE
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
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
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

        const sql = `UPDATE TB_USER SET ${updates.join(', ')} WHERE USER_UUID = ?`;
        params.push(userUuidBuf);

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
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        await connection.beginTransaction();

        const [rows] = await connection.execute('SELECT PASSWORD FROM TB_USER WHERE USER_UUID = ? AND USER_STAT = "ACTIVE"', [userUuidBuf]);
        
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
        await connection.execute('UPDATE TB_USER SET PASSWORD = ? WHERE USER_UUID = ?', [hashedNewPassword, userUuidBuf]);

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
            `INSERT INTO TB_USER_PWD_LOG (USER_UUID, CHG_DEVICE, CHG_OS, CHG_IP, CHG_AGENT, CHANGE_DT)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [userUuidBuf, 'APP', os, clientIp, userAgent]
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
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        // 내가 등록한 견적 요청 수 대시보드 표시
        const [reqRows] = await pool.execute(
            `SELECT COUNT(*) as auctionCount FROM TB_AUCTION_REQ r 
             JOIN TB_USER u ON r.TRAVELER_UUID = u.USER_UUID
             WHERE u.USER_UUID = ?`, [userUuidBuf]
        );
        
        res.status(200).json({
            status: 200,
            data: {
                auctionCount: reqRows[0].auctionCount,
                status: 'CONNECTED'
            }
        });
    } catch (error) {
        console.error('App dashboard error:', error);
        res.status(500).json({ error: '대시보드 데이터를 가져오는 데 실패했습니다.' });
    }
});

// 5. 대기 중인 요청 목록
router.get('/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [rows] = await pool.execute(
            `SELECT HEX(REQ_UUID) as reqUuid, TRIP_TITLE, START_ADDR, END_ADDR, 
                    DATE_FORMAT(START_DT, '%Y-%m-%d') as startDt, REQ_STAT
             FROM TB_AUCTION_REQ r
             JOIN TB_USER u ON r.TRAVELER_UUID = u.USER_UUID
             WHERE u.USER_UUID = ? ORDER BY r.REG_DT DESC`,
            [userUuidBuf]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ error: '조회 실패' });
    }
});

// 6. 프로필 이미지 업로드
router.post('/profile/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
        }

        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        await pool.execute(
            'UPDATE TB_USER SET USER_IMAGE = ? WHERE USER_UUID = ?',
            [imageUrl, userUuidBuf]
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
        const reqUuid = req.params.id;
        const travelerUuid = req.user.userUuid;

        const reqUuidBuf = uuidToBuffer(reqUuid);
        const travelerUuidBuf = uuidToBuffer(travelerUuid);

        // [A] 마스터 정보 조회
        const [rows] = await pool.execute(`
            SELECT 
                HEX(REQ_UUID) as reqUuid,
                TRIP_TITLE as tripName,
                START_ADDR as from_addr,
                END_ADDR as to_addr,
                DATE_FORMAT(START_DT, '%Y-%m-%d %H:%i') as start_date,
                DATE_FORMAT(END_DT, '%Y-%m-%d %H:%i') as end_date,
                REQ_AMT as total_price,
                REQ_STAT as status,
                REQ_COMMENT as specialRequest,
                PASSENGER_CNT as passengerCount,
                HEX(TRAVELER_UUID) as ownerUuid,
                CASE 
                    WHEN REQ_STAT = 'BIDDING' THEN '입찰중'
                    WHEN REQ_STAT = 'CONFIRM' THEN '예약확정'
                    WHEN REQ_STAT = 'DONE' THEN '운행완료'
                    WHEN REQ_STAT = 'CANCEL' THEN '취소됨'
                    ELSE '대기중'
                END as statusText
            FROM TB_AUCTION_REQ 
            WHERE REQ_UUID = ?
        `, [reqUuidBuf]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '해당 예약 번호를 찾을 수 없습니다.' });
        }

        const reservation = rows[0];

        // [보안 체크] 소유자 대조
        const isOwner = reservation.ownerUuid.toUpperCase() === travelerUuid.replace(/-/g, '').toUpperCase();
        
        if (!isOwner) {
            return res.status(403).json({ success: false, error: '본인의 예약 내역만 조회할 수 있습니다.' });
        }

        // [B] 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_ORD as ord
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_UUID = ?
            ORDER BY VIA_ORD ASC
        `, [reqUuidBuf]);

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
                HEX(REQ_BUS_UUID) as reqBusUuid,
                BUS_TYPE_CD as busType,
                REQ_BUS_CNT as count,
                REQ_AMT as price,
                (SELECT COUNT(*) FROM TB_BID b 
                 JOIN TB_DRIVER_BUS db ON b.BUS_UUID = db.BUS_UUID
                 WHERE b.REQ_UUID = rb.REQ_UUID AND db.BUS_TYPE_CD = rb.BUS_TYPE_CD AND b.BID_STAT = 'SUBMITTED') as bidCount,
                (SELECT COUNT(*) FROM TB_BID b 
                 JOIN TB_DRIVER_BUS db ON b.BUS_UUID = db.BUS_UUID
                 WHERE b.REQ_UUID = rb.REQ_UUID AND db.BUS_TYPE_CD = rb.BUS_TYPE_CD AND b.BID_STAT = 'SELECTED') as confirmedCount
            FROM TB_AUCTION_REQ_BUS rb
            WHERE rb.REQ_UUID = ?
        `, [reqUuidBuf]);

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
        const { reqUuid, busType } = req.query;
        if (!reqUuid) {
            return res.status(400).json({ success: false, error: '요청 UUID가 필요합니다.' });
        }

        const reqUuidBuf = uuidToBuffer(reqUuid);
        let sql = `
            SELECT 
                HEX(b.BID_UUID) as id,
                u.USER_NM as captain,
                COALESCE(u.PROFILE_IMG_PATH, u.USER_IMAGE) as avatar,
                db.BUS_TYPE_CD as busType,
                IFNULL(v.MODEL_NM, db.BUS_NO) as title,
                b.TOTAL_BID_AMT as price,
                b.BASE_FARE as baseFare,
                b.SERVICE_MEMO as memo,
                b.BID_STAT as status
            FROM TB_BID b
            JOIN TB_USER u ON b.DRIVER_UUID = u.USER_UUID
            JOIN TB_DRIVER_BUS db ON b.BUS_UUID = db.BUS_UUID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON b.BUS_UUID = v.BUS_ID
            WHERE b.REQ_UUID = ? AND b.BID_STAT IN ('SUBMITTED', 'SELECTED')
        `;
        // [교정] 특정 차종 필터링(busType)을 제거하거나 더 유연하게 처리합니다.
        // 고객은 해당 여정(reqUuid)에 대한 모든 입찰을 보고 싶어하는 경우가 많으므로 전체를 반환합니다.
        const params = [reqUuidBuf];


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
            WHERE REQ_UUID = ?
        `, [reqUuidBuf]);
        const master = masterRows.length > 0 ? masterRows[0] : null;

        // [추가] 상세 경로 정보 조회
        if (master) {
            const [viaRows] = await pool.execute(`
                SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_ORD as ord
                FROM TB_AUCTION_REQ_VIA
                WHERE REQ_UUID = ?
                ORDER BY VIA_ORD ASC
            `, [reqUuidBuf]);

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

        // 개인정보 복호화 및 이미지 경로 처리 (절대 경로로 변환하여 전달)
        const host = req.get('host');
        const protocol = req.protocol;
        const decryptedRows = rows.map(row => {
            let avatar = row.avatar;
            if (avatar) {
                if (avatar.startsWith('uploads')) {
                    avatar = '/' + avatar;
                }
                if (avatar.startsWith('/uploads')) {
                    avatar = `${protocol}://${host}${avatar}`;
                }
            }
            return {
                ...row,
                captain: row.captain,
                avatar: avatar
            };
        });

        res.json({ 
            success: true, 
            data: decryptedRows,
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
        const bidUuid = req.params.id;
        const bidUuidBuf = uuidToBuffer(bidUuid);

        const [rows] = await pool.execute(`
            SELECT 
                HEX(b.BID_UUID) as id,
                u.USER_NM as driverName,
                COALESCE(u.PROFILE_IMG_PATH, u.USER_IMAGE) as avatar,
                u.JOIN_DT as joinDt,
                u.HP_NO as hpNo,
                db.BUS_TYPE_CD as busType,
                IFNULL(v.MODEL_NM, db.BUS_NO) as busModel,
                v.MANUFACTURE_YEAR as busYear,
                v.SERVICE_CLASS as seats,
                b.TOTAL_BID_AMT as totalPrice,
                b.BASE_FARE as baseFare,
                b.TOLL_FEE as tollFare,
                b.FUEL_FEE as fuelFare,
                b.ROOM_BOARD_FEE as roomBoardFare,
                b.DRIVER_TIP as otherFare,
                b.SERVICE_MEMO as memo,
                v.AMENITIES as amenities,
                v.VEHICLE_PHOTOS_JSON as photos
            FROM TB_BID b
            JOIN TB_USER u ON b.DRIVER_UUID = u.USER_UUID
            JOIN TB_DRIVER_BUS db ON b.BUS_UUID = db.BUS_UUID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE v ON b.BUS_UUID = v.BUS_ID
            WHERE b.BID_UUID = ?
        `, [bidUuidBuf]);

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
            const cleanPath = path.startsWith('uploads') ? '/' + path : path;
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
        } else if (!bid.amenities) {
            bid.amenities = [];
        }

        // 사진 ID 목록을 실제 경로로 변환
        let photoPaths = [];
        if (bid.photos) {
            try {
                const ids = typeof bid.photos === 'string' ? JSON.parse(bid.photos) : bid.photos;
                if (Array.isArray(ids)) {
                    photoPaths = await Promise.all(ids.map(async (id) => {
                        const [fileRows] = await pool.execute(
                            `SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = ?`,
                            [id]
                        );
                        return fileRows.length > 0 ? processUrl(fileRows[0].GCS_PATH) : null;
                    }));
                }
            } catch (e) {
                console.error('Photo parse error:', e);
            }
        }
        bid.photos = photoPaths.filter(p => p !== null);

        // 개인정보 (평문)
        bid.driverName = bid.driverName;
        bid.hpNo = bid.hpNo;

        // 경력 계산 (가입일로부터 현재까지 년수)
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
    const { bidUuid } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const bidUuidBuf = uuidToBuffer(bidUuid);

        // 1. 해당 입찰 정보 조회 (REQ_UUID 확인용)
        const [bidRows] = await connection.execute(
            'SELECT HEX(REQ_UUID) as reqUuid FROM TB_BID WHERE BID_UUID = ?',
            [bidUuidBuf]
        );

        if (bidRows.length === 0) {
            throw new Error('해당 입찰을 찾을 수 없습니다.');
        }

        const reqUuid = bidRows[0].reqUuid;
        const reqUuidBuf = uuidToBuffer(reqUuid);

        // 2. 다른 입찰 상태는 건드리지 않음 (필요 시 특정 조건 하에 실패 처리 가능)
        // 사용자가 "차량 하나에 대해서만 확정" 하기를 원하므로, 선택된 것만SELECTED로 변경.

        // 3. 선택된 입찰은 'SELECTED' 처리
        await connection.execute(
            "UPDATE TB_BID SET BID_STAT = 'SELECTED' WHERE BID_UUID = ?",
            [bidUuidBuf]
        );

        // 4. 모든 요청 차량이 예약되었는지 확인하여 마스터 상태 변경
        const [totalNeededRows] = await connection.execute(
            "SELECT SUM(REQ_BUS_CNT) as totalNeeded FROM TB_AUCTION_REQ_BUS WHERE REQ_UUID = ?",
            [reqUuidBuf]
        );
        const [totalConfirmedRows] = await connection.execute(
            "SELECT COUNT(*) as totalConfirmed FROM TB_BID WHERE REQ_UUID = ? AND BID_STAT = 'SELECTED'",
            [reqUuidBuf]
        );

        const totalNeeded = totalNeededRows[0].totalNeeded || 0;
        const totalConfirmed = totalConfirmedRows[0].totalConfirmed || 0;

        if (totalConfirmed >= totalNeeded) {
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET REQ_STAT = 'CONFIRM' WHERE REQ_UUID = ?",
                [reqUuidBuf]
            );
        } else if (totalConfirmed > 0) {
            // 일부 확정 상태 (필요 시 REQ_STAT에 'PARTIAL' 추가하거나 입찰중 유지)
            // 여기서는 입찰중(BIDDING)을 유지하여 추가 입찰을 받을 수 있게 함.
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET REQ_STAT = 'BIDDING' WHERE REQ_UUID = ?",
                [reqUuidBuf]
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
