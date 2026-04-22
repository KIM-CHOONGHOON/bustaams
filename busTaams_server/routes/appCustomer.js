const express = require('express');
const router = express.Router();
const { pool, getNextId, bucket, bucketName } = require('../db');
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

// GCS 업로드를 위한 메모리 스토리지 설정
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

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
            'SELECT USER_NM, HP_NO, EMAIL, USER_ID, USER_TYPE, PROFILE_IMG_PATH, PROFILE_FILE_ID FROM TB_USER WHERE USER_ID = ?',
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
                email: user.EMAIL || user.USER_ID, // EMAIL 필드 우선 사용
                userType: user.USER_TYPE,
                userId: user.USER_ID,
                userImage: user.PROFILE_IMG_PATH
            }
        });
    } catch (error) {
        console.error('App Customer profile fetch error:', error);
        res.status(500).json({ status: 500, error: '프로필 데이터를 가져오는 데 실패했습니다.' });
    }
});

// 2. 프로필 정보 업데이트
router.post('/profile/update', authenticateToken, async (req, res) => {
    const { name, phone, email } = req.body;
    try {
        const userId = req.user.userId;

        // 0. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

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
        if (email) {
            updates.push('EMAIL = ?');
            params.push(email);
        }

        // 수정 시에는 MOD_ID만 업데이트
        updates.push('MOD_ID = ?');
        params.push(custId);
        updates.push('MOD_DT = NOW()');

        if (updates.length === 2) { // MOD_ID와 MOD_DT만 있는 경우
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

    // 비밀번호 정규식: 8자 이상, 영문, 숫자, 특수문자 조합
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
            message: '비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 모두 포함해야 합니다.' 
        });
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

        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // 1. 비밀번호 업데이트 (MOD_ID, MOD_DT 포함)
        await connection.execute(
            'UPDATE TB_USER SET PASSWORD = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?', 
            [hashedNewPassword, custId, userId]
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
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE')) as countProgressing,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT = 'BIDDING') as countWaitingApproval
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

// 5. 휴대폰 인증번호 발송
router.post('/auth/send-code', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.body;
        const userId = req.user.userId;

        if (!phone) {
            return res.status(400).json({ success: false, error: '휴대폰 번호가 필요합니다.' });
        }

        // 6자리 인증번호 생성
        const authCode = Math.floor(100000 + Math.random() * 900000).toString();
        const msgContent = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;
        
        // TB_SMS_LOG 기록 - DB 오류가 전체 로직을 중단시키지 않도록 예외 처리 분리
        try {
            // userId로 CUST_ID 조회
            const [userRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
            const receiverId = userRows.length > 0 ? userRows[0].CUST_ID : '0000000000';
            const logSeq = await getNextId('TB_SMS_LOG', 'LOG_SEQ', 10);

            await pool.execute(`
                INSERT INTO TB_SMS_LOG (
                    LOG_SEQ, SEND_CATEGORY, SENDER_ID, RECEIVER_ID, REG_ID, RECEIVER_PHONE, MSG_CONTENT, MSG_TYPE, SEND_STAT
                ) VALUES (?, 'OTHER', 'SYSTEM', ?, ?, ?, ?, 'SMS', 'SUCCESS')
            `, [logSeq, receiverId, receiverId, phone.replace(/-/g, ''), msgContent]);
        } catch (dbError) {
            console.error('SMS Logging Error (로그 저장 실패):', dbError.message);
            // DB 기록에 실패하더라도 인증 서비스는 제공 (사용자 편의)
        }

        console.log(`[SMS AUTH] To: ${phone}, Code: ${authCode}`);

        res.json({ 
            success: true, 
            message: '인증번호가 발송되었습니다.',
            code: authCode 
        });
    } catch (err) {
        console.error('Critical Send SMS Error:', err);
        res.status(500).json({ success: false, error: '인증번호 발송 중 내부 서버 오류가 발생했습니다: ' + err.message });
    }
});

// 6. 휴대폰 인증번호 확인 (DB 데이터 대조)
router.post('/auth/verify-code', authenticateToken, async (req, res) => {
    try {
        const { code, phone } = req.body;
        const userId = req.user.userId;

        if (!code || !phone) {
            return res.status(400).json({ success: false, error: '인증번호와 휴대폰 번호가 모두 필요합니다.' });
        }

        const purePhone = phone.replace(/-/g, '');

        // 최근 5분 이내의 가장 최신 인증 로그 조회
        const [rows] = await pool.execute(
            `SELECT MSG_CONTENT FROM TB_SMS_LOG 
             WHERE RECEIVER_PHONE = ? AND SEND_CATEGORY = 'OTHER'
             AND REG_DT >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
             ORDER BY REG_DT DESC LIMIT 1`,
            [purePhone]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: '만료되었거나 발송된 인증번호가 없습니다.' });
        }

        const msgContent = rows[0].MSG_CONTENT;
        const isMatch = msgContent.includes(`[${code}]`);

        if (isMatch) {
            res.json({ success: true, message: '인증되었습니다.' });
        } else {
            res.status(400).json({ success: false, error: '인증번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        console.error('Verify SMS Error:', err);
        res.status(500).json({ success: false, error: '인증 확인 중 오류가 발생했습니다.' });
    }
});

// 7. 대기 중인 요청 목록 (진행중 / 승인대기중 필터링 적용)
router.get('/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.query; // 'progress' 또는 'waiting'

        // 0. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

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

        const [rows] = await pool.execute(sql, [custId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('App pending-requests error:', error);
        res.status(500).json({ error: '조회 실패' });
    }
});

// 6. 프로필 이미지 업로드 (GCS 연동 및 TB_FILE_MASTER 표준화)
router.post('/profile/upload-image', authenticateToken, memoryUpload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
        }

        const userId = req.user.userId;
        
        // 1. CUST_ID 및 기존 PROFILE_FILE_ID 조회
        const [userRows] = await pool.execute('SELECT CUST_ID, PROFILE_FILE_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const { CUST_ID: custId, PROFILE_FILE_ID: existingFileId } = userRows[0];
        
        const ext = path.extname(req.file.originalname).replace('.', '') || 'png';
        const fileId = existingFileId || await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
        const gcsFileName = `profiles/${fileId}.${ext}`;
        const file = bucket.file(gcsFileName);

        // 2. GCS 업로드
        await file.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype }
        });

        const imageUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;

        // 3. TB_FILE_MASTER 처리
        if (existingFileId) {
            // 기존 파일 정보가 있으면 수정 (MOD_ID만 업데이트)
            await pool.execute(
                `UPDATE TB_FILE_MASTER 
                 SET GCS_PATH = ?, ORG_FILE_NM = ?, FILE_EXT = ?, MOD_ID = ?, MOD_DT = NOW() 
                 WHERE FILE_ID = ?`,
                [imageUrl, req.file.originalname, ext, custId, existingFileId]
            );
        } else {
            // 기존 파일 정보가 없으면 신규 등록 (REG_ID, MOD_ID 모두 CUST_ID 설정)
            await pool.execute(
                `INSERT INTO TB_FILE_MASTER (
                    FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID
                ) VALUES (?, 'PROFILE', ?, ?, ?, ?, ?, ?)`,
                [fileId, bucketName, imageUrl, req.file.originalname, ext, custId, custId]
            );
        }

        // 4. TB_USER 업데이트 (이미지 경로 및 파일 ID 반영, MOD_ID 설정)
        await pool.execute(
            'UPDATE TB_USER SET PROFILE_IMG_PATH = ?, PROFILE_FILE_ID = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [imageUrl, fileId, custId, userId]
        );

        res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            message: '프로필 이미지가 GCS에 성공적으로 업로드되었습니다.'
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

        // [보안 체크] 소유자 대조 (CUST_ID 기반)
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [travelerId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : travelerId;

        if (reservation.ownerId !== custId) {
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

// 신규 추가: 견적 요청 저장 (앱 전용)
router.post('/auction-req', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.userId;
        const { startAddr, endAddr, startDt, endDt, passengerCnt, buses, vias, tripTitle: clientTripTitle } = req.body;
        
        console.log('[Auction Request] Incoming Data:', { userId, startAddr, endAddr, startDt, endDt });

        if (!startAddr || !endAddr || !startDt || !endDt) {
            throw new Error('필수 정보(출발지, 도착지, 날짜)가 누락되었습니다.');
        }

        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        // ID 생성
        const reqId = await getNextId('TB_AUCTION_REQ', 'REQ_ID', 10);
        
        // 데이터 정제
        const safeBuses = Array.isArray(buses) ? buses : [];
        const totalReqAmt = safeBuses.reduce((acc, b) => acc + (parseInt(b.reqAmt, 10) || 0), 0);
        const tripTitle = clientTripTitle || `${startAddr.split(' ')[0]} -> ${endAddr.split(' ')[0]} 여정`;
        
        // MySQL DATETIME 형식으로 변환 (ISO -> YYYY-MM-DD HH:mm:ss)
        const formatDt = (dtStr) => dtStr.replace('T', ' ').replace('Z', '').substring(0, 19);

        // 탑승 인원 수 정제 (프론트에서 받은 값, 없으면 1 기본)
        const safePassengerCnt = parseInt(passengerCnt, 10) || 1;
        // 요청 차량 수 = safeBuses 배열 길이
        const busChangCnt = safeBuses.length;

        console.log('[Auction Request] Inserting Master REQ:', reqId);
        await connection.execute(`
            INSERT INTO TB_AUCTION_REQ (
                REQ_ID, TRAVELER_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, BUS_CHANG_CNT, PASSENGER_CNT, REQ_AMT, DATA_STAT, EXPIRE_DT,
                REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUCTION', DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)
        `, [
            reqId,
            custId,
            tripTitle,
            startAddr,
            endAddr,
            formatDt(startDt),
            formatDt(endDt),
            busChangCnt,
            safePassengerCnt,
            totalReqAmt,
            custId,
            custId
        ]);

        if (safeBuses.length > 0) {
            const lastBusIdStr = await getNextId('TB_AUCTION_REQ_BUS', 'REQ_BUS_ID', 10);
            let nextBusIdNum = parseInt(lastBusIdStr, 10);

            for (const bus of safeBuses) {
                const reqBusId = nextBusIdNum.toString().padStart(10, '0');
                const busAmt = parseInt(bus.reqAmt, 10) || 0;
                
                // 수수료 계산 (6.6%, 5.5%, 1.1%)
                const feeTotal = Math.floor(busAmt * 0.066);
                const feeRefund = Math.floor(busAmt * 0.055);
                const feeAttribution = busAmt * 0.011; // 1.1% (decimal 18,3)

                console.log('[Auction Request] Inserting Bus:', reqBusId);
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_BUS_ID, REQ_ID, BUS_TYPE_CD, DATA_STAT, TOLLS_AMT, FUEL_COST, 
                        RES_BUS_AMT, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                        REG_ID, MOD_ID
                    ) VALUES (?, ?, ?, 'AUCTION', ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    reqBusId, reqId, bus.busTypeCd, parseInt(bus.tollsAmt, 10) || 0, parseInt(bus.fuelCost, 10) || 0, 
                    busAmt, feeTotal, feeRefund, feeAttribution, custId, custId
                ]);
                nextBusIdNum++;
            }
        }

        const safeVias = Array.isArray(vias) ? vias : [];
        if (safeVias.length > 0) {
             for (let i = 0; i < safeVias.length; i++) {
                 const via = safeVias[i];
                 const viaType = (via.viaType || 'START_WAY').toUpperCase();
                 console.log('[Auction Request] Inserting Via:', i + 1);
                 await connection.execute(`
                     INSERT INTO TB_AUCTION_REQ_VIA (
                         REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, REG_ID, MOD_ID
                     ) VALUES (?, ?, ?, ?, ?, ?)
                 `, [reqId, i + 1, viaType, via.addr || via.viaAddr || '', custId, custId]);
             }
        } else {
            console.log('[Auction Request] Inserting Default Vias (Start/Round/End)');
            // 출발지
            await connection.execute(`INSERT INTO TB_AUCTION_REQ_VIA (REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, REG_ID, MOD_ID) VALUES (?, 1, 'START_NODE', ?, ?, ?)`, [reqId, startAddr, custId, custId]);
            // 회차지 (도착지)
            await connection.execute(`INSERT INTO TB_AUCTION_REQ_VIA (REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, REG_ID, MOD_ID) VALUES (?, 2, 'ROUND_TRIP', ?, ?, ?)`, [reqId, endAddr, custId, custId]);
            // 최종도착지 (복귀)
            await connection.execute(`INSERT INTO TB_AUCTION_REQ_VIA (REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, REG_ID, MOD_ID) VALUES (?, 3, 'END_NODE', ?, ?, ?)`, [reqId, startAddr, custId, custId]);
        }

        await connection.commit();
        console.log('[Auction Request] Success:', reqId);
        res.status(201).json({ success: true, message: '요청이 완료되었습니다.', reqId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Auction Request Critical Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '요청 저장 중 오류가 발생했습니다.',
            detail: error.sqlMessage || null // SQL 에러 메시지가 있으면 전달
        });
    } finally {
        if (connection) connection.release();
    }
});

// 10. 입찰 선정 및 예약 확정 (앱 전용)
router.post('/confirm-bid', authenticateToken, async (req, res) => {
    const { bidUuid: resId } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.userId;
        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

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
            "UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'CONFIRM', MOD_ID = ?, MOD_DT = NOW() WHERE RES_ID = ?",
            [custId, resId]
        );

        // 3. 모든 요청 차량이 예약되었는지 확인하여 마스터 상태 변경
        // TB_AUCTION_REQ_BUS 에서 요청된 차량 총 수 (row 개수)
        const [totalNeededRows] = await connection.execute(
            "SELECT COUNT(*) as totalNeeded FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?",
            [reqId]
        );
        const [totalConfirmedRows] = await connection.execute(
            "SELECT COUNT(*) as totalConfirmed FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'",
            [reqId]
        );

        const totalNeeded = totalNeededRows[0].totalNeeded || 0;
        const totalConfirmed = totalConfirmedRows[0].totalConfirmed || 0;

        if (totalNeeded > 0 && totalConfirmed >= totalNeeded) {
            // 모든 차량 예약 확정
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
                [custId, reqId]
            );
        } else if (totalConfirmed > 0) {
            // 일부 차량만 예약 확정
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'BIDDING', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
                [custId, reqId]
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

// 11. 1:1 문의 내역 조회
router.get('/inquiries', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            `SELECT INQ_SEQ, INQ_CATEGORY, TITLE, CONTENT, INQ_STAT, REG_DT, 
                    REPLY_CONTENT, REPLY_DT,
                    (SELECT CD_NM_KO FROM TB_COMMON_CODE WHERE GRP_CD = 'INQ_CATEGORY' AND DTL_CD = INQ_CATEGORY) as CATEGORY_NM
             FROM TB_INQUIRY 
             WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?) 
             ORDER BY REG_DT DESC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows.map(row => ({
                id: row.INQ_SEQ, // 앱 호환성을 위해 id 필드에 INQ_SEQ 매핑
                category: row.CATEGORY_NM || row.INQ_CATEGORY,
                categoryCode: row.INQ_CATEGORY,
                title: row.TITLE,
                status: row.INQ_STAT === 'COMPLETED' ? '답변 완료' : '답변 대기',
                isCompleted: row.INQ_STAT === 'COMPLETED',
                date: row.REG_DT ? new Date(row.REG_DT).toLocaleDateString('ko-KR').replace(/\. /g, '/').replace('.', '') : '',
                replyCount: row.REPLY_CONTENT ? 1 : 0
            }))
        });
    } catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ success: false, error: '문의 내역을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 12. 1:1 문의 등록
router.post('/inquiries', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, content, category } = req.body;

        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;
        
        // INQ_SEQ 채번 (CUST_ID별 순번)
        const [seqRows] = await pool.execute('SELECT IFNULL(MAX(INQ_SEQ), 0) + 1 as nextSeq FROM TB_INQUIRY WHERE CUST_ID = ?', [custId]);
        const nextSeq = seqRows[0].nextSeq;

        await pool.execute(
            `INSERT INTO TB_INQUIRY (CUST_ID, INQ_SEQ, INQ_CATEGORY, TITLE, CONTENT, INQ_STAT, REG_DT, REG_ID, MOD_ID)
             VALUES (?, ?, ?, ?, ?, 'WAITING', NOW(), ?, ?)`,
            [custId, nextSeq, category, title, content, custId, custId]
        );

        res.status(201).json({
            success: true,
            message: '문의가 정상적으로 등록되었습니다.',
            inquiryId: nextSeq
        });
    } catch (error) {
        console.error('Post inquiry error:', error);
        res.status(500).json({ success: false, error: '문의 등록 중 오류가 발생했습니다.' });
    }
});

// 13. 1:1 문의 상세 조회
router.get('/inquiries/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const inquiryId = req.params.id;

        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [rows] = await pool.execute(
            `SELECT 
                i.INQ_SEQ as id,
                (SELECT CD_NM_KO FROM TB_COMMON_CODE WHERE GRP_CD = 'INQ_CATEGORY' AND DTL_CD = i.INQ_CATEGORY) as category,
                i.TITLE as title,
                i.CONTENT as content,
                i.INQ_STAT as status,
                DATE_FORMAT(i.REG_DT, '%Y.%m.%d') as date,
                i.REPLY_CONTENT as replyContent,
                DATE_FORMAT(i.REPLY_DT, '%Y.%m.%d %H:%i %p') as replyDate
             FROM TB_INQUIRY i
             WHERE i.INQ_SEQ = ? AND i.CUST_ID = ?`,
            [inquiryId, custId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '문의를 찾을 수 없습니다.' });
        }

        const inquiry = rows[0];
        // 상태값 한글 변환
        inquiry.statusText = inquiry.status === 'COMPLETED' ? '답변 완료' : '답변 대기';
        inquiry.isCompleted = inquiry.status === 'COMPLETED';

        res.status(200).json({
            success: true,
            data: inquiry
        });
    } catch (error) {
        console.error('Get inquiry detail error:', error);
        res.status(500).json({ success: false, error: '문의 상세 조회 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
