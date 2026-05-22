const express = require('express');
const router = express.Router();
const { pool, getNextId, uploadToLocal } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const { sendNotification } = require('../services/notificationService');

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
                   f.GCS_PATH as USER_IMAGE 
            FROM TB_USER u 
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
            WHERE u.USER_ID = ?
        `, [userId]);

        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const user = uRows[0];
        const custId = user.CUST_ID;

        // 디버깅을 위한 파일 로그 추가
        const fs = require('fs');
        const logMsg = `\n[${new Date().toISOString()}] Dashboard Call - UserID: ${userId}, CustID: ${custId}`;
        fs.appendFileSync('debug_stats.log', logMsg);

        // 2. 통계 조회 (진행중, 승인대기)
        console.log(`[Dashboard Debug] UserID: ${userId}, CustID: ${custId}`);
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
            WHERE TRIM(r.TRAVELER_ID) = ? OR TRIM(r.TRAVELER_ID) = ?
        `, [custId, userId]);

        const stats = statsRows[0] || { countProgressing: 0, countWaitingApproval: 0 };
        fs.appendFileSync('debug_stats.log', ` | Result: ${JSON.stringify(stats)}`);
        console.log(`[Dashboard Debug] Final Stats Result:`, stats);

        const [restrictRows] = await pool.execute(`
            SELECT RESTRICT_STAT, RESTRICT_END_DT, CANCEL_CNT
            FROM TB_USER_CANCEL_MANAGE
            WHERE CUST_ID = ?
        `, [custId]);

        let restriction = null;
        if (restrictRows.length > 0) {
            const r = restrictRows[0];
            const now = new Date();
            const endDt = r.RESTRICT_END_DT ? new Date(r.RESTRICT_END_DT) : null;

            // 상태가 'Y'이거나 'P'인 경우, 그리고 종료일이 지나지 않았거나 무기한인 경우
            if (r.RESTRICT_STAT === 'P') {
                restriction = {
                    restricted: true,
                    type: 'PERMANENT',
                    message: '귀하는 무기한 이용 제한 상태입니다. 고객센터에 문의해주세요.'
                };
            } else if (r.RESTRICT_STAT === 'Y' && endDt && now <= endDt) {
                const endStr = endDt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
                restriction = {
                    restricted: true,
                    type: 'TEMPORARY',
                    message: `${endStr}까지 서비스 이용이 제한됩니다.`
                };
            }
        }

        res.json({
            success: true,
            user: {
                userNm: user.USER_NM,
                userImage: user.USER_IMAGE
            },
            stats,
            restriction
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 이용 제한 상태 체크 API (고객용)
 */
router.get('/check-restriction', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. CUST_ID 조회 (req.user에서 가져옴)
        const custId = req.user.custId;

        // 2. 거래제한 상태 조회
        const [rows] = await pool.execute(`
            SELECT RESTRICT_STAT, RESTRICT_START_DT, RESTRICT_END_DT 
            FROM TB_USER_CANCEL_MANAGE 
            WHERE CUST_ID = ?
        `, [custId]);

        if (rows.length === 0) {
            return res.json({ restricted: false });
        }

        const { RESTRICT_STAT, RESTRICT_START_DT, RESTRICT_END_DT } = rows[0];

        // 무기한 제한 (P)
        if (RESTRICT_STAT === 'P') {
            return res.json({
                restricted: true,
                type: 'PERMANENT',
                message: '귀하는 무기한 이용 제한 상태입니다. 고객센터에 문의해주세요.'
            });
        }

        // 기간제 제한 (Y)
        if (RESTRICT_STAT === 'Y') {
            const now = new Date();
            const start = RESTRICT_START_DT ? new Date(RESTRICT_START_DT) : null;
            const end = RESTRICT_END_DT ? new Date(RESTRICT_END_DT) : null;

            if (start && end && now >= start && now <= end) {
                const endStr = end.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
                return res.json({
                    restricted: true,
                    type: 'TEMPORARY',
                    message: `${endStr}까지 서비스 이용이 제한되어 신규 요청이 불가능합니다.`
                });
            }
        }

        res.json({ restricted: false });
    } catch (error) {
        console.error('Check Restriction Error:', error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// 1. 프로필 정보 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(`
            SELECT u.CUST_ID, u.USER_NM, u.HP_NO, u.EMAIL, u.USER_ID, u.USER_TYPE, 
                   f.GCS_PATH as USER_IMAGE, 
                   u.PROFILE_FILE_ID 
            FROM TB_USER u 
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
            WHERE u.USER_ID = ?
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        const custId = user.CUST_ID;

        // 취소 관리 정보 조회
        const [cancelRows] = await pool.execute(`
            SELECT CANCEL_CNT, RESTRICT_STAT, DATE_FORMAT(RESTRICT_END_DT, '%Y-%m-%d %H:%i:%s') as RESTRICT_END_DT 
            FROM TB_USER_CANCEL_MANAGE 
            WHERE CUST_ID = ?
        `, [custId]);

        const cancelInfo = cancelRows.length > 0 ? cancelRows[0] : {
            CANCEL_CNT: 0,
            RESTRICT_STAT: 'N',
            RESTRICT_END_DT: null
        };

        // 이미지 경로 처리 (프록시 URL로 변환 및 인코딩)
        let userImage = user.USER_IMAGE;
        if (userImage) {
            // 이미 전체 URL 형태인 경우(예:signatures/...)와 상대 경로인 경우 모두 대응
            const pathValue = userImage.startsWith('http') ? userImage : userImage;
            userImage = `/api/common/display-image?path=${encodeURIComponent(pathValue)}`;
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
                profileImage: userImage || null,
                cancelCnt: cancelInfo.CANCEL_CNT,
                restrictStat: cancelInfo.RESTRICT_STAT,
                restrictEndDt: cancelInfo.RESTRICT_END_DT
            }
        });
    } catch (error) {
        console.error('App Customer profile fetch error:', error);
        res.status(500).json({ status: 500, error: '프로필 데이터를 가져오는 데 실패했습니다.' });
    }
});

// 2. 프로필 정보 업데이트
router.post('/profile/update', authenticateToken, async (req, res) => {
    const { name, phone, email, firebaseToken } = req.body;
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
            // 0-1. 휴대폰 번호 변경 시 Firebase Token 검증
            const [currentRows] = await pool.execute('SELECT HP_NO FROM TB_USER WHERE USER_ID = ?', [userId]);
            const currentPhone = currentRows.length > 0 ? currentRows[0].HP_NO : '';

            if (phone !== currentPhone) {
                if (!firebaseToken) {
                    return res.status(400).json({ status: 400, message: '휴대폰 번호 변경 시 인증 토큰이 필요합니다.' });
                }

                try {
                    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
                    const firebasePhone = decodedToken.phone_number;
                    const cleanFirebasePhone = firebasePhone.replace(/[^0-9]/g, '');
                    const cleanRequestPhone = phone.replace(/[^0-9]/g, '');

                    if (!cleanFirebasePhone.endsWith(cleanRequestPhone)) {
                        return res.status(400).json({ status: 400, message: '인증된 휴대폰 번호와 입력된 번호가 일치하지 않습니다.' });
                    }
                } catch (tokenError) {
                    console.error('Firebase Token Verification Error:', tokenError);
                    return res.status(401).json({ status: 401, message: '유효하지 않은 인증 토큰입니다.' });
                }
            }

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

// 2-1. 프로필 이미지 업로드
router.post('/profile/upload-image', authenticateToken, memoryUpload.single('profileImage'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: '업로드할 이미지가 없습니다.' });
        }

        const userId = req.user.userId;
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // 로컬 업로드 처리
        const uploadResult = await uploadToLocal(file, 'profiles');
        if (!uploadResult) {
            return res.status(500).json({ success: false, error: '이미지 업로드 처리에 실패했습니다.' });
        }
        const { fileId, url: dbSavePath, ext } = uploadResult;

        // DB 저장
        await pool.execute(
            `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) 
             VALUES (?, 'USER_PROFILE', 'LOCAL', ?, ?, ?, ?, ?, ?)`,
            [fileId, dbSavePath, file.originalname, ext, file.size, custId, custId]
        );

        await pool.execute(
            'UPDATE TB_USER SET PROFILE_FILE_ID = ?, USER_IMAGE = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [fileId, dbSavePath, custId, userId]
        );

        res.json({
            success: true,
            message: '프로필 이미지가 성공적으로 업로드되었습니다.',
            data: {
                profileImage: `/api/common/display-image?path=${encodeURIComponent(dbSavePath)}`
            }
        });
    } catch (error) {
        console.error('Profile image upload error:', error);
        res.status(500).json({ success: false, error: '이미지 업로드 중 오류가 발생했습니다.' });
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
                AND NOT EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
            `;
        } else if (type === 'waiting') {
            statusFilter = `
                r.DATA_STAT = 'BIDDING' 
                OR (r.DATA_STAT IN ('AUCTION', 'BUS_CHANGE') AND (
                    EXISTS (SELECT 1 FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                    OR EXISTS (SELECT 1 FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID AND DATA_STAT = 'BIDDING')
                ))
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
            WHERE (TRIM(r.TRAVELER_ID) = ? OR TRIM(r.TRAVELER_ID) = ?) AND ${statusFilter}
            ORDER BY REG_DT DESC
        `;

        const [rows] = await pool.execute(sql, [custId, userId]);

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
                REQ_AMT as totalAmt,
                IFNULL(BUS_CHANG_CNT, 0) as busChangCnt
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
                    totalAmt: r.REQ_AMT, busChangCnt: r.BUS_CHANG_CNT || 0
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
        if (viaRows.length > 0) {
            viaRows.forEach(v => {
                let title = '경유지';
                let type = v.type;
                if (v.type === 'START_NODE') {
                    title = '출발지';
                    type = 'START';
                }
                else if (v.type === 'START_WAY') {
                    title = '출발 경유지';
                    type = 'VIA';
                }
                else if (v.type === 'ROUND_TRIP') {
                    title = '목적지';
                    type = 'ROUND_TRIP';
                }
                else if (v.type === 'END_WAY') {
                    title = '도착 경유지';
                    type = 'VIA';
                }
                else if (v.type === 'END_NODE') {
                    title = '도착지';
                    type = 'END';
                }
                fullRoute.push({ type: type, addr: v.addr, title: title });
            });
        } else {
            fullRoute.push({ type: 'START', addr: tripInfo.startAddr, title: '출발지' });
            fullRoute.push({ type: 'END', addr: tripInfo.endAddr, title: '도착지' });
        }
        tripInfo.fullRoute = fullRoute;

        // 2. 차량별 입찰 정보 조회
        const [bidRows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ as unitSeq,
                rb.BUS_TYPE_CD as busType,
                rb.DATA_STAT as unitStat,
                rb.RES_BUS_AMT as unitReqAmt,
                rb.RES_FEE_TOTAL_AMT as unitResFee,
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
                f.GCS_PATH as driverImageRaw
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT IN ('AUCTION','BIDDING','CONFIRM','DONE')
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
                    if (Array.isArray(ids)) {
                        ids.forEach(id => {
                            if (id) allPhotoIds.push(String(id).trim());
                        });
                    }
                } catch (e) {
                    console.error('[JSON Parse Error] busPhotos IDs:', e);
                }
            }
        });

        let photoMap = {};
        if (allPhotoIds.length > 0) {
            const uniqueIds = [...new Set(allPhotoIds)];
            // TB_FILE_MASTER에서 GCS_PATH 조회
            const [pRows] = await pool.execute(
                `SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID IN (${uniqueIds.map(() => '?').join(',')})`,
                uniqueIds
            );
            pRows.forEach(p => {
                const fid = String(p.FILE_ID).trim();
                photoMap[fid] = `/api/common/display-image?path=${encodeURIComponent(p.GCS_PATH)}`;
            });
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
                    unitResFee: row.unitResFee || 0,
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
                                'Table': '테이블', 'table': '테이블',
                                'Wi-Fi': '와이파이', 'wifi': '와이파이',
                                'USB-CHARGE': 'USB충전', 'usb': 'USB충전',
                                'Refrigerator': '냉장고', 'fridge': '냉장고',
                                'Individual-Screen': '개인모니터', 'screen': '개인모니터',
                                'Air-Conditioner': '에어컨', 'aircon': '에어컨',
                                'Heating': '히터', 'heater': '히터'
                            };
                            tags = Object.keys(parsed)
                                .filter(key => parsed[key] === true || parsed[key] === 'Y')
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
                    } catch (e) { }
                }

                unitMap[row.unitSeq].estimates.push({
                    id: row.estimateId,
                    driverName: row.driverName,
                    rating: row.rating || '0.0',
                    busInfo: `${row.busYear || ''}년형 ${row.busModel || ''} (${row.busNo || ''})`,
                    experience: row.joinDt ? Math.max(1, new Date().getFullYear() - new Date(row.joinDt).getFullYear()) : 1,
                    price: row.price,
                    tags: tags,
                    image: row.driverImageRaw ? `/api/common/display-image?path=${encodeURIComponent(row.driverImageRaw)}` : 'https://via.placeholder.com/150',
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
                    busChangCnt: tripInfo.busChangCnt,
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

/**
 * 9. 차량 변경요청 처리
 * - TB_AUCTION_REQ_BUS.DATA_STAT -> 'BUS_CHANGE'
 * - TB_AUCTION_REQ.DATA_STAT -> 'AUCTION'
 * - TB_AUCTION_REQ.BUS_CHANG_CNT -> BUS_CHANG_CNT + 1
 */
router.post('/request-bus-change', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { reqId, busSeq } = req.body;
        const custId = req.user.custId;

        if (!reqId || !busSeq) {
            return res.status(400).json({ success: false, error: '요청 ID와 차량 순번이 필요합니다.' });
        }

        await connection.beginTransaction();

        // [알림용 데이터 조회] 차량 변경 전 해당 차량에 입찰 중인 기사 목록 및 여정 제목 조회
        const [drivers] = await connection.execute(`
            SELECT DISTINCT DRIVER_ID 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT IN ('BIDDING', 'CONFIRM')
        `, [reqId, busSeq]);

        const [reqInfo] = await connection.execute(`
            SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        // 1. 해당 차량 유닛 상태 변경
        const [busUpdate] = await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS 
            SET DATA_STAT = 'BUS_CHANGE', MOD_ID = ?, MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [custId, reqId, busSeq]);

        if (busUpdate.affectedRows === 0) {
            throw new Error('해당 차량 정보를 찾을 수 없거나 업데이트에 실패했습니다.');
        }

        // 1.1 예약 테이블 상태 변경 (해당 차량에 대한 입찰 내역들)
        await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'BUS_CHANGE', MOD_ID = ?, MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [custId, reqId, busSeq]);

        // 2. 전체 요청 상태 변경 및 변경 카운트 증가
        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET DATA_STAT = 'AUCTION', 
                BUS_CHANG_CNT = IFNULL(BUS_CHANG_CNT, 0) + 1,
                MOD_ID = ?, 
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        await connection.commit();
        res.json({ success: true, message: '차량 변경요청이 성공적으로 처리되었습니다.' });

        // [알림 발송] 트랜잭션 커밋 완료 후 비동기로 기사에게 푸시 메시지 발송
        if (drivers.length > 0 && reqInfo.length > 0) {
            const tripTitle = reqInfo[0].TRIP_TITLE;
            const title = '[차량 변경 요청] 고객님이 차량 변경을 요청했습니다.';
            const body = `여정: ${tripTitle}\n차량 변경 요청을 확인하고 재입찰 등을 진행해 주세요.`;
            const link = `/estimate-detail-driver/${reqId}`;

            drivers.forEach(driver => {
                sendNotification(pool, {
                    custId: driver.DRIVER_ID,
                    title,
                    body,
                    link,
                    type: 'SYSTEM'
                }).catch(err => console.error(`[Notification] 차량 변경 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
            });
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Request bus change error:', error);
        res.status(500).json({ success: false, error: error.message || '서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 9-1. 버스 취소 처리
 * - TB_AUCTION_REQ_BUS.DATA_STAT -> 'BUS_CANCEL'
 * - TB_AUCTION_REQ.BUS_CHANG_CNT -> BUS_CHANG_CNT + 1
 * - 제한: BUS_CHANG_CNT < 3
 * - 금액 0원 처리 (RES_BUS_AMT)
 */
router.all('/cancel-bus', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // GET/POST 모두 지원하기 위해 query와 body 모두 확인
        const { reqId, unitSeq } = (req.method === 'GET') ? req.query : req.body;

        console.log(`[CANCEL-BUS] Method: ${req.method}, reqId: ${reqId}, unitSeq: ${unitSeq}`);

        // custId가 token에 있을 수도 있고 없을 수도 있으므로 확인
        let custId = req.user.custId || req.user.CUST_ID;
        const userId = req.user.userId;

        if (!custId && userId) {
            const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
            if (uRows.length > 0) custId = uRows[0].CUST_ID;
        }

        if (!reqId || !unitSeq) {
            return res.status(400).json({ success: false, error: '요청 ID와 차량 순번이 필요합니다.' });
        }

        await connection.beginTransaction();

        // [알림용 데이터 조회] 취소 전 해당 차량에 입찰 중인 기사 목록 및 여정 제목 조회
        const [drivers] = await connection.execute(`
            SELECT DISTINCT DRIVER_ID 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT NOT IN ('CONFIRM', 'DONE', 'BUS_CANCEL', 'TRAVELER_CANCEL')
        `, [reqId, unitSeq]);

        const [reqInfo] = await connection.execute(`
            SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        // 1. 본인의 요청인지 확인 및 현재 취소/변경 횟수 확인
        const [reqRows] = await connection.execute(`
            SELECT BUS_CHANG_CNT, TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        if (reqRows.length === 0) {
            throw new Error('요청 정보를 찾을 수 없습니다.');
        }

        // TRAVELER_ID와 custId 비교 (공백 제거 후 비교 권장)
        if (reqRows[0].TRAVELER_ID.trim() !== custId.trim()) {
            throw new Error('권한이 없습니다.');
        }

        const changCnt = reqRows[0].BUS_CHANG_CNT || 0;
        if (changCnt >= 3) {
            throw new Error('버스 취소 및 변경은 최대 3회까지만 가능합니다.');
        }

        // 2. 해당 차량 상태 변경 및 금액 0원 처리
        // 기존의 UNIT_REQ_AMT 오류를 RES_BUS_AMT로 수정
        const [busUpdate] = await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS 
            SET DATA_STAT = 'BUS_CANCEL', 
                RES_BUS_AMT = 0,
                MOD_ID = ?, 
                MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [custId, reqId, unitSeq]);

        if (busUpdate.affectedRows === 0) {
            throw new Error('해당 차량 정보를 찾을 수 없거나 업데이트에 실패했습니다.');
        }

        // 2-1. 관련 예약(입찰) 정보도 취소 (CONFIRM, DONE 제외)
        await connection.execute(`
            UPDATE TB_BUS_RESERVATION 
            SET DATA_STAT = 'BUS_CANCEL', 
                MOD_ID = ?, 
                MOD_DT = NOW() 
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? 
              AND DATA_STAT NOT IN ('CONFIRM', 'DONE')
        `, [custId, reqId, unitSeq]);

        // 3. 전체 요청의 변경 카운트 증가
        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET BUS_CHANG_CNT = IFNULL(BUS_CHANG_CNT, 0) + 1,
                MOD_ID = ?, 
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [custId, reqId]);

        // 4. 모든 버스가 취소되었는지 확인 후 전체 상태 업데이트
        const [remainingBuses] = await connection.execute(`
            SELECT COUNT(*) as activeCount 
            FROM TB_AUCTION_REQ_BUS 
            WHERE REQ_ID = ? 
              AND DATA_STAT NOT IN ('BUS_CANCEL', 'TRAVELER_CANCEL')
        `, [reqId]);

        if (remainingBuses[0].activeCount === 0) {
            await connection.execute(`
                UPDATE TB_AUCTION_REQ 
                SET DATA_STAT = 'BUS_CANCEL',
                    MOD_ID = ?,
                    MOD_DT = NOW()
                WHERE REQ_ID = ?
            `, [custId, reqId]);
            console.log(`[CANCEL-BUS] All buses canceled for reqId: ${reqId}. Overall status updated to BUS_CANCEL.`);
        }

        await connection.commit();
        res.json({ success: true, message: '버스 취소가 완료되었습니다.' });

        // [알림 발송] 트랜잭션 커밋 완료 후 비동기로 기사에게 푸시 메시지 발송
        if (drivers.length > 0 && reqInfo.length > 0) {
            const tripTitle = reqInfo[0].TRIP_TITLE;
            const title = '[청약 취소] 고객님이 차량 청약을 취소했습니다.';
            const body = `여정: ${tripTitle}\n요청하신 차량 청약이 취소되었습니다.`;
            const link = `/estimate-detail-driver/${reqId}`;

            drivers.forEach(driver => {
                sendNotification(pool, {
                    custId: driver.DRIVER_ID,
                    title,
                    body,
                    link,
                    type: 'SYSTEM'
                }).catch(err => console.error(`[Notification] 개별 차량 취소 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
            });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[CANCEL-BUS] Error:', error);
        res.status(500).json({ success: false, error: error.message || '취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// [추가] 단건 견적 승인
router.post('/approve-bid', authenticateToken, async (req, res) => {
    const { resId } = req.body;
    try {
        // 1. 해당 예약 정보 조회 (알림 발송을 위해 DRIVER_ID도 함께 조회)
        const [bidRows] = await pool.execute('SELECT REQ_ID, REQ_BUS_SEQ, DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [resId]);
        if (bidRows.length === 0) return res.status(404).json({ success: false, error: '입찰 정보를 찾을 수 없습니다.' });

        const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq, DRIVER_ID: driverId } = bidRows[0];

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

        // [알림 발송] 비동기로 기사에게 푸시 메시지 발송
        try {
            const [reqInfo] = await pool.execute('SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            if (reqInfo.length > 0) {
                const tripTitle = reqInfo[0].TRIP_TITLE;
                const title = '[견적 승인] 고객님이 제출하신 견적을 승인했습니다.';
                const body = `여정: ${tripTitle}\n고객님이 견적을 승인하여 선택하셨습니다. 결제를 대기 중입니다.`;
                const link = `/estimate-detail-driver/${reqId}`;

                sendNotification(pool, {
                    custId: driverId,
                    title,
                    body,
                    link,
                    type: 'SYSTEM'
                }).catch(err => console.error(`[Notification] 단건 견적 승인 알림 발송 실패 (기사 ID: ${driverId}):`, err));
            }
        } catch (notifErr) {
            console.error('[Notification] 단건 견적 승인 정보 조회 실패:', notifErr);
        }
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

        // [알림 발송] 비동기로 해당 경매에서 확정된 모든 기사들에게 푸시 메시지 발송
        try {
            const [reqInfo] = await pool.execute('SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            const [confirmedDrivers] = await pool.execute('SELECT DISTINCT DRIVER_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DATA_STAT = "CONFIRM"', [reqId]);
            
            if (reqInfo.length > 0 && confirmedDrivers.length > 0) {
                const tripTitle = reqInfo[0].TRIP_TITLE;
                const title = '[견적 승인] 고객님이 제출하신 견적을 승인했습니다.';
                const body = `여정: ${tripTitle}\n고객님이 견적을 승인하여 선택하셨습니다. 결제를 대기 중입니다.`;
                const link = `/estimate-detail-driver/${reqId}`;

                confirmedDrivers.forEach(driver => {
                    sendNotification(pool, {
                        custId: driver.DRIVER_ID,
                        title,
                        body,
                        link,
                        type: 'SYSTEM'
                    }).catch(err => console.error(`[Notification] 전체 견적 승인 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
                });
            }
        } catch (notifErr) {
            console.error('[Notification] 전체 견적 승인 정보 조회 실패:', notifErr);
        }
    } catch (error) {
        console.error('Approve all error:', error);
        res.status(500).json({ success: false, error: '전체 승인 처리 중 오류가 발생했습니다.' });
    }
});

// [신규] 특정 차량 유닛의 요청 금액 업데이트
router.all('/update-unit-amount', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { reqId, unitSeq, newAmount } = (req.method === 'GET') ? req.query : req.body;
        const custId = req.user.custId || req.user.CUST_ID;

        console.log(`[UPDATE-AMOUNT] Method: ${req.method}, reqId: ${reqId}, unitSeq: ${unitSeq}, newAmount: ${newAmount}`);

        if (!reqId || !unitSeq || newAmount === undefined) {
            return res.status(400).json({ success: false, error: '요청 ID, 차량 순번, 새로운 금액이 필요합니다.' });
        }

        await connection.beginTransaction();

        // 1. 해당 요청이 본인의 것인지 확인
        const [ownerRows] = await connection.execute(
            'SELECT TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?',
            [reqId]
        );

        if (ownerRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: '요청 정보를 찾을 수 없습니다.' });
        }

        if (ownerRows[0].TRAVELER_ID !== custId) {
            await connection.rollback();
            return res.status(403).json({ success: false, error: '수정 권한이 없습니다.' });
        }

        // 2. 금액 및 수수료 업데이트 (TB_AUCTION_REQ_BUS)
        const busAmt = parseInt(newAmount, 10) || 0;
        const feeTotal = Math.floor(busAmt * 0.066);
        const feeRefund = Math.floor(busAmt * 0.055);
        const feeAttribution = parseFloat((busAmt * 0.011).toFixed(3));

        const [updateResult] = await connection.execute(`
            UPDATE TB_AUCTION_REQ_BUS 
            SET RES_BUS_AMT = ?, 
                RES_FEE_TOTAL_AMT = ?, 
                RES_FEE_REFUND_AMT = ?, 
                RES_FEE_ATTRIBUTION_AMT = ?,
                MOD_ID = ?, 
                MOD_DT = NOW()
            WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?
        `, [busAmt, feeTotal, feeRefund, feeAttribution, custId, reqId, unitSeq]);

        if (updateResult.affectedRows === 0) {
            throw new Error('차량 유닛 정보를 찾을 수 없거나 업데이트에 실패했습니다.');
        }

        // 3. 마스터 테이블의 총액(REQ_AMT) 업데이트
        await connection.execute(`
            UPDATE TB_AUCTION_REQ 
            SET REQ_AMT = (SELECT SUM(RES_BUS_AMT) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?),
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [reqId, custId, reqId]);

        await connection.commit();
        res.json({ success: true, message: '요청 금액이 성공적으로 변경되었습니다.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update unit amount error:', error);
        res.status(500).json({ success: false, error: error.message || '서버 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 7. 예약 상세 정보 조회 (TB_AUCTION_REQ + TB_AUCTION_REQ_VIA)
router.get('/reservation/:id', authenticateToken, async (req, res) => {
    try {
        const idParam = req.params.id;
        const travelerId = req.user.userId;

        console.log(`[App Reservation Detail] Requesting ID: ${idParam} by User: ${travelerId}`);

        // 0. 사용자 CUST_ID 조회 (토큰에 있으면 우선 사용)
        let custId = req.user.custId;
        if (!custId) {
            const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [travelerId]);
            custId = uRows.length > 0 ? uRows[0].CUST_ID : travelerId;
        }
        console.log(`[App Reservation Detail] Final CustID for authorization: ${custId}`);

        // 1. ID 해석 (REQ_ID 인지 RES_ID 인지 구분하며 사용자 권한 연동)
        let reqId = null;
        console.log(`[DEBUG] idParam: '${idParam}', length: ${idParam?.length}`);

        // 우선 요청번호(REQ_ID)가 본인 것인지 확인
        const [reqCheck] = await pool.execute(
            'SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?',
            [idParam, custId]
        );

        if (reqCheck.length > 0) {
            reqId = idParam;
            console.log(`[App Reservation Detail] Found matching REQ_ID: ${idParam}`);
        } else {
            // 요청번호로 없거나 본인 것이 아니라면, 예약번호(RES_ID)로 조회 시도 (본인 것인지 포함)
            const [resCheck] = await pool.execute(
                'SELECT REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ? AND TRAVELER_ID = ?',
                [idParam, custId]
            );
            if (resCheck.length > 0) {
                reqId = resCheck[0].REQ_ID;
                console.log(`[App Reservation Detail] Resolved REQ_ID ${reqId} from RES_ID ${idParam}`);
            } else {
                // 둘 다 아니라면 (혹은 다른 사람의 REQ_ID인 경우)
                // 보안상 상세 메시지보다는 404로 처리하거나, 기존 로직처럼 reqId를 idParam으로 두고 아래에서 403 처리
                reqId = idParam;
            }
        }

        console.log(`[DEBUG] Final reqId to query: '${reqId}', length: ${reqId?.length}`);

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
            console.warn(`[App Reservation Detail] Reservation NOT FOUND for REQ_ID: '${reqId}'`);
            // 혹시 모르니 전체 목록에서 이 ID가 있는지 확인하는 로그 추가
            const [allCheck] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ LIMIT 5');
            console.log('[DEBUG] First 5 REQ_IDs in DB:', allCheck.map(r => `'${r.REQ_ID}'`));
            return res.status(404).json({ success: false, error: '해당 예약 번호를 찾을 수 없습니다.' });
        }

        const reservation = rows[0];

        // [보안 체크] 소유자 대조
        if (reservation.ownerId !== custId) {
            console.warn(`[App Reservation Detail] Forbidden access by ${custId} to reservation owned by ${reservation.ownerId}`);
            return res.status(403).json({ success: false, error: '본인의 예약 내역만 조회할 수 있습니다.' });
        }

        // [B] 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
        `, [reqId]);

        console.log(`[DEBUG] viaRows for REQ_ID ${reqId}:`, JSON.stringify(viaRows, null, 2));

        let fullRoute = [];
        if (viaRows.length > 0) {
            // 경유지 데이터가 있는 경우, 상세 경로를 구성
            fullRoute = viaRows.map((v, idx) => {
                let title = '경유지';
                let type = 'VIA';

                switch (v.type) {
                    case 'START_NODE':
                        title = '출발지';
                        type = 'START';
                        break;
                    case 'START_WAY':
                        title = '출발경유지';
                        type = 'VIA';
                        break;
                    case 'ROUND_TRIP':
                        title = '목적지';
                        type = 'DEST';
                        break;
                    case 'END_WAY':
                        title = '도착경유지';
                        type = 'VIA';
                        break;
                    case 'END_NODE':
                        title = '도착지';
                        type = 'END';
                        break;
                    case 'WAY':
                    default:
                        title = '경유지';
                        type = 'VIA';
                }

                // 첫 번째 노드에는 출발 시간을, 마지막 노드에는 도착 시간을 추가로 붙여줍니다.
                let time = null;
                if (idx === 0) time = reservation.start_date;
                if (idx === viaRows.length - 1) time = reservation.end_date;

                return { type, addr: v.addr, title, time };
            });
        } else {
            // 경유지 데이터가 전혀 없는 경우 기본 출발/도착지 표시 (Fallback)
            fullRoute.push({ type: 'START', addr: reservation.from_addr, title: '출발지', time: reservation.start_date });
            fullRoute.push({ type: 'END', addr: reservation.to_addr, title: '도착지', time: reservation.end_date });
        }

        console.log(`[DEBUG] Final fullRoute for REQ_ID ${reqId}:`, JSON.stringify(fullRoute, null, 2));
        reservation.route = fullRoute;

        // [C] 신청 차량 목록 및 입찰 현황 조회 (확정된 기사 정보 포함)
        const [busRows] = await pool.execute(`
            SELECT 
                rb.REQ_BUS_SEQ as reqBusUuid,
                rb.BUS_TYPE_CD as busType,
                res.RES_ID as resId,
                rb.DATA_STAT as status,
                rb.RES_BUS_AMT as price,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
                 WHERE b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ AND b.DATA_STAT = 'BIDDING') as bidCount,
                res.DRIVER_ID as driverId,
                u_driver.USER_NM as driverName,
                u_driver.HP_NO as driverHp,
                (SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = u_driver.PROFILE_FILE_ID) as driverAvatar,
                dv.VEHICLE_NO as busNo,
                dv.MODEL_NM as busModel,
                dv.VEHICLE_PHOTOS_JSON as busPhotos,
                dv.AMENITIES as amenities,
                dv.HAS_ADAS as hasAdas,
                res.DRIVER_BIDDING_PRICE as confirmedPrice,
                res.DATA_STAT as resStatus
            FROM TB_AUCTION_REQ_BUS rb
            LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT = 'CONFIRM'
            LEFT JOIN TB_USER u_driver ON res.DRIVER_ID = u_driver.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON res.BUS_ID = dv.BUS_ID
            WHERE rb.REQ_ID = ?
        `, [reqId]);

        // [D] 차량 이미지 및 기사 아바타 처리
        for (let bus of busRows) {
            // 1. 기사 아바타 경로 처리
            if (bus.driverAvatar && !bus.driverAvatar.startsWith('http') && !bus.driverAvatar.startsWith('/')) {
                bus.driverAvatar = `/api/common/display-image?path=${encodeURIComponent(bus.driverAvatar)}`;
            }

            // 2. 차량 이미지 (FILE_ID -> GCS_PATH) 변환
            if (bus.busPhotos) {
                try {
                    let photoIds = (typeof bus.busPhotos === 'string') ? JSON.parse(bus.busPhotos) : bus.busPhotos;
                    if (Array.isArray(photoIds) && photoIds.length > 0) {
                        const uniqueIds = [...new Set(photoIds)].map(id => String(id).trim());
                        const [fileRows] = await pool.execute(
                            `SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID IN (${uniqueIds.map(() => '?').join(',')})`,
                            uniqueIds
                        );

                        const paths = fileRows.map(f => {
                            // 이미 풀 URL(https://...) 형태라면 그대로 사용, 아니면 프록시 경로 사용
                            if (f.GCS_PATH && f.GCS_PATH.startsWith('http')) {
                                return f.GCS_PATH;
                            }
                            return `/api/common/display-image?path=${encodeURIComponent(f.GCS_PATH)}`;
                        });

                        bus.busPhotos = paths;
                        bus.busImage = paths[0] || null; // 첫 번째 이미지를 대표 이미지로 설정
                    } else {
                        bus.busPhotos = [];
                        bus.busImage = null;
                    }
                } catch (e) {
                    console.error('[App Reservation Detail] Bus photo resolution error:', e);
                    bus.busPhotos = [];
                    bus.busImage = null;
                }
            } else {
                bus.busPhotos = [];
                bus.busImage = null;
            }

            // 3. 편의시설 (amenities) 처리 (객체 형태 -> 배열 형태로 가공하여 프론트 지원)
            if (bus.amenities) {
                try {
                    let amenityObj = (typeof bus.amenities === 'string') ? JSON.parse(bus.amenities) : bus.amenities;
                    const activeAmenities = [];

                    if (amenityObj && typeof amenityObj === 'object' && !Array.isArray(amenityObj)) {
                        const nameMapping = {
                            'Table': '개인 테이블',
                            'Wi-Fi': '와이파이(Wi-Fi)',
                            'USB-CHARGE': 'USB 충전 포트',
                            'Refrigerator': '냉장고',
                            'Individual-Screen': '개인 모니터'
                        };
                        for (let [key, val] of Object.entries(amenityObj)) {
                            if (val === true || val === 'Y' || val === 'true') {
                                activeAmenities.push(nameMapping[key] || key);
                            }
                        }
                    } else if (typeof bus.amenities === 'string') {
                        activeAmenities.push(bus.amenities);
                    } else if (Array.isArray(bus.amenities)) {
                        activeAmenities.push(...bus.amenities);
                    }

                    // ADAS / AEBS 안전 장치 여부
                    if (bus.hasAdas === 'Y' || bus.hasAdas === true) {
                        activeAmenities.push('안전장치 AEBS 장착');
                    }

                    bus.amenities = activeAmenities;
                } catch (e) {
                    console.error('[App Reservation Detail] Amenities resolution error:', e);
                    bus.amenities = [];
                }
            } else {
                bus.amenities = [];
                if (bus.hasAdas === 'Y' || bus.hasAdas === true) {
                    bus.amenities = ['안전장치 AEBS 장착'];
                }
            }
        }

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




/**
 * [App 전용] 여행 완료 처리 (고객용)
 * - 해당 요청(REQ_ID)에 속한 모든 예약 및 요청 상태를 'DONE'으로 변경합니다.
 */
router.post('/reservation/complete', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { reqId } = req.body;
        const userId = req.user.userId;
        const tokenCustId = req.user.custId;

        if (!reqId) {
            return res.status(400).json({ success: false, error: '요청 ID가 필요합니다.' });
        }

        // 1. 권한 확인 (본인의 예약인지)
        let custId = tokenCustId;
        if (!custId) {
            const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
            if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
            custId = uRows[0].CUST_ID;
        }

        const [reqCheck] = await pool.execute(
            'SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?',
            [reqId, custId]
        );

        if (reqCheck.length === 0) {
            return res.status(403).json({ success: false, error: '완료 처리 권한이 없습니다.' });
        }

        // [알림용 데이터 조회] 완료 처리 전 예약 확정 상태인 기사 목록 및 여정 제목 조회
        const [drivers] = await pool.execute(`
            SELECT DISTINCT DRIVER_ID 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'
        `, [reqId]);

        const [reqInfo] = await pool.execute(`
            SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        await connection.beginTransaction();

        // 2. 상태 변경 (TB_AUCTION_REQ -> DONE)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ SET DATA_STAT = "DONE" WHERE REQ_ID = ?',
            [reqId]
        );

        // 3. 관련 예약 상태 변경 (TB_BUS_RESERVATION -> DONE)
        // CONFIRM 상태인 것만 DONE으로 변경
        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = "DONE" WHERE REQ_ID = ? AND DATA_STAT = "CONFIRM"',
            [reqId]
        );

        await connection.commit();
        res.json({ success: true, message: '여행이 완료되었습니다.' });

        // [알림 발송] 트랜잭션 커밋 완료 후 비동기로 기사에게 푸시 메시지 발송
        if (drivers.length > 0 && reqInfo.length > 0) {
            const tripTitle = reqInfo[0].TRIP_TITLE;
            const title = '[여행 완료] 여행이 정상적으로 완료되었습니다.';
            const body = `여정: ${tripTitle}\n고객님이 여행 완료 처리를 완료했습니다. 수고하셨습니다!`;
            const link = `/estimate-detail-driver/${reqId}`;

            drivers.forEach(driver => {
                sendNotification(pool, {
                    custId: driver.DRIVER_ID,
                    title,
                    body,
                    link,
                    type: 'SYSTEM'
                }).catch(err => console.error(`[Notification] 여행 완료 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
            });
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[App Reservation Complete] Error:', error);
        res.status(500).json({ success: false, error: '여행 완료 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
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
                u.USER_IMAGE as avatar,
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
                if (v.type === 'START_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '출발 경유지' });
                else if (v.type === 'ROUND_TRIP') fullRoute.push({ type: 'ROUND', addr: v.addr, title: '목적지' });
                else if (v.type === 'END_WAY') fullRoute.push({ type: 'WAY', addr: v.addr, title: '도착 경유지' });
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
                u.USER_IMAGE as avatar,
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

        // 사진 처리 (FILE_ID를 실제 GCS 경로로 변환)
        let finalPhotos = [];
        if (bid.photos) {
            try {
                const photoIds = typeof bid.photos === 'string' ? JSON.parse(bid.photos) : bid.photos;
                if (Array.isArray(photoIds) && photoIds.length > 0) {
                    // 유효한 ID들만 필터링
                    const validIds = photoIds.map(id => String(id).trim()).filter(id => id && id !== 'null');

                    if (validIds.length > 0) {
                        const [fileRows] = await pool.execute(
                            `SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID IN (${validIds.map(() => '?').join(',')})`,
                            validIds
                        );

                        // ID별 경로 매핑
                        const fileMap = {};
                        fileRows.forEach(f => {
                            fileMap[String(f.FILE_ID).trim()] = f.GCS_PATH;
                        });

                        // 원본 순서 유지하며 URL 생성
                        finalPhotos = validIds.map(id => {
                            const path = fileMap[id];
                            if (path) {
                                return `/api/common/display-image?path=${encodeURIComponent(path)}`;
                            }
                            return null;
                        }).filter(p => p !== null);
                    }
                }
            } catch (e) {
                console.error('[JSON Parse Error] Vehicle Photos (estimate-detail):', e);
            }
        }
        bid.photos = finalPhotos;

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

        // 0. CUST_ID 및 이용 제한 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // 이용 제한 확인
        const [restrictionRows] = await connection.execute(`
            SELECT RESTRICT_STAT, RESTRICT_END_DT 
            FROM TB_USER_CANCEL_MANAGE 
            WHERE CUST_ID = ?
        `, [custId]);

        if (restrictionRows.length > 0) {
            const resData = restrictionRows[0];
            if (resData.RESTRICT_STAT === 'P') {
                await connection.rollback();
                return res.status(403).json({ success: false, error: '반복된 취소로 인해 서비스 이용이 무기한 제한되었습니다.' });
            } else if (resData.RESTRICT_STAT === 'Y' && resData.RESTRICT_END_DT && new Date(resData.RESTRICT_END_DT) > new Date()) {
                await connection.rollback();
                const endDt = new Date(resData.RESTRICT_END_DT).toLocaleDateString();
                return res.status(403).json({ success: false, error: `이전 취소 이력으로 인해 ${endDt}까지 서비스 이용이 제한됩니다.` });
            }
        }

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

        // 🔔 여행 요청 완료 후 매칭되는 기사에게 알림 전송 (비동기 백그라운드 실행)
        sendNotificationsToMatchingDrivers(reqId, tripTitle, safeBuses, 'CREATE').catch(err => {
            console.error('[Notification Error] Failed to send notifications after create:', err);
        });

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

/**
 * 🚌 [신규] 견적 요청 상세 조회 (수정용)
 * - REQ_ID를 기반으로 마스터, 차량, 경유지 정보를 한꺼번에 조회합니다.
 */
router.get('/auction-req/:id', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const userId = req.user.userId;

        // 1. 마스터 정보 조회
        const [masterRows] = await pool.execute(`
            SELECT 
                REQ_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_AMT, DATA_STAT
            FROM TB_AUCTION_REQ
            WHERE REQ_ID = ?
        `, [reqId]);

        if (masterRows.length === 0) {
            return res.status(404).json({ success: false, error: '요청 정보를 찾을 수 없습니다.' });
        }

        const master = masterRows[0];

        // 2. 차량 정보 조회
        const [busRows] = await pool.execute(`
            SELECT 
                REQ_BUS_SEQ, BUS_TYPE_CD, TOLLS_AMT, FUEL_COST, RES_BUS_AMT as reqAmt
            FROM TB_AUCTION_REQ_BUS
            WHERE REQ_ID = ?
            ORDER BY REQ_BUS_SEQ ASC
        `, [reqId]);

        // 3. 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT 
                VIA_SEQ, VIA_TYPE, VIA_ADDR as addr
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
        `, [reqId]);

        res.json({
            success: true,
            data: {
                ...master,
                buses: busRows,
                vias: viaRows
            }
        });
    } catch (error) {
        console.error('[App Auction Request Detail] Error:', error);
        res.status(500).json({ success: false, error: '정보 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * 🚌 [신규] 견적 요청 수정 (앱 전용)
 * - 기존 정보를 업데이트하고 차량/경유지 정보를 갱신합니다.
 */
router.put('/auction-req/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const reqId = req.params.id;
        const userId = req.user.userId;
        const { startAddr, endAddr, startDt, endDt, passengerCnt, buses, vias, tripTitle: clientTripTitle } = req.body;

        // 1. 권한 확인 (본인의 요청인지)
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        const [masterCheck] = await connection.execute(
            'SELECT TRAVELER_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?',
            [reqId]
        );

        if (masterCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.' });
        }

        if (masterCheck[0].TRAVELER_ID !== custId) {
            await connection.rollback();
            return res.status(403).json({ success: false, error: '수정 권한이 없습니다.' });
        }

        // 2. 마스터 업데이트
        const safeBuses = Array.isArray(buses) ? buses : [];
        const totalReqAmt = safeBuses.reduce((acc, b) => acc + (parseInt(b.reqAmt, 10) || 0), 0);
        const tripTitle = clientTripTitle || `${startAddr.split(' ')[0]} -> ${endAddr.split(' ')[0]} 여정`;
        const formatDt = (dtStr) => dtStr.replace('T', ' ').replace('Z', '').substring(0, 19);

        await connection.execute(`
            UPDATE TB_AUCTION_REQ SET
                TRIP_TITLE = ?, START_ADDR = ?, END_ADDR = ?, 
                START_DT = ?, END_DT = ?, REQ_AMT = ?, MOD_ID = ?, MOD_DT = NOW()
            WHERE REQ_ID = ?
        `, [tripTitle, startAddr, endAddr, formatDt(startDt), formatDt(endDt), totalReqAmt, custId, reqId]);

        // 3. 기존 차량/경유지 삭제
        await connection.execute('DELETE FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [reqId]);
        await connection.execute('DELETE FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ?', [reqId]);

        // 4. 새 차량 정보 저장
        if (safeBuses.length > 0) {
            let busSeq = 1;
            for (const bus of safeBuses) {
                const busAmt = parseInt(bus.reqAmt, 10) || 0;
                const feeTotal = Math.floor(busAmt * 0.066);
                const feeRefund = Math.floor(busAmt * 0.055);
                const feeAttribution = parseFloat((busAmt * 0.011).toFixed(3));

                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT, TOLLS_AMT, FUEL_COST, 
                        RES_BUS_AMT, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                        REG_ID, MOD_ID
                    ) VALUES (?, ?, ?, 'AUCTION', ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    reqId, busSeq++, bus.busTypeCd || bus.name, parseInt(bus.tollsAmt, 10) || 0, parseInt(bus.fuelCost, 10) || 0,
                    busAmt, feeTotal, feeRefund, feeAttribution, custId, custId
                ]);
            }
        }

        // 5. 새 경유지 정보 저장
        const safeVias = Array.isArray(vias) ? vias : [];
        if (safeVias.length > 0) {
            for (let i = 0; i < safeVias.length; i++) {
                const via = safeVias[i];
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR, REG_ID, MOD_ID
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [reqId, i + 1, via.type || via.viaType, via.addr || via.viaAddr || '', custId, custId]);
            }
        }

        await connection.commit();

        // 🔔 여행 요청 수정 완료 후 매칭되는 기사에게 알림 전송 (비동기 백그라운드 실행)
        sendNotificationsToMatchingDrivers(reqId, tripTitle, safeBuses, 'UPDATE').catch(err => {
            console.error('[Notification Error] Failed to send notifications after update:', err);
        });

        res.json({ success: true, message: '예약 정보가 수정되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update Auction Request Error:', error);
        res.status(500).json({ success: false, error: '수정 중 오류가 발생했습니다.' });
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
        const tokenCustId = req.user.custId;

        console.log(`[App Reservations] Request by userId: ${userId}, tokenCustId: ${tokenCustId}`);

        // 1. 사용자 CUST_ID 조회 (토큰에 있으면 우선 사용, 없으면 DB 조회)
        let custId = tokenCustId;
        if (!custId) {
            const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
            if (uRows.length === 0) {
                console.error(`[App Reservations] User not found: ${userId}`);
                return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
            }
            custId = uRows[0].CUST_ID;
        }
        console.log('[App Reservations] Final CustID for query:', custId);

        // 2. 예약 내역 조회 (TB_BUS_RESERVATION 기반, CONFIRM인 것만)
        const [rows] = await pool.execute(`
            SELECT 
                r.REQ_ID as id,
                r.DATA_STAT as requestStat,
                res.DATA_STAT as statusCode,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddr,
                DATE_FORMAT(r.START_DT, '%Y/%m/%d') as date,
                r.TRIP_TITLE as title,
                MIN(res.RES_ID) as firstResId,
                COUNT(res.RES_ID) as busCount,
                SUM(res.DRIVER_BIDDING_PRICE) as totalOfferPrice
            FROM TB_AUCTION_REQ r
            JOIN TB_BUS_RESERVATION res ON r.REQ_ID = res.REQ_ID
            WHERE r.TRAVELER_ID = ? AND res.DATA_STAT = 'CONFIRM'
            GROUP BY r.REQ_ID
            ORDER BY r.START_DT DESC
        `, [custId]);

        console.log(`[App Reservations] Found ${rows.length} trips for ${custId}`);

        // [최적화] 모든 예약의 사진 정보를 한꺼번에 처리하기 위해 관련 데이터 수집
        const reqIds = rows.map(r => r.id);
        if (reqIds.length > 0) {
            // 모든 예약의 경유지/목적지 정보 조회
            const [allVias] = await pool.execute(`
                SELECT REQ_ID, VIA_ADDR, VIA_TYPE 
                FROM TB_AUCTION_REQ_VIA 
                WHERE REQ_ID IN (${reqIds.map(() => '?').join(',')})
                ORDER BY REQ_ID, VIA_SEQ ASC
            `, reqIds);

            // 모든 예약의 확정 차량 및 기사 정보 조회
            const [allBuses] = await pool.execute(`
                SELECT 
                    BR.REQ_ID,
                    BR.RES_ID,
                    U.USER_NM as driverName,
                    U.HP_NO as driverPhone,
                    (SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = U.PROFILE_FILE_ID) as driverImagePath,
                    (SELECT CD_NM_KO FROM TB_COMMON_CODE WHERE GRP_CD = 'BUS_TYPE' AND DTL_CD = B.BUS_TYPE_CD) as busTypeName,
                    V.VEHICLE_NO as vehicleNo,
                    V.MODEL_NM as modelNm,
                    V.VEHICLE_PHOTOS_JSON
                FROM TB_BUS_RESERVATION BR
                JOIN TB_AUCTION_REQ_BUS B ON BR.REQ_ID = B.REQ_ID AND BR.REQ_BUS_SEQ = B.REQ_BUS_SEQ
                JOIN TB_USER U ON BR.DRIVER_ID = U.CUST_ID
                LEFT JOIN TB_BUS_DRIVER_VEHICLE V ON BR.BUS_ID = V.BUS_ID
                WHERE BR.REQ_ID IN (${reqIds.map(() => '?').join(',')}) AND BR.DATA_STAT = 'CONFIRM'
            `, reqIds);

            // 사진 ID 수집 및 URL 매핑 (N+1 방지)
            const allPhotoIds = [];
            allBuses.forEach(b => {
                if (b.VEHICLE_PHOTOS_JSON) {
                    try {
                        const photos = typeof b.VEHICLE_PHOTOS_JSON === 'string' ? JSON.parse(b.VEHICLE_PHOTOS_JSON) : b.VEHICLE_PHOTOS_JSON;
                        if (Array.isArray(photos) && photos.length > 0) {
                            allPhotoIds.push(String(photos[0]).trim());
                        }
                    } catch (e) { }
                }
            });

            let photoMap = {};
            if (allPhotoIds.length > 0) {
                const uniqueIds = [...new Set(allPhotoIds)];
                const [pRows] = await pool.execute(
                    `SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID IN (${uniqueIds.map(() => '?').join(',')})`,
                    uniqueIds
                );
                pRows.forEach(p => {
                    photoMap[String(p.FILE_ID).trim()] = `/api/common/display-image?path=${encodeURIComponent(p.GCS_PATH)}`;
                });
            }

            // 결과 데이터 보완
            rows.forEach(resObj => {
                // 1. 노선 정보 구성 (DB 데이터 기반 상세 명칭 추출)
                const vias = allVias.filter(v => v.REQ_ID === resObj.id);

                // 출발지/도착지 명칭 (주소 전체를 쓰거나 주요 명칭 추출)
                const startPoint = resObj.startAddr || '출발지';
                const endPoint = resObj.endAddr || '도착지';

                // 'ROUND_TRIP' (목적지) 찾기
                const destination = vias.find(v => v.VIA_TYPE === 'ROUND_TRIP');
                const destPoint = destination ? destination.VIA_ADDR : null;

                if (destPoint) {
                    resObj.simplifiedRoute = `${startPoint} → ${destPoint} → ${endPoint}`;
                    resObj.routeDetail = { start: startPoint, via: destPoint, end: endPoint };
                } else {
                    resObj.simplifiedRoute = `${startPoint} → ${endPoint}`;
                    resObj.routeDetail = { start: startPoint, via: null, end: endPoint };
                }

                // 2. 차량 및 기사 정보 매핑 (다수 차량 대응)
                const reservationBuses = allBuses.filter(b => b.REQ_ID === resObj.id);
                resObj.buses = reservationBuses.map(bus => {
                    let busImg = null;
                    if (bus.VEHICLE_PHOTOS_JSON) {
                        try {
                            const photos = typeof bus.VEHICLE_PHOTOS_JSON === 'string' ? JSON.parse(bus.VEHICLE_PHOTOS_JSON) : bus.VEHICLE_PHOTOS_JSON;
                            if (Array.isArray(photos) && photos.length > 0) {
                                busImg = photoMap[String(photos[0]).trim()];
                            }
                        } catch (e) { }
                    }

                    return {
                        resId: bus.RES_ID,
                        driverName: bus.driverName,
                        driverPhone: bus.driverPhone,
                        driverImage: bus.driverImagePath ? `/api/common/display-image?path=${encodeURIComponent(bus.driverImagePath)}` : null,
                        busType: bus.busTypeName,
                        vehicleNo: bus.vehicleNo,
                        modelNm: bus.modelNm,
                        busImage: busImg || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkFgpCqOKwslyeB-NDZZWgUztAqUL0bfHiOrJqNJJN6DpHr41urNw5IJbiscbKz7SRUeipoTldOC-T9K1hgHX0Ql-j8HNSBG7i7RsroxP2pU55sPH2h18ejgiAIUhlk7ClZgs-q20FqjXXkNpV6ztIhaTC2EUu5gNvLvdKaXaGHKYW2nXvxveE0DY6Z3XOqnvIyAdfKEvapFzLayq9xIjqgGqcuwwu4qmp5WnLSgsnzUNS17N7rvUar-ZpG0fnE-1dIGrFGlPczso'
                    };
                });

                // 첫 번째 차량 정보를 기본 정보로 설정 (하위 호환성)
                if (resObj.buses.length > 0) {
                    resObj.busType = resObj.buses[0].busType;
                    resObj.img = resObj.buses[0].busImage;
                }
            });
        }

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[App Reservations] Error:', error);
        res.status(500).json({ success: false, error: '예약 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});


// 11. 전체 견적 요청 취소 (상세 사유 및 증빙 서류 포함)
router.post('/cancel-request', authenticateToken, memoryUpload.single('file'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { reqId, cancelCode, cancelReasonText } = req.body;
        const userId = req.user.userId;
        const custId = req.user.custId;

        if (!reqId) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: '요청 ID가 누락되었습니다.' });
        }

        // [알림용 데이터 조회] 취소 전 해당 경매에 입찰 중인 기사 목록 및 여정 제목 조회
        const [drivers] = await connection.execute(`
            SELECT DISTINCT DRIVER_ID 
            FROM TB_BUS_RESERVATION 
            WHERE REQ_ID = ? AND DATA_STAT IN ('BIDDING', 'CONFIRM')
        `, [reqId]);

        const [reqInfo] = await connection.execute(`
            SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?
        `, [reqId]);

        // 1. 본인의 요청인지 확인 및 현재 상태 조회
        const [check] = await connection.execute('SELECT DATA_STAT FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?', [reqId, custId]);
        if (check.length === 0) {
            await connection.rollback();
            return res.status(403).json({ success: false, error: '취소 권한이 없거나 해당 요청을 찾을 수 없습니다.' });
        }
        const currentReqStat = check[0].DATA_STAT;

        // [추가] 견적 리스트(AUCTION) 상태이거나 버스변경(BUS_CHANGE) 상태인 경우 단순 취소 처리 (페널티 없음)
        if (currentReqStat === 'AUCTION' || currentReqStat === 'BUS_CHANGE') {
            // 사용자의 요청대로 TB_AUCTION_REQ, TB_AUCTION_REQ_BUS 테이블의 상태만 변경
            await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
            await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);

            // 기존 코드에서 예약 정보도 함께 취소 처리 (드라이버 혼선 방지 위해 유지 권장하나, 사용자 요청에 따라 최소화)
            // await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'CONFIRM\', \'DONE\')', [custId, reqId]);

            await connection.commit();
            res.json({ success: true, message: '견적 요청 취소가 완료되었습니다.' });

            // [알림 발송] 트랜잭션 커밋 완료 후 비동기로 기사에게 푸시 메시지 발송
            if (drivers.length > 0 && reqInfo.length > 0) {
                const tripTitle = reqInfo[0].TRIP_TITLE;
                const title = '[전체 취소] 고객님이 청약을 취소했습니다.';
                const body = `여정: ${tripTitle}\n요청하신 전체 여행 청약이 취소되었습니다.`;
                const link = `/estimate-detail-driver/${reqId}`;

                drivers.forEach(driver => {
                    sendNotification(pool, {
                        custId: driver.DRIVER_ID,
                        title,
                        body,
                        link,
                        type: 'SYSTEM'
                    }).catch(err => console.error(`[Notification] 전체 청약 취소 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
                });
            }
            return;
        }

        // 2. 증빙 서류 업로드 처리 (로컬 스토리지) - 페널티가 발생하는 경우에만 수행
        let gcsPath = null;
        if (req.file) {
            const uploadResult = await uploadToLocal(req.file, 'cancels', connection);
            gcsPath = uploadResult.url;

            // TB_FILE_MASTER 등록
            const fileQuery = `
                INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID)
                VALUES (?, 'CANCEL_DOC', 'LOCAL', ?, ?, ?, ?, ?, ?)
            `;
            await connection.execute(fileQuery, [
                uploadResult.fileId, gcsPath, uploadResult.originalName,
                uploadResult.ext, uploadResult.fileSize, custId, custId
            ]);
        }

        // 3. 현재 취소 횟수 조회 (페널티 적용 대상)
        const [manageRows] = await connection.execute(
            'SELECT CANCEL_CNT FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?',
            [custId]
        );

        let currentCnt = 0;
        if (manageRows.length > 0) {
            currentCnt = manageRows[0].CANCEL_CNT;
        } else {
            // 정보가 없으면 초기 행 생성
            await connection.execute(
                'INSERT INTO TB_USER_CANCEL_MANAGE (CUST_ID, CANCEL_CNT, REG_ID, MOD_ID) VALUES (?, 0, ?, ?)',
                [custId, custId, custId]
            );
        }

        const newCnt = currentCnt + 1;
        let restrictMonths = 0;
        let restrictYn = 'N'; // N: 정상, Y: 이용제한
        let restrictEndDt = null;

        // 페널티 정책 (누적 횟수에 따른 차등 제한)
        if (newCnt === 1) {
            restrictMonths = 3;
            restrictYn = 'Y';
        } else if (newCnt === 2) {
            restrictMonths = 6;
            restrictYn = 'Y';
        } else if (newCnt === 3) {
            restrictMonths = 9;
            restrictYn = 'Y';
        } else if (newCnt >= 4) {
            restrictYn = 'Y'; // 무기한은 별도 플래그가 없으므로 아주 먼 미래나 관리자 처리 필요하나 일단 Y로 세팅
        }

        // 취소 관리 테이블 업데이트 (DB.md 스키마에 맞게 컬럼명 보정)
        if (newCnt >= 4) {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_CNT = ?, 
                    CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = NOW(),
                    TRADE_RESTRICT_END_DT = '2099-12-31 23:59:59',
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ?
            `, [newCnt, custId, custId]);
        } else if (restrictYn === 'Y') {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_CNT = ?, 
                    CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                    TRADE_RESTRICT_YN = ?,
                    TRADE_RESTRICT_START_DT = NOW(),
                    TRADE_RESTRICT_END_DT = DATE_ADD(NOW(), INTERVAL ? MONTH),
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ?
            `, [newCnt, restrictYn, restrictMonths, custId, custId]);
        } else {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_CNT = ?, 
                    CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ?
            `, [newCnt, custId, custId]);
        }

        // 4. 취소 이력 테이블 등록
        const [[seqRow]] = await connection.execute(`
            SELECT IFNULL(MAX(HIST_SEQ), 0) + 1 AS HIST_SEQ
            FROM TB_USER_CANCEL_HIST
            WHERE CUST_ID = ?
        `, [custId]);

        const histSeq = seqRow.HIST_SEQ;

        await connection.execute(`
            INSERT INTO TB_USER_CANCEL_HIST (
                CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, 
                CANCEL_REASON_TEXT, REASON_DOC_FILE_NM, REG_ID, MOD_ID
            ) VALUES (?, ?, 'CANCEL_REASON', ?, ?, ?, ?, ?)
        `, [custId, histSeq, cancelCode || '06', cancelReasonText || '', gcsPath, custId, custId]);

        // 5. 기존 상태 변경 로직 (전체 요청, 차량 유닛, 응찰 정보)
        await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
        await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [custId, reqId]);
        await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'CONFIRM\', \'DONE\')', [custId, reqId]);

        await connection.commit();
        res.json({ success: true, message: '여행 취소 처리가 완료되었습니다.' });

        // [알림 발송] 트랜잭션 커밋 완료 후 비동기로 기사에게 푸시 메시지 발송
        if (drivers.length > 0 && reqInfo.length > 0) {
            const tripTitle = reqInfo[0].TRIP_TITLE;
            
            // 이전 상태가 CONFIRM(예약 확정)인 경우 '여행 취소' 문구 적용
            const isConfirmed = currentReqStat === 'CONFIRM';
            const title = isConfirmed 
                ? '[여행 취소] 고객님이 예약을 취소했습니다.' 
                : '[전체 취소] 고객님이 청약을 취소했습니다.';
            const body = isConfirmed
                ? `여정: ${tripTitle}\n확정되었던 예약이 취소되었습니다. 환불 및 상세 내용을 확인해 주세요.`
                : `여정: ${tripTitle}\n요청하신 전체 여행 청약이 취소되었습니다.`;
            const link = `/estimate-detail-driver/${reqId}`;

            drivers.forEach(driver => {
                sendNotification(pool, {
                    custId: driver.DRIVER_ID,
                    title,
                    body,
                    link,
                    type: 'SYSTEM'
                }).catch(err => console.error(`[Notification] 전체 취소 알림 발송 실패 (기사 ID: ${driver.DRIVER_ID}):`, err));
            });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[Cancel Request] Error Details:', {
            message: error.message,
            stack: error.stack,
            sql: error.sql,
            sqlMessage: error.sqlMessage
        });
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


// 19. FCM 기기 토큰 등록 및 업데이트 (Upsert)
router.post('/upsert-device-token', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fcmToken, clientKind = 'mobile' } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ success: false, error: 'FCM 토큰이 필요합니다.' });
        }

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // 2. Upsert 실행 (CUST_ID, CLIENT_KIND가 PK이므로 중복 시 UPDATE)
        await pool.execute(`
            INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND, REG_ID, MOD_ID)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                FCM_TOKEN = VALUES(FCM_TOKEN),
                MOD_DT = CURRENT_TIMESTAMP,
                MOD_ID = VALUES(MOD_ID)
        `, [custId, fcmToken, clientKind, userId, userId]);

        res.json({ success: true, message: '기기 토큰이 성공적으로 등록되었습니다.' });
    } catch (err) {
        console.error('Upsert device token error:', err);
        res.status(500).json({ success: false, error: '기기 토큰 등록 중 오류가 발생했습니다.' });
    }
});

// 20. 리뷰 제출 (고객용)
router.post('/submit-review', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.userId;
        const { resId, rating, comment } = req.body;

        if (!resId || !rating) {
            return res.status(400).json({ success: false, error: '예약 번호와 평점은 필수입니다.' });
        }

        // 1. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const custId = uRows[0].CUST_ID;

        // 2. 예약 정보 확인 (본인 소유 + 운행 완료 상태)
        const [resRows] = await connection.execute(`
            SELECT b.RES_ID, b.DRIVER_ID, b.DATA_STAT 
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            WHERE b.RES_ID = ? AND r.TRAVELER_ID = ?
        `, [resId, custId]);

        if (resRows.length === 0) {
            throw new Error('리뷰 가능한 운행 내역을 찾을 수 없습니다.');
        }

        const reservation = resRows[0];
        if (reservation.DATA_STAT !== 'DONE') {
            throw new Error('운행이 완료된 건에 대해서만 리뷰를 작성할 수 있습니다.');
        }

        // 3. 중복 리뷰 확인
        const [existingReview] = await connection.execute(
            'SELECT 1 FROM TB_TRIP_REVIEW WHERE RES_ID = ?',
            [resId]
        );
        if (existingReview.length > 0) {
            throw new Error('이미 리뷰를 작성한 미션입니다.');
        }

        // 4. 리뷰 등록
        // REVIEW_SEQ 계산 (간소화를 위해 1로 설정하거나 MAX+1)
        const [[seqRow]] = await connection.execute(
            'SELECT IFNULL(MAX(REVIEW_SEQ), 0) + 1 as nextSeq FROM TB_TRIP_REVIEW WHERE RES_ID = ?',
            [resId]
        );
        const nextSeq = seqRow.nextSeq;

        await connection.execute(`
            INSERT INTO TB_TRIP_REVIEW (
                RES_ID, REVIEW_SEQ, WRITER_ID, DRIVER_ID, STAR_RATING, COMMENT_TEXT, 
                REG_ID, REG_DT, MOD_ID, MOD_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
        `, [resId, nextSeq, custId, reservation.DRIVER_ID, rating, comment || '', userId, userId]);

        await connection.commit();
        res.json({ success: true, message: '리뷰가 성공적으로 등록되었습니다.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Submit review error:', err);
        res.status(400).json({ success: false, error: err.message || '리뷰 등록 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 21. 무통장 입금 안내 후 결제 상태 업데이트 (PAYMENT_STS = '1')
router.post('/payment-bank', authenticateToken, async (req, res) => {
    try {
        const { reqId } = req.body;
        if (!reqId) {
            return res.status(400).json({ success: false, error: '요청 ID가 누락되었습니다.' });
        }

        // TB_AUCTION_REQ 테이블의 PAYMENT_STS 컬럼을 "1"로 업데이트합니다.
        await pool.execute(
            'UPDATE TB_AUCTION_REQ SET PAYMENT_STS = "1", MOD_DT = NOW() WHERE REQ_ID = ?',
            [reqId]
        );

        res.json({ success: true, message: '무통장 입금 안내 및 결제 상태 업데이트가 완료되었습니다.' });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ success: false, error: error.message || '결제 상태 업데이트 중 오류가 발생했습니다.' });
    }
});

/**
 * 🔔 매칭되는 차량종류를 보유한 활성 기사들에게 알림을 전송하는 헬퍼 함수
 * @param {string} reqId 요청 ID (REQ_ID)
 * @param {string} tripTitle 여정 제목
 * @param {Array} buses 고객이 요청한 버스 목록 (busTypeCd 포함)
 * @param {string} type 'CREATE' (등록) 또는 'UPDATE' (수정)
 */
async function sendNotificationsToMatchingDrivers(reqId, tripTitle, buses, type = 'CREATE') {
    try {
        if (!buses || buses.length === 0) return;

        // 1. 요청된 버스의 차종(busTypeCd) 추출 및 중복 제거
        const busTypes = [...new Set(buses.map(b => b.busTypeCd || b.name))].filter(Boolean);
        if (busTypes.length === 0) return;

        // 2. 기사 조회: USER_TYPE = 'DRIVER', USER_STAT = 'ACTIVE' 이면서 해당 차종 보유 기사
        const query = `
            SELECT DISTINCT u.CUST_ID 
            FROM TB_USER u
            JOIN TB_BUS_DRIVER_VEHICLE v ON u.CUST_ID = v.CUST_ID
            WHERE u.USER_TYPE = 'DRIVER' 
              AND u.USER_STAT = 'ACTIVE' 
              AND v.SERVICE_CLASS IN (?)
        `;

        // mysql2의 IN (?) 바인딩 지원을 위해 query() 사용
        const [drivers] = await pool.query(query, [busTypes]);
        if (!drivers || drivers.length === 0) {
            console.log(`[Notification] No matching active drivers for bus types: ${busTypes.join(', ')}`);
            return;
        }

        const { sendNotification } = require('../services/notificationService');

        // 3. 알림 문구 구성
        let title = '';
        let body = '';
        if (type === 'CREATE') {
            title = '[신규 청약 요청] 새로운 여행 요청이 등록되었습니다.';
            body = `여정: ${tripTitle}\n새로운 여행 요청이 등록되었습니다. 청약(입찰)을 진행해 주세요.`;
        } else {
            title = '[청약 요청 수정] 여행 요청 정보가 수정되었습니다.';
            body = `여정: ${tripTitle}\n여행 요청의 상세 내용이 수정되었습니다. 변경된 내용을 확인해 주세요.`;
        }
        const link = `/estimate-detail-driver/${reqId}`;

        // 4. 기사별 비동기 병렬 전송
        const sendPromises = drivers.map(driver => {
            return sendNotification(pool, {
                custId: driver.CUST_ID,
                title,
                body,
                link,
                type: 'SYSTEM'
            }).catch(err => {
                console.error(`[Notification] Failed to send notification to driver ${driver.CUST_ID}:`, err.message);
            });
        });

        await Promise.all(sendPromises);
        console.log(`[Notification] Successfully processed notifications for ${drivers.length} drivers.`);
    } catch (err) {
        console.error('[Notification] Error in sendNotificationsToMatchingDrivers:', err);
    }
}

module.exports = router;

