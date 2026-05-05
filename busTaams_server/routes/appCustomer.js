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


// 0. 대시보드 통계 조회
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 1. 사용자 정보 및 CUST_ID 조회
        const [uRows] = await pool.execute(`
            SELECT u.CUST_ID, u.USER_NM, 
                   CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as USER_IMAGE 
            FROM TB_USER u 
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
            WHERE u.USER_ID = ?
        `, [userId]);

        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const user = uRows[0];
        const custId = user.CUST_ID;

        // 2. 통계 조회 (진행중, 승인대기)
        console.log(`[Dashboard] Fetching stats for CustID: ${custId}, UserID: ${userId}`);
        const [statsRows] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT CASE 
                    WHEN r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') 
                    AND NOT EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    AND NOT EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    THEN r.REQ_ID END) as countProgressing,
                COUNT(DISTINCT CASE 
                    WHEN r.DATA_STAT = 'BIDDING' 
                    OR (r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND (
                        EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                        OR EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    ))
                    THEN r.REQ_ID END) as countWaitingApproval
            FROM TB_AUCTION_REQ r
            WHERE r.TRAVELER_ID IN (?, ?)
        `, [custId, userId]);

        const stats = statsRows[0] || { countProgressing: 0, countWaitingApproval: 0 };
        console.log(`[Dashboard] Stats Result:`, stats);

        // 이미지 경로 처리
        let userImage = user.USER_IMAGE;
        if (userImage && userImage.startsWith('http')) {
            userImage = `/api/common/display-image?path=${encodeURIComponent(userImage)}`;
        }

        res.json({
            success: true,
            data: {
                countProgressing: stats.countProgressing || 0,
                countWaitingApproval: stats.countWaitingApproval || 0,
                userName: user.USER_NM,
                profileImage: userImage
            }
        });
    } catch (error) {
        console.error('App Dashboard Fetch Error:', error);
        res.status(500).json({ success: false, error: '대시보드 데이터를 가져오는데 실패했습니다.' });
    }
});

// 1. 프로필 정보 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(`
            SELECT u.USER_NM, u.HP_NO, u.EMAIL, u.USER_ID, u.USER_TYPE, 
                   CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as USER_IMAGE, 
                   u.PROFILE_FILE_ID 
            FROM TB_USER u 
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
            WHERE u.USER_ID = ?
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];

        // 이미지 경로 처리 (GCS URL인 경우 백엔드 프록시 경로로 변환)
        let userImage = user.USER_IMAGE;
        if (userImage && userImage.startsWith('http')) {
            userImage = `/api/common/display-image?path=${encodeURIComponent(userImage)}`;
        }

        res.status(200).json({
            status: 200,
            success: true,
            data: {
                name: user.USER_NM || '사용자',
                phone: user.HP_NO,
                email: user.EMAIL || user.USER_ID,
                userType: user.USER_TYPE,
                userId: user.USER_ID,
                profileImage: userImage || null
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
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as profileImage,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE')) as countProgressing,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT = 'BIDDING') as countWaitingApproval
             FROM TB_USER u
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
             WHERE u.USER_ID = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
        }

        const stats = rows[0];
        
        // 이미지 경로 처리 (GCS URL인 경우 백엔드 프록시 경로로 변환)
        let profileImage = stats.profileImage;
        if (profileImage && profileImage.startsWith('http')) {
            profileImage = `/api/common/display-image?path=${encodeURIComponent(profileImage)}`;
        }

        res.status(200).json({
            success: true,
            status: 200,
            data: {
                userName: stats.userName || '사용자',
                profileImage: profileImage || null,
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

        let statusFilter = "";
        if (type === 'progress') {
            statusFilter = `
                r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') 
                AND NOT EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
            `;
        } else if (type === 'waiting') {
            statusFilter = `
                r.DATA_STAT = 'BIDDING' 
                OR (r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING'))
            `;
        } else {
            statusFilter = "r.DATA_STAT IN ('AUCTION', 'BIDDING', 'BUS_CHANGE')";
        }

        const sql = `
            SELECT 
                REQ_ID as reqUuid, 
                TRIP_TITLE as tripTitle, 
                START_ADDR as startAddr, 
                END_ADDR as endAddr, 
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundAddr,
                DATE_FORMAT(START_DT, '%Y-%m-%d') as startDt, 
                DATA_STAT as reqStat
            FROM TB_AUCTION_REQ r
            WHERE TRAVELER_ID = ? AND ${statusFilter}
            ORDER BY REG_DT DESC
        `;

        const [rows] = await pool.execute(sql, [custId]);

        // 각 요청에 대한 차량(buses) 정보 추가
        for (let row of rows) {
            const [busRows] = await pool.execute(`
                SELECT 
                    rb.BUS_TYPE_CD as busType,
                    rb.RES_BUS_AMT as reqAmt,
                    rb.DATA_STAT as busStatus,
                    u.USER_NM as driverName,
                    db.VEHICLE_NO as busNo
                FROM TB_AUCTION_REQ_BUS rb
                LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID 
                    AND res.DATA_STAT = 'CONFIRM'
                LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
                LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON res.BUS_ID = db.BUS_ID
                WHERE rb.REQ_ID = ?
            `, [row.reqUuid]);
            row.buses = busRows;
        }

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[Pending Requests] Error:', error);
        res.status(500).json({ success: false, error: '견적 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 8. 특정 요청에 대한 상세 견적 리스트 조회 (유닛별 그룹화)
router.get('/estimate-list/:reqId', authenticateToken, async (req, res) => {
    try {
        const { reqId } = req.params;
        const custId = req.user.custId;

        console.log(`[DEBUG] Fetching estimate list for REQ_ID: ${reqId}, CUST_ID: ${custId}`);

        // 1. 여정 요약 정보 조회 (TRAVELER_ID 조건 추가로 보안 강화)
        // 만약 custId가 없거나 매칭되지 않으면 userId로 한번 더 확인 시도
        let [tripRows] = await pool.execute(`
            SELECT 
                REQ_ID as id,
                TRIP_TITLE as title,
                DATE_FORMAT(START_DT, '%Y/%m/%d %H:%i') as startDt,
                DATE_FORMAT(END_DT, '%Y/%m/%d %H:%i') as endDt,
                DATE_FORMAT(START_DT, '%Y/%m/%d') as startDate,
                DATE_FORMAT(END_DT, '%Y/%m/%d') as endDate,
                PASSENGER_CNT as passengers,
                DATA_STAT as status,
                START_ADDR as startAddr,
                END_ADDR as endAddr,
                REQ_AMT as totalAmt
            FROM TB_AUCTION_REQ
            WHERE REQ_ID = ? AND TRAVELER_ID = ?
        `, [reqId, custId]);

        if (tripRows.length === 0) {
            // Fallback: CUST_ID가 아닌 USER_ID로 확인 (연동 이슈 대비)
            const [fallbackRows] = await pool.execute(`
                SELECT r.* FROM TB_AUCTION_REQ r
                JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
                WHERE r.REQ_ID = ? AND u.USER_ID = ?
            `, [reqId, req.user.userId]);
            
            if (fallbackRows.length > 0) {
                tripRows = fallbackRows.map(r => ({
                    id: r.REQ_ID, title: r.TRIP_TITLE, startAddr: r.START_ADDR, endAddr: r.END_ADDR,
                    startDt: r.START_DT, endDt: r.END_DT, passengers: r.PASSENGER_CNT, status: r.DATA_STAT,
                    totalAmt: r.REQ_AMT
                }));
            } else {
                console.log(`[DEBUG] No request found for REQ_ID: ${reqId} and CUST_ID: ${custId} (User: ${req.user.userId})`);
                return res.status(404).json({ success: false, error: '요청 정보를 찾을 수 없습니다.' });
            }
        }

        const tripInfo = tripRows[0];

        // 1-1. 경유지 포함 전체 경로 구성
        const [viaRows] = await pool.execute(`
            SELECT 
                VIA_SEQ as seq,
                VIA_TYPE as type,
                VIA_ADDR as addr
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
        `, [reqId]);

        const fullRoute = [];
        fullRoute.push({ type: 'START', addr: tripInfo.startAddr, title: '출발지' });
        
        viaRows.forEach(v => {
            // 이미 출발지와 도착지를 별도로 추가하므로 START_NODE와 END_NODE는 제외합니다.
            if (v.type === 'START_NODE' || v.type === 'END_NODE') return;

            let title = '경유지';
            if (v.type === 'START_WAY') title = '경로1';
            else if (v.type === 'END_WAY') title = '경로2';
            else if (v.type === 'ROUND_TRIP') title = '회차지';
            fullRoute.push({ type: v.type, addr: v.addr, title: title });
        });
        
        fullRoute.push({ type: 'END', addr: tripInfo.endAddr, title: '도착지' });
        tripInfo.fullRoute = fullRoute;

        // 2. 차량별 입찰 정보 조회
        const [bidRows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ as unitSeq,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as unitStat,
                rb.RES_BUS_AMT as unitReqAmt,
                res.RES_ID as estimateId,
                res.DRIVER_BIDDING_PRICE as price,
                res.DATA_STAT as bidStat,
                u.USER_NM as driverName,
                u.JOIN_DT as joinDt,
                (SELECT ROUND(AVG(STAR_RATING), 1) FROM TB_TRIP_REVIEW WHERE DRIVER_ID = u.CUST_ID) as rating,
                db.MODEL_NM as busModel,
                db.MANUFACTURE_YEAR as busYear,
                db.VEHICLE_NO as busNo,
                db.AMENITIES as amenities,
                db.HAS_ADAS as hasAdas,
                DATE_FORMAT(db.INSURANCE_EXP_DT, '%Y-%m-%d') as insuranceExpDt,
                DATE_FORMAT(db.LAST_INSPECT_DT, '%Y-%m-%d') as lastInspectDt,
                db.VEHICLE_PHOTOS_JSON as busPhotos,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ
            LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON res.BUS_ID = db.BUS_ID
            WHERE rb.REQ_ID = ?
            ORDER BY rb.REQ_BUS_SEQ ASC, res.DRIVER_BIDDING_PRICE ASC
        `, [reqId]);

        // 모든 차량 사진 ID 수집하여 한번에 URL 조회 (N+1 방지)
        const allPhotoIds = [];
        bidRows.forEach(row => {
            if (row.busPhotos) {
                try {
                    const ids = typeof row.busPhotos === 'string' ? JSON.parse(row.busPhotos) : row.busPhotos;
                    if (Array.isArray(ids)) allPhotoIds.push(...ids);
                } catch (e) {}
            }
        });

        let photoMap = {};
        if (allPhotoIds.length > 0) {
            const uniqueIds = [...new Set(allPhotoIds)];
            const [pRows] = await pool.execute(
                `SELECT FILE_ID, CONCAT('/api/common/display-image?path=', GCS_PATH) as url FROM TB_FILE_MASTER WHERE FILE_ID IN (${uniqueIds.map(() => '?').join(',')})`,
                uniqueIds
            );
            pRows.forEach(p => photoMap[p.FILE_ID] = p.url);
        }

        // 데이터를 유닛별로 그룹화
        const units = [];
        const unitMap = {};

        bidRows.forEach(row => {
            if (!unitMap[row.unitSeq]) {
                unitMap[row.unitSeq] = {
                    unitSeq: row.unitSeq,
                    busType: row.busType,
                    unitStat: row.unitStat,
                    unitReqAmt: row.unitReqAmt,
                    estimates: []
                };
                units.push(unitMap[row.unitSeq]);
            }
            if (row.estimateId) {
                let tags = [];
                try {
                    if (row.amenities) {
                        const parsed = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : row.amenities;
                        if (Array.isArray(parsed)) {
                            tags = parsed;
                        } else if (typeof parsed === 'object') {
                            const mapping = {
                                'Table': '테이블',
                                'Wi-Fi': '와이파이',
                                'USB-CHARGE': 'USB 충전',
                                'Refrigerator': '냉장고',
                                'Individual-Screen': '개별 모니터',
                                'Air-Conditioner': '에어컨',
                                'Heating': '히터'
                            };
                            tags = Object.keys(parsed)
                                .filter(key => parsed[key] === true)
                                .map(key => mapping[key] || key);
                        }
                    }
                } catch (e) {
                    console.error('[JSON Parse Error] Amenities:', e);
                }

                // 차량 사진들 매핑
                let busImages = [];
                if (row.busPhotos) {
                    try {
                        const ids = typeof row.busPhotos === 'string' ? JSON.parse(row.busPhotos) : row.busPhotos;
                        if (Array.isArray(ids)) {
                            busImages = ids.map(id => photoMap[id]).filter(Boolean);
                        }
                    } catch (e) {}
                }

                unitMap[row.unitSeq].estimates.push({
                    id: row.estimateId,
                    driverName: row.driverName,
                    rating: row.rating || '0.0',
                    busInfo: `${row.busYear || ''}년형 ${row.busModel || ''} (${row.busNo || ''})`,
                    experience: row.joinDt ? Math.max(1, new Date().getFullYear() - new Date(row.joinDt).getFullYear()) : 1,
                    price: row.price,
                    tags: tags,
                    image: row.driverImage || 'https://via.placeholder.com/150',
                    busImages: busImages.length > 0 ? busImages : ['https://via.placeholder.com/600x400?text=No+Vehicle+Image'],
                    hasAdas: row.hasAdas || 'N',
                    insuranceExpDt: row.insuranceExpDt || '-',
                    lastInspectDt: row.lastInspectDt || '-',
                    status: row.bidStat,
                    isSelected: row.bidStat === 'CONFIRM'
                });
            }
        });

        res.json({ 
            success: true, 
            data: {
                tripSummary: {
                    title: tripInfo.title,
                    date: `${tripInfo.startDate} - ${tripInfo.endDate}`,
                    startDt: tripInfo.startDt,
                    endDt: tripInfo.endDt,
                    startAddr: tripInfo.startAddr,
                    endAddr: tripInfo.endAddr,
                    passengers: `성인 ${tripInfo.passengers}명`,
                    status: tripInfo.status,
                    totalAmt: tripInfo.totalAmt,
                    waypoints: viaRows,
                    fullRoute: tripInfo.fullRoute
                },
                units: units
            }
        });
    } catch (error) {
        console.error('Fetch estimate list error:', error);
        res.status(500).json({ success: false, error: '견적 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// [추가] 단건 견적 승인
router.post('/approve-bid', authenticateToken, async (req, res) => {
    const { resId } = req.body;
    try {
        // 1. 해당 예약 정보 조회
        const [bidRows] = await pool.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [resId]);
        if (bidRows.length === 0) return res.status(404).json({ success: false, error: '입찰 정보를 찾을 수 없습니다.' });
        
        const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq } = bidRows[0];

        // 2. 해당 차량의 모든 입찰을 일단 대기 상태로 (혹은 다른 로직)
        // 3. 선택된 입찰만 CONFIRM
        await pool.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW() WHERE RES_ID = ?', [resId]);
        
        // 4. 차량 상태도 CONFIRM으로 변경
        await pool.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [reqId, unitSeq]);

        // 5. 모든 차량이 확정되었는지 확인 (사용자 요청: 모든 정보가 CONFIRM이면 마스터도 CONFIRM)
        const [busStats] = await pool.execute(
            'SELECT COUNT(*) as total, SUM(CASE WHEN DATA_STAT = "CONFIRM" THEN 1 ELSE 0 END) as confirmed FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
            [reqId]
        );
        
        if (busStats[0].total > 0 && busStats[0].total === busStats[0].confirmed) {
            await pool.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM", MOD_DT = NOW() WHERE REQ_ID = ?', [reqId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Approve bid error:', error);
        res.status(500).json({ success: false, error: '승인 처리 중 오류가 발생했습니다.' });
    }
});

// [추가] 전체 견적 승인
router.post('/approve-all', authenticateToken, async (req, res) => {
    const { reqId } = req.body;
    try {
        // 현재 BIDDING 상태인 모든 차량에 대해, 각 차량별로 첫 번째 입찰을 승인하는 예시 로직
        // (실제로는 사용자가 선택한 견적들이 있어야 하지만, 요청에 따라 전체 승인 처리)
        
        const [bids] = await pool.execute(`
            SELECT RES_ID, REQ_BUS_SEQ 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'
            GROUP BY REQ_BUS_SEQ
        `, [reqId]);

        for (const bid of bids) {
            await pool.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW() WHERE RES_ID = ?', [bid.RES_ID]);
            await pool.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [reqId, bid.REQ_BUS_SEQ]);
        }

        // 전체 마스터 상태 업데이트
        await pool.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ?', [reqId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Approve all error:', error);
        res.status(500).json({ success: false, error: '전체 승인 처리 중 오류가 발생했습니다.' });
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
        const { CUST_ID: custId } = userRows[0];
        
        const ext = path.extname(req.file.originalname).replace('.', '') || 'png';
        // 캐싱 문제를 피하기 위해 항상 새로운 fileId를 생성합니다.
        const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
        const gcsFileName = `profiles/${fileId}.${ext}`;
        const file = bucket.file(gcsFileName);

        // 2. GCS 업로드
        await file.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype }
        });

        // 파일을 공개로 설정하여 앱에서 직접 접근 가능하게 함
        try {
            await file.makePublic();
        } catch (e) {
            console.log('GCS makePublic failed (likely uniform bucket-level access):', e.message);
        }

        const imageUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;

        // 3. TB_FILE_MASTER 신규 등록 (프로필은 이력을 남기거나 URL 변경을 위해 신규 등록 권장)
        await pool.execute(
            `INSERT INTO TB_FILE_MASTER (
                FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID
            ) VALUES (?, 'PROFILE', ?, ?, ?, ?, ?, ?)`,
            [fileId, bucketName, imageUrl, req.file.originalname, ext, custId, custId]
        );

        // 4. TB_USER 업데이트 (미사용 컬럼 USER_IMAGE 제외, PROFILE_FILE_ID만 반영)
        await pool.execute(
            'UPDATE TB_USER SET PROFILE_FILE_ID = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [fileId, custId, userId]
        );

        // 프론트엔드 즉시 반영을 위해 중계 경로로 변환하여 응답
        const proxyImageUrl = `/api/common/display-image?path=${encodeURIComponent(imageUrl)}`;

        res.status(200).json({
            success: true,
            imageUrl: proxyImageUrl,
            message: '프로필 이미지가 성공적으로 변경되었습니다.'
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
                    WHEN DATA_STAT = 'AUCTION' THEN '견적대기중..'
                    WHEN DATA_STAT = 'BIDDING' THEN '승인대기중...'
                    WHEN DATA_STAT = 'CONFIRM' THEN '예약 확정...'
                    WHEN DATA_STAT = 'DONE' THEN '운행 종료...'
                    WHEN DATA_STAT = 'TRAVELER_CANCEL' THEN '전체 취소'
                    WHEN DATA_STAT = 'DRIVER_CANCEL' THEN '기사 취소'
                    WHEN DATA_STAT = 'BUS_CHANGE' THEN '변경 요청'
                    WHEN DATA_STAT = 'BUS_CANCEL' THEN '대수 취소'
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
            SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
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

        // [C] 신청 차량 목록 및 입찰 현황 조회 (확정된 기사 정보 포함)
        const [busRows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ as reqBusUuid,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as status,
                rb.RES_BUS_AMT as price,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
                 WHERE b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ AND b.DATA_STAT = 'BIDDING') as bidCount,
                res.DRIVER_ID as driverId,
                u_driver.USER_NM as driverName,
                dv.VEHICLE_NO as busNo,
                dv.MODEL_NM as busModel,
                res.OFFER_PRICE as confirmedPrice,
                res.DATA_STAT as resStatus
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT = 'CONFIRM'
            LEFT JOIN TB_USER u_driver ON res.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON res.BUS_ID = dv.BUS_ID
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
            JOIN TB_USER u ON b.DRIVER_ID COLLATE utf8mb4_unicode_ci = u.CUST_ID COLLATE utf8mb4_unicode_ci
            JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
            WHERE b.REQ_ID COLLATE utf8mb4_unicode_ci = ? AND b.DATA_STAT IN ('BIDDING', 'CONFIRM')
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
                SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
                FROM TB_AUCTION_REQ_VIA
                WHERE REQ_ID = ?
                ORDER BY VIA_SEQ ASC
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

        // 이미지 경로 처리 (GCS URL인 경우 백엔드 프록시 경로로 변환)
        const processedRows = rows.map(row => {
            let avatar = row.avatar;
            if (avatar && avatar.startsWith('http')) {
                avatar = `/api/common/display-image?path=${encodeURIComponent(avatar)}`;
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
                b.REQ_ID as reqId,
                u.USER_NM as driverName,
                u.PROFILE_IMG_PATH as avatar,
                u.JOIN_DT as joinDt,
                u.HP_NO as hpNo,
                db.SERVICE_CLASS as busType,
                db.MODEL_NM as busModel,
                db.MANUFACTURE_YEAR as busYear,
                db.VEHICLE_NO as vehicleNo,
                db.SERVICE_CLASS as busType,
                db.SEATS as seats,
                db.LAST_INSPECT_DT as lastInspectDt,
                db.INSURANCE_EXP_DT as insuranceExpDt,
                db.HAS_ADAS as hasAdas,
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
            JOIN TB_USER u ON b.DRIVER_ID COLLATE utf8mb4_unicode_ci = u.CUST_ID COLLATE utf8mb4_unicode_ci
            JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
            WHERE b.RES_ID = ?
        `, [resId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '해당 입찰 정보를 찾을 수 없습니다.' });
        }

        const bid = rows[0];

        const processUrl = (path) => {
            if (!path) return null;
            if (path.startsWith('http')) {
                return `/api/common/display-image?path=${encodeURIComponent(path)}`;
            }
            return path;
        };

        bid.avatar = processUrl(bid.avatar);
        
        // 편의시설 파싱
        try {
            if (bid.amenities) {
                const parsed = typeof bid.amenities === 'string' ? JSON.parse(bid.amenities) : bid.amenities;
                bid.amenities = Array.isArray(parsed) ? parsed : [];
            } else {
                bid.amenities = [];
            }
        } catch (e) {
            console.error('[JSON Parse Error] Amenities (bid-detail):', e);
            bid.amenities = [];
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
            console.warn('[Auction Request] Validation Failed: Missing required fields');
            return res.status(400).json({ success: false, error: '필수 정보(출발지, 도착지, 날짜)가 누락되었습니다.' });
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
            0, // BUS_CHANG_CNT 초기값 0
            0, // PASSENGER_CNT 초기값 0
            totalReqAmt,
            custId,
            custId
        ]);

        if (safeBuses.length > 0) {
            let busSeq = 1;
            for (const bus of safeBuses) {
                const busAmt = parseInt(bus.reqAmt, 10) || 0;
                
                // 수수료 계산 (6.6%, 5.5%, 1.1%)
                const feeTotal = Math.floor(busAmt * 0.066);
                const feeRefund = Math.floor(busAmt * 0.055);
                const feeAttribution = parseFloat((busAmt * 0.011).toFixed(3)); // DECIMAL(18,3) 대응

                console.log('[Auction Request] Inserting Bus Seq:', busSeq);
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT, TOLLS_AMT, FUEL_COST, 
                        RES_BUS_AMT, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                        REG_ID, MOD_ID
                    ) VALUES (?, ?, ?, 'AUCTION', ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    reqId, busSeq, bus.busTypeCd, parseInt(bus.tollsAmt, 10) || 0, parseInt(bus.fuelCost, 10) || 0, 
                    busAmt, feeTotal, feeRefund, feeAttribution, custId, custId
                ]);
                busSeq++;
            }
        }

         const safeVias = Array.isArray(vias) ? vias : [];
         if (safeVias.length > 0) {
              for (let i = 0; i < safeVias.length; i++) {
                  const via = safeVias[i];
                  let viaType = 'START_WAY';
                  
                  // 프론트엔드 타입 매핑
                  const rawType = String(via.type || via.viaType || '').toLowerCase().trim();
                  
                  if (rawType === 'dep' || rawType === 'start' || rawType.includes('start_node')) {
                      viaType = 'START_NODE';
                  } else if (rawType === 'arr' || rawType === 'round' || rawType.includes('round_trip')) {
                      viaType = 'ROUND_TRIP';
                  } else if (rawType === 'end' || rawType === 'finish' || rawType.includes('end_node')) {
                      viaType = 'END_NODE';
                  } else if (rawType === 'stop' || rawType === 'via' || rawType.includes('start_way')) {
                      viaType = 'START_WAY';
                  } else if (rawType === 'retstop' || rawType === 'returnstop' || rawType.includes('end_way')) {
                      viaType = 'END_WAY';
                  } else {
                      viaType = 'START_WAY'; // 최후의 기본값
                  }

                  console.log(`[Auction Request] Mapping Result - Raw: "${rawType}", Mapped: "${viaType}"`);
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


/**
 * [App 전용] 고객 예약 목록 조회
 * - 예약 확정(CONFIRM) 및 운행 완료(DONE) 내역을 반환합니다.
 */
router.get('/reservations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. 사용자 CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;
        console.log('[App Reservations] Fetching for CustID:', custId);

        // 2. 예약 내역 조회 (TB_BUS_RESERVATION 기반, CONFIRM인 것만)
        // REQ_ID 기준으로 그룹화하여 하나의 요청에 여러 대의 버스가 있더라도 리스트에는 하나로 표시 (추후 상세에서 개별 확인)
        const [rows] = await pool.execute(`
            SELECT 
                r.REQ_ID as id,
                r.DATA_STAT as requestStat,
                res.DATA_STAT as statusCode,
                r.START_ADDR as \`from\`,
                r.END_ADDR as \`to\`,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundAddr,
                DATE_FORMAT(r.START_DT, '%Y/%m/%d') as date,
                r.TRIP_TITLE as title,
                COUNT(res.RES_ID) as busCount,
                SUM(res.OFFER_PRICE) as totalOfferPrice
            FROM TB_AUCTION_REQ r
            JOIN TB_BUS_RESERVATION res ON r.REQ_ID = res.REQ_ID
            WHERE r.TRAVELER_ID = ? AND res.DATA_STAT = 'CONFIRM'
            GROUP BY r.REQ_ID
            ORDER BY r.START_DT DESC
        `, [custId]);

        console.log(`[App Reservations] Found ${rows.length} trips for ${custId}`);

        // 3. 각 예약별 버스 상세 정보 보완
        for (const resObj of rows) {
            const [buses] = await pool.execute(`
                SELECT 
                    (SELECT CD_NM_KO FROM TB_COMMON_CODE WHERE GRP_CD = 'BUS_TYPE' AND DTL_CD = B.BUS_TYPE_CD) as busTypeName
                FROM TB_AUCTION_REQ_BUS B
                WHERE B.REQ_ID = ?
            `, [resObj.id]);
            
            resObj.busType = buses.map(b => b.busTypeName).filter(Boolean).join(', ');
            // 기본 이미지
            resObj.img = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkFgpCqOKwslyeB-NDZZWgUztAqUL0bfHiOrJqNJJN6DpHr41urNw5IJbiscbKz7SRUeipoTldOC-T9K1hgHX0Ql-j8HNSBG7i7RsroxP2pU55sPH2h18ejgiAIUhlk7ClZgs-q20FqjXXkNpV6ztIhaTC2EUu5gNvLvdKaXaGHKYW2nXvxveE0DY6Z3XOqnvIyAdfKEvapFzLayq9xIjqgGqcuwwu4qmp5WnLSgsnzUNS17N7rvUar-ZpG0fnE-1dIGrFGlPczso';
        }

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[App Reservations] Error:', error);
        res.status(500).json({ success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 10. 특정 차량 견적 요청 취소
router.post('/cancel-bus', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { reqId, unitSeq } = req.body;
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 2. 본인의 요청인지 확인
        const [check] = await connection.execute('SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?', [reqId, custId]);
        if (check.length === 0) {
            await connection.rollback();
            return res.status(403).json({ success: false, error: '권한이 없습니다.' });
        }

        // 3. 해당 차량 유닛 상태 변경
        await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [custId, reqId, unitSeq]);
        
        // 4. 관련 입찰 정보 취소
        await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT NOT IN (\'CONFIRM\', \'DONE\')', [custId, reqId, unitSeq]);

        // 5. 모든 차량이 취소되었는지 확인
        const [remainingBuses] = await connection.execute(
            'SELECT COUNT(*) as activeCount FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT != \'TRAVELER_CANCEL\'',
            [reqId]
        );

        if (remainingBuses[0].activeCount === 0) {
            // 모든 차량이 취소되었으므로 마스터 상태도 변경
            await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
        }

        await connection.commit();
        res.json({ success: true, message: '차량 견적 요청이 취소되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[Cancel Bus] Error:', error);
        res.status(500).json({ success: false, error: '취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 11. 전체 견적 요청 취소
router.post('/cancel-request', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { reqId } = req.body;
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 2. 본인의 요청인지 확인
        const [check] = await connection.execute('SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?', [reqId, custId]);
        if (check.length === 0) {
            await connection.rollback();
            return res.status(403).json({ success: false, error: '권한이 없습니다.' });
        }

        // 3. 전체 요청 상태 변경
        await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
        // 4. 모든 차량 유닛 상태 변경
        await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
        // 5. 모든 응찰 정보 취소 처리
        await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'CONFIRM\', \'DONE\')', [custId, reqId]);

        await connection.commit();
        res.json({ success: true, message: '전체 견적 요청이 취소되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[Cancel Request] Error:', error);
        res.status(500).json({ success: false, error: '취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 15. 과거 운행 이력 조회 (고객용)
router.get('/completed-missions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 0. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // TB_BUS_RESERVATION 테이블에서 DATA_STAT='DONE'인 내역 조회
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d') as endDate,
                b.DRIVER_BIDDING_PRICE as price,
                db.MODEL_NM as model,
                u_driver.USER_NM as driverName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID COLLATE utf8mb4_unicode_ci = u_driver.CUST_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            WHERE r.TRAVELER_ID COLLATE utf8mb4_unicode_ci = ? AND b.DATA_STAT = 'DONE'
            ORDER BY r.END_DT DESC
        `, [custId]);

        const processedRows = rows.map(row => {
            const endAddr = row.endAddrVia || row.endAddrMaster;
            const getShort = (addr) => {
                if (!addr) return '';
                return addr.split(' ').slice(0, 2).join(' ');
            };

            return {
                ...row,
                endAddr,
                route: `${getShort(row.startAddr)}(출발) ${row.roundTrip ? '→ ' + getShort(row.roundTrip) + '(회차) ' : ''}→ ${getShort(endAddr)}(도착지)`,
                date: `${row.startDate} ~ ${row.endDate}`
            };
        });

        res.json({ success: true, data: processedRows });
    } catch (err) {
        console.error('Fetch customer completed missions error:', err);
        res.status(500).json({ success: false, error: '과거 운행 이력을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 16. 과거 운행 상세 조회 (고객용)
router.get('/completed-mission-detail/:resId', authenticateToken, async (req, res) => {
    try {
        const { resId } = req.params;
        const userId = req.user.userId;

        // 0. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 1. 기본 정보 및 여정 정보 조회
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID as reqId,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as viaAddr,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDt,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDt,
                r.PASSENGER_CNT as passengers,
                b.DRIVER_BIDDING_PRICE as price,
                b.DRIVER_ID as driverId,
                u_driver.USER_NM as driverName,
                db.VEHICLE_NO as busNo,
                db.MODEL_NM as busModel,
                (SELECT ROUND(AVG(STAR_RATING), 1) FROM TB_TRIP_REVIEW WHERE DRIVER_ID = b.DRIVER_ID) as rating,
                (SELECT COUNT(*) FROM TB_TRIP_REVIEW WHERE RES_ID = b.RES_ID) as isReviewed,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            WHERE b.RES_ID = ? AND r.TRAVELER_ID = ?
        `, [resId, custId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '상세 내역을 찾을 수 없습니다.' });
        }

        const tripDetail = rows[0];

        // 2. 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT VIA_TYPE as type, VIA_ADDR as addr, VIA_SEQ as seq
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
        `, [tripDetail.reqId]);

        tripDetail.waypoints = viaRows;

        res.json({ success: true, data: tripDetail });
    } catch (err) {
        console.error('Fetch customer completed mission detail error:', err);
        res.status(500).json({ success: false, error: '상세 내역을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 17. 평점 및 감사글 작성 대기 목록 조회 (고객용)
router.get('/review-pending-missions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 0. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 1. DATA_STAT = 'DONE' 이면서 리뷰가 없는 미션 조회
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID as reqId,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as viaAddr,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as date,
                db.MODEL_NM as busModel,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID) as busCnt,
                u_driver.USER_NM as driverName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            WHERE r.TRAVELER_ID = ? 
              AND b.DATA_STAT = 'DONE'
              AND NOT EXISTS (SELECT 1 FROM TB_TRIP_REVIEW WHERE RES_ID = b.RES_ID)
            ORDER BY r.END_DT DESC
        `, [custId]);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Fetch review pending missions error:', err);
        res.status(500).json({ success: false, error: '평점 작성 대기 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});
// 18. 리뷰 상세 조회 (고객용)
router.get('/review-detail/:id', authenticateToken, async (req, res) => {
    try {
        const resId = req.params.id;
        const [rows] = await pool.execute(`
            SELECT 
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as viaAddr,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as date,
                rev.STAR_RATING as rating,
                rev.COMMENT_TEXT as comment,
                rev.REPLY_TEXT as reply,
                DATE_FORMAT(rev.REPLY_DT, '%Y/%m/%d') as replyDate,
                u_driver.USER_NM as driverName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as driverImage,
                dv.VEHICLE_NO as busNo,
                dv.MODEL_NM as busModel
            FROM TB_TRIP_REVIEW rev
            JOIN TB_BUS_RESERVATION b ON rev.RES_ID = b.RES_ID
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_USER u_driver ON b.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u_driver.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON b.BUS_ID = dv.BUS_ID
            WHERE rev.RES_ID = ?
        `, [resId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '리뷰 정보를 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Fetch review detail error:', err);
        res.status(500).json({ success: false, error: '리뷰 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
