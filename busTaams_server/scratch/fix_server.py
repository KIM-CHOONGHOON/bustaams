import sys
import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix line 570: pending-requests
pending_requests_old = """// 2. 고객의 견적 요청 조회
app.get('/api/app/customer/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [rows] = await pool.execute(
            `SELECT BIN_TO_UUID(REQ_UUID) as reqUuid, TRIP_TITLE, START_ADDR, END_ADDR, 
                    DATE_FORMAT(START_DT, '%Y-%m-%d') as startDt, REQ_STAT,
                    (SELECT COUNT(*) FROM TB_BID WHERE REQ_UUID = TB_AUCTION_REQ.REQ_UUID) as bidCount
             FROM TB_AUCTION_REQ WHERE TRAVELER_UUID = ? ORDER BY REG_DT DESC`,
            [userUuidBuf]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '조회 실패' });
    }
});"""

pending_requests_new = """// 2. 고객의 견적 요청 조회
app.get('/api/app/customer/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            `SELECT r.REQ_ID as reqUuid, r.TRIP_TITLE as tripTitle, r.START_ADDR as startAddr, r.END_ADDR as endAddr, 
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d') as startDt, r.DATA_STAT as reqStat,
                    (SELECT COUNT(*) FROM TB_BUS_RESERVATION WHERE REQ_ID = r.REQ_ID) as bidCount
             FROM TB_AUCTION_REQ r
             JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
             WHERE u.USER_ID = ? ORDER BY r.REG_DT DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '조회 실패' });
    }
});"""

content = content.replace(pending_requests_old, pending_requests_new)

# 2. Fix line 589: available-estimates
available_estimates_old = """// 3. 기사: 참여 가능한 견적 목록
app.get('/api/driver/available-estimates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        
        const [driverInfo] = await pool.execute(
            `SELECT 
                v.SERVICE_CLASS,
                fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE v.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [req.user.userId]
        );
        
        let driverBusType = null;
        let driverBusImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800'; 
        
        if (driverInfo.length > 0) {
            driverBusType = driverInfo[0].SERVICE_CLASS;
            if (driverInfo[0].GCS_PATH) {
                driverBusImg = driverInfo[0].GCS_PATH;
            }
        }

        // 2. 이용 가능한 견적 조회
        if (!driverBusType) {
            return res.json({ success: true, data: [], message: '등록된 차량 정보가 없습니다.' });
        }

        let query = `
            SELECT 
                HEX(r.REQ_UUID) as id, 
                r.TRIP_TITLE as title, 
                r.START_ADDR as departure, 
                r.END_ADDR as destination, 
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate,
                COALESCE(r.PASSENGER_CNT, 0) as participants,
                rb.BUS_TYPE_CD as busTypeNm,
                COALESCE(rb.REQ_AMT, r.REQ_AMT, 0) as price,
                COALESCE(u.USER_NM, '익명 고객님') as customerName,
                u.PROFILE_IMG_PATH as customerAvatar,
                '입찰중' as timeLeft,
                ? as image
            FROM TB_AUCTION_REQ r
            JOIN TB_AUCTION_REQ_BUS rb ON r.REQ_UUID = rb.REQ_UUID
            LEFT JOIN TB_USER u ON r.TRAVELER_UUID = u.USER_UUID
            WHERE rb.BUS_TYPE_CD = ? 
            AND rb.RES_STAT = 'BIDDING'
            AND NOT EXISTS (
                SELECT 1 FROM TB_BID b 
                WHERE b.REQ_UUID = r.REQ_UUID 
                  AND b.DRIVER_UUID = ?
            )
            ORDER BY r.REG_DT DESC
        `;

        const [rows] = await pool.execute(query, [driverBusImg, driverBusType, userUuidBuf]);
        
        res.json({ 
            success: true, 
            data: rows,
            debug: { driverBusType, count: rows.length } 
        });
    } catch (err) {
        console.error('Available estimates fetch error:', err);
        res.status(500).json({ error: '목록 조회 실패' });
    }
});"""

available_estimates_new = """// 3. 기사: 참여 가능한 견적 목록
app.get('/api/driver/available-estimates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [driverInfo] = await pool.execute(
            `SELECT 
                v.SERVICE_CLASS,
                fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             JOIN TB_USER u ON v.CUST_ID = u.CUST_ID
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE u.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [userId]
        );
        
        let driverBusType = null;
        let driverBusImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800'; 
        
        if (driverInfo.length > 0) {
            driverBusType = driverInfo[0].SERVICE_CLASS;
            if (driverInfo[0].GCS_PATH) {
                driverBusImg = driverInfo[0].GCS_PATH;
            }
        }

        // 2. 이용 가능한 견적 조회
        if (!driverBusType) {
            return res.json({ success: true, data: [], message: '등록된 차량 정보가 없습니다.' });
        }

        let query = `
            SELECT 
                r.REQ_ID as id, 
                r.TRIP_TITLE as title, 
                r.START_ADDR as departure, 
                r.END_ADDR as destination, 
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate,
                COALESCE(r.PASSENGER_CNT, 0) as participants,
                rb.BUS_TYPE_CD as busTypeNm,
                COALESCE(rb.RES_BUS_AMT, r.REQ_AMT, 0) as price,
                COALESCE(u.USER_NM, '익명 고객님') as customerName,
                u.PROFILE_IMG_PATH as customerAvatar,
                '입찰중' as timeLeft,
                ? as image
            FROM TB_AUCTION_REQ r
            JOIN TB_AUCTION_REQ_BUS rb ON r.REQ_ID = rb.REQ_ID
            LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
            WHERE rb.BUS_TYPE_CD = ? 
            AND rb.DATA_STAT = 'AUCTION'
            AND NOT EXISTS (
                SELECT 1 FROM TB_BUS_RESERVATION b 
                JOIN TB_USER du ON b.DRIVER_ID = du.USER_ID
                WHERE b.REQ_ID = r.REQ_ID 
                  AND du.USER_ID = ?
            )
            ORDER BY r.REG_DT DESC
        `;

        const [rows] = await pool.execute(query, [driverBusImg, driverBusType, userId]);
        
        res.json({ 
            success: true, 
            data: rows,
            debug: { driverBusType, count: rows.length } 
        });
    } catch (err) {
        console.error('Available estimates fetch error:', err);
        res.status(500).json({ error: '목록 조회 실패' });
    }
});"""

content = content.replace(available_estimates_old, available_estimates_new)

# 3. Fix line 663: failed-estimates
failed_estimates_old = """// 4. 기사: 유찰/입찰 실패 내역
app.get('/api/driver/failed-estimates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userUuidBuf = uuidToBuffer(req.user.userUuid);
        const [rows] = await pool.execute(
            `SELECT HEX(b.REQ_UUID) as resUuid, r.TRIP_TITLE as tripTitle, 
                    r.START_ADDR as startAddr, r.END_ADDR as endAddr, 
                    DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate, '유찰' as status
             FROM TB_BID b
             JOIN TB_AUCTION_REQ r ON b.REQ_UUID = r.REQ_UUID
             WHERE b.DRIVER_UUID = ? AND b.BID_STAT = 'FAILED'
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
             WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'FAILED'
             ORDER BY b.REG_DT DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '내역 조회 실패' });
    }
});"""

failed_estimates_new = """// 4. 기사: 유찰/입찰 실패 내역
app.get('/api/driver/failed-estimates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.execute(
            `SELECT b.REQ_ID as resUuid, r.TRIP_TITLE as tripTitle, 
                    r.START_ADDR as startAddr, r.END_ADDR as endAddr, 
                    DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDate, '유찰' as status
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
             JOIN TB_USER u ON b.DRIVER_ID = u.USER_ID
             WHERE u.USER_ID = ? AND b.DATA_STAT = 'FAILED'
             ORDER BY b.REG_DT DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: '내역 조회 실패' });
    }
});"""

content = content.replace(failed_estimates_old, failed_estimates_new)

# 4. Fix line 869: /api/app/driver/estimate/:id user_id mapping
driver_estimate_old = """        // 3. 기사의 최신 차량 이미지 조회 (미리보기용 - 검증된 테이블 사용)
        const [driverImg] = await pool.execute(
            `SELECT fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE v.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [req.user.userId]
        );"""

driver_estimate_new = """        // 3. 기사의 최신 차량 이미지 조회 (미리보기용 - 검증된 테이블 사용)
        const [driverImg] = await pool.execute(
            `SELECT fm.GCS_PATH
             FROM TB_BUS_DRIVER_VEHICLE v
             JOIN TB_USER u ON v.CUST_ID = u.CUST_ID
             LEFT JOIN TB_BUS_DRIVER_VEHICLE_FILE_HIST vh ON v.BUS_ID = vh.BUS_ID AND vh.FILE_CATEGORY = 'PHOTO'
             LEFT JOIN TB_FILE_MASTER fm ON vh.FILE_ID = fm.FILE_ID
             WHERE u.USER_ID = ? 
             ORDER BY vh.REG_DT DESC LIMIT 1`,
            [req.user.userId]
        );"""

content = content.replace(driver_estimate_old, driver_estimate_new)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
