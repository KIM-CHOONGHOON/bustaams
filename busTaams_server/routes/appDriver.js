const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { pool, getNextId, getBucket, bucketName } = require('../db');
const { encrypt, decrypt } = require('../crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { registerBusDriverPaymentCard } = require('../lib/busDriverCreditCardRegistration');
const { sendNotification } = require('../services/notificationService');
const { runDriverVerificationsForProfileSetup } = require('../driverVerification');
const { processBankbookOcr, processBizRegOcr } = require('../services/ocrService');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

// 💰 기사 데이터 이용료 동적 계산 헬퍼 함수 (한글 주석)
async function calculateDriverDynamicFee(connection, custId, biddingPrice) {
    try {
        // 1. TB_MOM_MEMBER에서 기사의 현재 월(YYYYMM)의 사용 현황 및 회원등급 조회
        const [momRows] = await connection.execute(
            `SELECT FEE_POLICY, BASIC_CNT, USE_CNT 
             FROM TB_MOM_MEMBER 
             WHERE CUST_ID = ? AND YYYYMM = DATE_FORMAT(NOW(), '%Y%m')`,
            [custId]
        );

        let feePolicy = 'DRIVER'; // 기본값 (일반 기사)
        let basicCnt = 0;
        let useCnt = 0;

        if (momRows.length > 0) {
            feePolicy = momRows[0].FEE_POLICY;
            basicCnt = momRows[0].BASIC_CNT;
            useCnt = momRows[0].USE_CNT;
        } else {
            // 월 정보가 없으면 TB_DRIVER_DETAIL에서 기사 등급 조회
            const [driverRows] = await connection.execute(
                "SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?",
                [custId]
            );
            if (driverRows.length > 0) {
                feePolicy = driverRows[0].FEE_POLICY;
            }
        }

        // 등급별 한도 설정 (Bronze: 10, Gold: 20, Platinum: 30)
        if (feePolicy === 'DRIVER_GENERAL') {
            basicCnt = 10;
        } else if (feePolicy === 'DRIVER_MIDDLE') {
            basicCnt = 20;
        } else if (feePolicy === 'DRIVER_HIGH') {
            basicCnt = 30;
        }

        let feeRate = 0.033; // 기본 수수료 3.3% (일반 기사 - 일반일 경우는 무조건 건당 3.3%)

        if (['DRIVER_GENERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(feePolicy)) {
            if (useCnt < basicCnt) {
                feeRate = 0.022; // 한도 내 2.2%
            } else {
                feeRate = 0.033; // 한도 초과 시 3.3%
            }
        }

        const feeTotalAmt = Math.floor(biddingPrice * feeRate);

        return {
            feePolicy,
            feeRate,
            feeTotalAmt
        };
    } catch (err) {
        console.error('[calculateDriverDynamicFee] Error:', err);
        return {
            feePolicy: 'DRIVER',
            feeRate: 0.033,
            feeTotalAmt: Math.floor(biddingPrice * 0.033)
        };
    }
}

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });

    jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        req.user = user;
        next();
    });
};

// GCS 업로드를 위한 메모리 스토리지 설정
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

// 로컬 파일 업로드 공통 함수 (GCS 대체)
const uploadToGCS = async (file, folder, connection = null) => {
    if (!file) return null;
    const ext = path.extname(file.originalname).replace('.', '') || 'png';
    const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20, connection);
    const objectKey = `${folder}/${fileId}.${ext}`;
    
    // 📂 로컬 uploads 디렉토리에 저장
    const localPath = path.join(__dirname, '..', 'uploads', objectKey);
    const localDir = path.dirname(localPath);
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }
    fs.writeFileSync(localPath, file.buffer);

    return {
        fileId,
        url: `https://bustaams.cafe24.com/uploads/${objectKey}`,
        ext,
        originalName: file.originalname,
        fileSize: file.size
    };
};

/**
 * [App] 기사 대시보드 요약 정보 (통계 및 등록 상태)
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. 기사 기본 정보 및 CUST_ID 조회 (TB_USER + TB_FILE_MASTER 조인)
        const [uRows] = await pool.execute(
            `SELECT u.CUST_ID, u.USER_NM, 
                    CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as userImage 
             FROM TB_USER u 
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
             WHERE u.USER_ID = ?`,
            [userId]
        );
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
        const { CUST_ID: custId, USER_NM: userName, userImage } = uRows[0];

        // 2. 기사 상세 정보 및 요금 정책 조회 (TB_DRIVER_DETAIL + TB_COMMON_CODE)
        const [detailRows] = await pool.execute(
            `SELECT d.FEE_POLICY, c.CD_NM_KO as feePolicyNm 
             FROM TB_DRIVER_DETAIL d 
             LEFT JOIN TB_COMMON_CODE c ON c.GRP_CD = 'FEE_POLICY' AND c.DTL_CD = d.FEE_POLICY 
             WHERE d.CUST_ID = ?`,
            [custId]
        );
        const isDriverInfoRegistered = detailRows.length > 0;
        const feePolicy = isDriverInfoRegistered ? detailRows[0].FEE_POLICY : null;
        const feePolicyNm = isDriverInfoRegistered ? detailRows[0].feePolicyNm : '미가입';

        // 3. 버스 정보 등록 여부 확인 및 버스 타입 조회 (TB_BUS_DRIVER_VEHICLE)
        const [busRows] = await pool.execute(
            'SELECT SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?',
            [custId]
        );
        const isBusInfoRegistered = busRows.length > 0;
        const busType = isBusInfoRegistered ? busRows[0].SERVICE_CLASS : null;

        // 4. 경매 통계 및 최신 리스트 (버스 타입 일치 + AUCTION 상태)
        let countAuctions = 0;
        let auctionList = [];

        if (busType) {
            // 가용한 경매 건수 (버스 타입 일치 + AUCTION 상태 + 오늘 이후 운행 시작)
            const [countRows] = await pool.execute(
                `SELECT COUNT(*) as cnt 
                 FROM TB_AUCTION_REQ_BUS b
                 JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
                 WHERE b.BUS_TYPE_CD = ? AND b.DATA_STAT = 'AUCTION' AND r.START_DT >= CURDATE()`,
                [busType]
            );
            countAuctions = countRows[0].cnt;

            // 최신 경매 리스트 (최대 3건, 오늘 이후 운행 시작)
            // 기사 차량 등급에 매칭되는 개별 차량 금액(b.RES_BUS_AMT)을 입찰가로 노출하도록 변경 (한글 주석)
            const [listRows] = await pool.execute(
                `SELECT 
                    r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                    DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
                    b.RES_BUS_AMT as price,
                    r.REG_DT as regDt,
                    (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                    (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
                 FROM TB_AUCTION_REQ r
                 JOIN TB_AUCTION_REQ_BUS b ON r.REQ_ID = b.REQ_ID
                 WHERE b.BUS_TYPE_CD = ? AND b.DATA_STAT IN ('AUCTION', 'BUS_CHANGE', 'DRIVER_CANCEL') AND r.START_DT >= CURDATE()
                 ORDER BY r.REG_DT DESC LIMIT 3`,
                [busType]
            );

            // 시간 경과 표시 및 경로 가공
            auctionList = listRows.map(row => {
                const diffMin = Math.floor((new Date() - new Date(row.regDt)) / 60000);

                const endAddr = row.endAddrVia || row.endAddrMaster;

                // 경로 시퀀스 생성: 출발 -> 출발경유 -> 회차 -> 회차경유 -> 도착
                const pathParts = [row.startAddr];
                if (row.startVia) pathParts.push(...row.startVia.split(','));
                if (row.roundTrip) pathParts.push(row.roundTrip);
                if (row.endVia) pathParts.push(...row.endVia.split(','));
                pathParts.push(endAddr);

                return {
                    ...row,
                    endAddr: endAddr, // 프론트엔드 호환용
                    fullPath: pathParts,
                    timeAgo: diffMin < 60 ? `${diffMin}분 전` : `${Math.floor(diffMin / 60)}시간 전`
                };
            });
        }

        // 5. 5개 단계별 세부 통계 계산 (TB_BUS_RESERVATION.DATA_STAT 컬럼 기준 - 기사 개별 차량 승인 상태)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const [statsRows] = await pool.execute(
            `SELECT 
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'CUSTOMER_PAY_WAIT') as countCustomerWait,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'DRIVER_PAY_WAIT') as countDriverPayWait,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'FINAL_APPROVAL_WAIT') as countFinalApprovalWait,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'CONFIRM') as countConfirmed,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'DONE') as countDone,
                (SELECT SUM(b.DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'DONE' AND DATE_FORMAT(b.MOD_DT, '%Y-%m') = ?) as monthlyProfit,
                (SELECT SUM(b.DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'CONFIRM' AND DATE_FORMAT(r.START_DT, '%Y-%m') = ?) as pendingProfit,
                (SELECT SUM(b.DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION b JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'DONE') as totalProfit`,
            [custId, custId, custId, custId, custId, custId, currentMonth, custId, currentMonth, custId]
        );

        // 6. 오늘의 운행 (Today's Schedule)
        const [todayRows] = await pool.execute(
            `SELECT 
                b.RES_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddr,
                DATE_FORMAT(r.START_DT, '%H:%i') as time,
                b.DRIVER_BIDDING_PRICE as price,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
             WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'CONFIRM' AND DATE(r.START_DT) = CURDATE()
             LIMIT 1`,
            [custId]
        );

        // 7. 이용 제한 상태 조회
        const [restrictRows] = await pool.execute(`
            SELECT RESTRICT_STAT, RESTRICT_END_DT, CANCEL_BUS_DRIVER_CNT
            FROM TB_USER_CANCEL_MANAGE
            WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?) AND USER_TYPE = 'DRIVER'
        `, [userId]);

        let restriction = null;
        if (restrictRows.length > 0) {
            const r = restrictRows[0];
            const now = new Date();
            const endDt = r.RESTRICT_END_DT ? new Date(r.RESTRICT_END_DT) : null;

            if (r.RESTRICT_STAT === 'P') {
                restriction = {
                    status: 'P',
                    message: '운영정책에 의해 서비스 이용이 무기한 제한되었습니다.'
                };
            } else if (r.RESTRICT_STAT === 'Y' && endDt && endDt > now) {
                const dateStr = endDt.toISOString().split('T')[0];
                restriction = {
                    status: 'Y',
                    endDt: dateStr,
                    message: `취소 패널티로 인해 ${dateStr}까지 신규 청약이 제한됩니다.`
                };
            }
        }

        res.json({
            success: true,
            data: {
                userName,
                userImage,
                isDriverInfoRegistered,
                isBusInfoRegistered,
                countBidding: statsRows[0].countCustomerWait || 0, // 기존 호환용
                countCustomerWait: statsRows[0].countCustomerWait || 0,
                countDriverPayWait: statsRows[0].countDriverPayWait || 0,
                countFinalApprovalWait: statsRows[0].countFinalApprovalWait || 0,
                countConfirmed: statsRows[0].countConfirmed || 0,
                countDone: statsRows[0].countDone || 0,
                monthlyProfit: statsRows[0].monthlyProfit || 0,
                pendingProfit: statsRows[0].pendingProfit || 0,
                totalProfit: statsRows[0].totalProfit || 0,
                todayTrip: todayRows.length > 0 ? todayRows[0] : null,
                countAuctions,
                auctionList,
                restriction,
                feePolicy,
                feePolicyNm
            }
        });
    } catch (error) {
        console.error('[App Driver Dashboard] Error:', error);
        res.status(500).json({ success: false, error: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 이용 가능한 견적 목록 조회 (전체)
 */
router.get('/auctions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [busRows] = await pool.execute(
            'SELECT SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?',
            [custId]
        );
        if (busRows.length === 0) return res.json({ success: true, data: [] });
        const busType = busRows[0].SERVICE_CLASS;

        // 기사 차량 등급에 매칭되는 개별 차량 금액(b.RES_BUS_AMT)을 입찰가로 노출하도록 변경 (한글 주석)
        const [listRows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
                b.RES_BUS_AMT as price,
                r.REG_DT as regDt,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
             FROM TB_AUCTION_REQ r
             JOIN TB_AUCTION_REQ_BUS b ON r.REQ_ID = b.REQ_ID
             WHERE b.BUS_TYPE_CD = ? AND b.DATA_STAT IN ('AUCTION' , 'BUS_CHANGE', 'DRIVER_CANCEL') AND r.START_DT >= CURDATE()
             ORDER BY r.REG_DT DESC`,
            [busType]
        );

        const auctionList = listRows.map(row => {
            const diffMin = Math.floor((new Date() - new Date(row.regDt)) / 60000);

            const endAddr = row.endAddrVia || row.endAddrMaster;

            // 경로 시퀀스 가공
            const pathParts = [row.startAddr];
            if (row.startVia) pathParts.push(...row.startVia.split(','));
            if (row.roundTrip) pathParts.push(row.roundTrip);
            if (row.endVia) pathParts.push(...row.endVia.split(','));
            pathParts.push(endAddr);

            return {
                ...row,
                endAddr: endAddr, // 프론트엔드 호환용
                fullPath: pathParts,
                timeAgo: diffMin < 60 ? `${diffMin}분 전` : `${Math.floor(diffMin / 60)}시간 전`
            };
        });

        res.json({ success: true, data: auctionList });
    } catch (err) {
        console.error('Fetch auctions error:', err);
        res.status(500).json({ error: '견적 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 이용 가능한 견적 상세 조회
 */
router.get('/auctions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // 기사의 CUST_ID 및 등록 버스 등급 조회 (한글 주석)
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [busRows] = await pool.execute(
            'SELECT SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?',
            [custId]
        );
        const busType = busRows.length > 0 ? busRows[0].SERVICE_CLASS : null;

        // 1. 마스터 및 경유지 정보 조회 (기사 등록 차량 등급에 맞는 금액을 price로 조회) (한글 주석)
        const [masterRows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
                r.PASSENGER_CNT as passengers,
                r.DATA_STAT as reqStatus,
                COALESCE(
                    (SELECT b.RES_BUS_AMT FROM TB_AUCTION_REQ_BUS b WHERE b.REQ_ID = r.REQ_ID AND b.BUS_TYPE_CD = ? LIMIT 1),
                    r.REQ_AMT
                ) as price,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_NODE' LIMIT 1) as startAddrVia,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
             FROM TB_AUCTION_REQ r
             WHERE r.REQ_ID = ?`,
            [busType, id]
        );
        if (masterRows.length === 0) return res.status(404).json({ error: '요청 정보를 찾을 수 없습니다.' });
        const row = masterRows[0];
        const endAddr = row.endAddrVia || row.endAddrMaster;

        // [추가] 해당 기사의 이 요청에 대한 입찰/예약 상태 조회 (한글 주석)
        const [reservationRows] = await pool.execute(
            `SELECT DATA_STAT 
             FROM TB_BUS_RESERVATION 
             WHERE REQ_ID = ? AND DRIVER_ID = ?
             ORDER BY REG_DT DESC LIMIT 1`,
            [id, custId]
        );
        const driverReservationStatus = reservationRows.length > 0 ? reservationRows[0].DATA_STAT : null;

        // 경로 시퀀스 가공
        const fullPath = [
            { label: '출발지', addr: row.startAddrVia || row.startAddr },
            ...(row.startVia ? row.startVia.split(',').map(v => ({ label: '출발 경유지', addr: v })) : []),
            ...(row.roundTrip ? [{ label: '목적지', addr: row.roundTrip }] : []),
            ...(row.endVia ? row.endVia.split(',').map(v => ({ label: '도착 경유지', addr: v })) : []),
            { label: '최종 도착지', addr: endAddr }
        ];

        res.json({
            success: true,
            data: {
                ...row,
                fullPath,
                driverReservationStatus
            }
        });
    } catch (err) {
        console.error('Fetch auction detail error:', err);
        res.status(500).json({ error: '견적 상세 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 정보 등록용 프로필 조회
 * TB_USER, TB_DRIVER_DETAIL, TB_DRIVER_DOCS 정보를 통합하여 반환
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. TB_USER 기본 정보 (성함, 번호, 주민번호 등 + 프로필 이미지 조인)
        const [userRows] = await pool.execute(
            `SELECT u.CUST_ID, u.USER_NM, u.HP_NO, u.RESIDENT_NO_ENC, 
                    CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as userImage 
             FROM TB_USER u 
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID 
             WHERE u.USER_ID = ?`,
            [userId]
        );
        if (userRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const userData = userRows[0];
        const custId = userData.CUST_ID;

        // 2. TB_DRIVER_DETAIL 상세 정보 (주소, 요금제 등)
        const [detailRows] = await pool.execute(
            'SELECT ZIPCODE as zipcode, ADDRESS as address, DETAIL_ADDRESS as detailAddress, SEX as sex, ADDR_TYPE as addrType, SELF_INTRO as selfIntro, FEE_POLICY as feePolicy, BANK_NM as bankNm, ACCT_NO as acctNo, ACCT_HOLD as acctHold FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );

        // 2-1. TB_PARTNER_BIZ_INFO 사업자 정보 조회 (추가됨)
        const [bizRows] = await pool.execute(
            'SELECT BIZ_NO as bizNo, BIZ_NM as bizNm, CEO_NM as ceoNm FROM TB_PARTNER_BIZ_INFO WHERE TARGET_TYPE = "DRIVER" AND TARGET_ID = ?',
            [custId]
        );

        // 3. TB_DRIVER_DOCS 인증 서류 정보 (면허증, 자격증 등)
        const [docRows] = await pool.execute(
            `SELECT DOC_TYPE, LICENSE_TYPE_CD, DOC_NO_ENC, DATE_FORMAT(ISSUE_DT, '%Y-%m-%d') as issueDt, INFO_STAT_CD, 
                    CASE WHEN d.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as filePath, 
                    APPROVE_STAT as approveStat
             FROM TB_DRIVER_DOCS d
             LEFT JOIN TB_FILE_MASTER f ON d.GCS_PATH = f.GCS_PATH
             WHERE d.CUST_ID = ? ORDER BY d.REG_DT DESC`,
            [custId]
        );

        // 다음 달 적용 예정 요금제 조회 (한글 주석)
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextYyyymm = nextMonth.getFullYear().toString() + String(nextMonth.getMonth() + 1).padStart(2, '0');

        const [reqRows] = await pool.execute(
            `SELECT FEE_POLICY FROM TB_MOM_MEMBER_REQ 
             WHERE CUST_ID = ? AND YYYYMM = ? AND APPLY_YN = 'N' 
             ORDER BY REG_DT DESC LIMIT 1`,
            [custId, nextYyyymm]
        );
        const pendingPolicyRaw = reqRows.length > 0 ? reqRows[0].FEE_POLICY : null;
        // DB의 DRIVER_GENERAL 스펠링을 프론트엔드의 DRIVER_GENNERAL과 매핑 (한글 주석)
        const pendingPolicy = pendingPolicyRaw === 'DRIVER_GENERAL' ? 'DRIVER_GENNERAL' : pendingPolicyRaw;

        const plainRrn = userData.RESIDENT_NO_ENC ? decrypt(userData.RESIDENT_NO_ENC) : '';
        let residentNoDisplay = '';
        if (plainRrn) {
            const cleaned = plainRrn.replace(/[^0-9]/g, '');
            if (cleaned.length === 13) {
                residentNoDisplay = `${cleaned.substring(0, 6)}-${cleaned.substring(6, 7)}******`;
            } else if (plainRrn.includes('-')) {
                const parts = plainRrn.split('-');
                if (parts[0].length === 6 && parts[1].length >= 1) {
                    residentNoDisplay = `${parts[0]}-${parts[1].charAt(0)}******`;
                }
            } else {
                residentNoDisplay = plainRrn;
            }
        }

        const driverData = {
            sex: 'M',
            addrType: 'HOME',
            selfIntro: '',
            bankNm: '',
            acctNo: '',
            acctHold: '',
            ...(detailRows.length > 0 ? detailRows[0] : {}),
            residentNo: residentNoDisplay,
            profileImg: userData.userImage,
            pendingPolicy: pendingPolicy, // 다음달 변경 신청된 요금제 (없으면 null)
            bizNo: bizRows.length > 0 ? bizRows[0].bizNo : '',
            bizNm: bizRows.length > 0 ? bizRows[0].bizNm : '',
            ceoNm: bizRows.length > 0 ? bizRows[0].ceoNm : ''
        };

        // 서류 데이터 매핑 (가장 최근 것 기준)
        for (const doc of docRows) {
            if (doc.DOC_TYPE === 'LICENSE' && !driverData.licenseNo) {
                driverData.licenseType = doc.LICENSE_TYPE_CD;
                driverData.licenseNo = doc.DOC_NO_ENC ? decrypt(doc.DOC_NO_ENC) : '';
                driverData.licenseIssueDt = doc.issueDt;
                driverData.licenseImg = doc.filePath;
                driverData.licenseValidity = doc.INFO_STAT_CD === 'VALID' ? 'Y' : 'N';
                driverData.licenseApproveStat = doc.approveStat;
            } else if (doc.DOC_TYPE === 'QUALIFICATION' && !driverData.busLicenseNo) {
                driverData.busLicenseNo = doc.DOC_NO_ENC ? decrypt(doc.DOC_NO_ENC) : '';
                driverData.qualAcquisitionDt = doc.issueDt;
                driverData.busLicenseImg = doc.filePath;
                driverData.qualStatus = doc.INFO_STAT_CD;
                driverData.qualApproveStat = doc.approveStat;
            } else if (doc.DOC_TYPE === 'CAREER_CERT' && !driverData.careerCertImg) {
                driverData.careerCertImg = doc.filePath;
                driverData.careerCertApproveStat = doc.approveStat;
            } else if (doc.DOC_TYPE === 'BANKBOOK' && !driverData.bankBookImg) {
                driverData.bankBookImg = doc.filePath;
                driverData.bankBookApproveStat = doc.approveStat;
            }
        }

        // 마케팅 동의 이력 조회
        const [mktRows] = await pool.execute(`
            SELECT AGREE_YN, MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN 
            FROM TB_USER_TERMS_HIST 
            WHERE CUST_ID = ? AND TERMS_TYPE = 'MARKETING'
            ORDER BY TERMS_HIST_SEQ DESC LIMIT 1
        `, [custId]);

        const marketingInfo = mktRows.length > 0 ? mktRows[0] : {
            AGREE_YN: 'N',
            MKT_SMS_YN: 'N',
            MKT_PUSH_YN: 'N',
            MKT_EMAIL_YN: 'N',
            MKT_TEL_YN: 'N'
        };

        // 모든 약관 동의 이력 조회 (가장 최근 이력 추출)
        const [termsRows] = await pool.execute(`
            SELECT t.TERMS_TYPE, t.AGREE_YN, DATE_FORMAT(t.AGREE_DT, '%Y.%m.%d %H:%i:%s') as AGREE_DT
            FROM TB_USER_TERMS_HIST t
            INNER JOIN (
                SELECT TERMS_TYPE, MAX(TERMS_HIST_SEQ) as MAX_SEQ
                FROM TB_USER_TERMS_HIST
                WHERE CUST_ID = ?
                GROUP BY TERMS_TYPE
            ) m ON t.TERMS_TYPE = m.TERMS_TYPE AND t.TERMS_HIST_SEQ = m.MAX_SEQ
            WHERE t.CUST_ID = ?
        `, [custId, custId]);

        // 약관 동의 데이터를 Map 형태로 전환
        const termsMap = {};
        termsRows.forEach(row => {
            termsMap[row.TERMS_TYPE] = {
                agreeYn: row.AGREE_YN,
                agreeDt: row.AGREE_DT
            };
        });

        // 기사(DRIVER)용 약관 타입 매핑
        const driverTermsType = 'DRIVER_SERVICE';
        const driverTermsLabel = '파트너 입점 계약';

        const termsConsent = [
            {
                id: 'service',
                dbType: 'SERVICE',
                label: '서비스 이용약관 동의',
                required: true,
                agreeYn: termsMap['SERVICE'] ? termsMap['SERVICE'].agreeYn : 'N',
                agreeDt: termsMap['SERVICE'] ? termsMap['SERVICE'].agreeDt : null
            },
            {
                id: 'privacy',
                dbType: 'PRIVACY',
                label: '개인정보 수집 및 이용 동의',
                required: true,
                agreeYn: termsMap['PRIVACY'] ? termsMap['PRIVACY'].agreeYn : 'N',
                agreeDt: termsMap['PRIVACY'] ? termsMap['PRIVACY'].agreeDt : null
            },
            {
                id: 'traveler',
                dbType: driverTermsType,
                label: driverTermsLabel,
                required: true,
                agreeYn: termsMap[driverTermsType] ? termsMap[driverTermsType].agreeYn : 'N',
                agreeDt: termsMap[driverTermsType] ? termsMap[driverTermsType].agreeDt : null
            },
            {
                id: 'marketing',
                dbType: 'MARKETING',
                label: '마케팅 정보 수신 및 알림 동의',
                required: false,
                agreeYn: termsMap['MARKETING'] ? termsMap['MARKETING'].agreeYn : 'N',
                agreeDt: termsMap['MARKETING'] ? termsMap['MARKETING'].agreeDt : null
            }
        ];

        res.json({
            success: true,
            data: {
                user: {
                    name: userData.USER_NM,
                    phone: userData.HP_NO,
                    marketing: {
                        agree: marketingInfo.AGREE_YN === 'Y',
                        sms: marketingInfo.MKT_SMS_YN === 'Y',
                        push: marketingInfo.MKT_PUSH_YN === 'Y',
                        email: marketingInfo.MKT_EMAIL_YN === 'Y',
                        tel: marketingInfo.MKT_TEL_YN === 'Y'
                    },
                    termsConsent: termsConsent
                },
                driver: driverData
            }
        });
    } catch (err) {
        console.error('[App Profile GET] Error:', err);
        res.status(500).json({ error: '기사 프로필 조회 중 오류 발생' });
    }
});

// 주민등록번호 유효성 검증 함수
const validateRRN = (rrn) => {
    if (!rrn) return false;
    
    // 한글 주석: 마스킹된 주민등록번호는 바로 통과시킴
    if (/^\d{6}-?[0-9]\*{6}$/.test(rrn)) {
        return true;
    }
    
    const clean = rrn.replace(/[^0-9]/g, '');
    if (clean.length !== 13) return false;
    const digits = clean.split('').map(Number);
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += digits[i] * weights[i];
    const check = (11 - (sum % 11)) % 10;
    return check === digits[12];
};

/**
 * [App] 기사 정보 등록 및 업데이트
 * TB_USER, TB_DRIVER_DETAIL, TB_DRIVER_DOCS 3개 테이블 동시 처리
 */
router.post('/profile/update', authenticateToken, memoryUpload.fields([
    { name: 'profileImg', maxCount: 1 },
    { name: 'licenseImg', maxCount: 1 },
    { name: 'busLicenseImg', maxCount: 1 },
    { name: 'careerCertImg', maxCount: 1 },
    { name: 'bankBookImg', maxCount: 1 }
]), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const {
            name, phone, residentNo, zipcode, address, detailAddress,
            licenseType, licenseNo, licenseIssueDt, licenseValidity,
            busLicenseNo, qualAcquisitionDt, qualStatus,
            sex, addrType, selfIntro, firebaseToken, marketing,
            bankNm, acctNo, acctHold
        } = req.body;

        let verifyWarning = null;

        // 주민등록번호 유효성 검증
        if (!validateRRN(residentNo)) {
            throw new Error('유효하지 않은 주민등록번호입니다.');
        }

        const userId = req.user.userId;

        // 0. CUST_ID, 기존 프로필 파일 ID 및 기존 주민번호 조회
        const [uRows] = await connection.execute('SELECT CUST_ID, PROFILE_FILE_ID, HP_NO, RESIDENT_NO_ENC FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId, PROFILE_FILE_ID: existingProfileFileId, HP_NO: existingPhone, RESIDENT_NO_ENC: existingResidentNoEnc } = uRows[0];

        let finalResidentNoEnc = existingResidentNoEnc;

        // 한글 주석: 만약 전달받은 주민등록번호가 마스킹된 것이 아니라면(새로 수정했다면) 중복 체크 수행 및 암호화 대상 업데이트
        if (!/^\d{6}-?[0-9]\*{6}$/.test(residentNo)) {
            const cleanResidentNo = residentNo.replace(/[^0-9]/g, '');

            // 중복 체크 (암호화된 컬럼이므로 전체 기사를 조회하여 복호화 비교)
            // 본인(userId)은 제외하고 검색
            const [allDrivers] = await connection.execute(
                'SELECT USER_ID, RESIDENT_NO_ENC FROM TB_USER WHERE USER_TYPE = "DRIVER" AND RESIDENT_NO_ENC IS NOT NULL AND USER_ID != ?',
                [userId]
            );

            for (const driver of allDrivers) {
                try {
                    const decrypted = decrypt(driver.RESIDENT_NO_ENC);
                    if (decrypted && decrypted.replace(/[^0-9]/g, '') === cleanResidentNo) {
                        throw new Error(`이미 다른 계정에서 사용 중인 주민등록번호입니다. (ID: ${driver.USER_ID})`);
                    }
                } catch (err) {
                    console.error(`[Profile Update] RRN Decrypt Error for user ${driver.USER_ID}:`, err);
                }
            }

            finalResidentNoEnc = encrypt(residentNo);
        }

        // 한글 주석: 만약 전달받은 주민등록번호가 마스킹된 것이라면 기존 저장된 원본 주민번호 복호화해서 사용
        let verifyRrn = residentNo;
        if (/^\d{6}-?[0-9]\*{6}$/.test(residentNo)) {
            if (existingResidentNoEnc) {
                try {
                    verifyRrn = decrypt(existingResidentNoEnc);
                } catch (decErr) {
                    console.error('[Profile Update] RRN Decrypt failed for verify:', decErr);
                }
            }
        }

        // 한글 주석: 운수종사자 자격증 및 면허증 진위여부 검증 호출 (실패 시에도 저장은 허용)
        try {
            const extVerify = await runDriverVerificationsForProfileSetup({
                driverName: name,
                rrn: verifyRrn,
                licenseNo: licenseNo,
                licenseSerialNo: '',
                qualCertNo: busLicenseNo,
                licenseType: licenseType,
                licenseIssueDt: licenseIssueDt,
                licenseExpiryDt: null,
                existingRow: null
            });

            if (!extVerify.ok) {
                verifyWarning = extVerify.message || '운수종사자 자격증 진위 확인에 실패했습니다.';
                console.warn('[Driver Profile Update] TS Verify Failed but storage continues:', verifyWarning);
            }
        } catch (verifyErr) {
            console.error('[Driver Profile Update] TS Verify Exception:', verifyErr);
            verifyWarning = '자격증 진위 조회 API 통신 중 오류가 발생했습니다.';
        }

        // 한글 주석: 필수 필드 검증 (면허 발급일 및 자격 취득일)
        if (!licenseIssueDt || !licenseIssueDt.trim()) {
            throw new Error('면허 발급일을 입력해주세요.');
        }
        if (!qualAcquisitionDt || !qualAcquisitionDt.trim()) {
            throw new Error('자격 취득일을 입력해주세요.');
        }

        // 한글 주석: 날짜 유효성 검증 (과거여야 함)
        const today = new Date().toISOString().split('T')[0];
        if (licenseIssueDt && licenseIssueDt > today) {
            throw new Error('면허 발급일은 오늘 이전 날짜여야 합니다.');
        }
        if (qualAcquisitionDt && qualAcquisitionDt > today) {
            throw new Error('자격 취득일은 오늘 이전 날짜여야 합니다.');
        }

        // 휴대폰 번호가 변경된 경우 Firebase 토큰 검증
        if (phone && phone !== existingPhone) {
            if (!firebaseToken) {
                throw new Error('휴대폰 번호 변경을 위해서는 인증 토큰이 필요합니다.');
            }
            try {
                const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
                // 토큰의 전화번호와 요청된 전화번호가 일치하는지 확인 (선택 사항이지만 보안상 권장)
                // console.log('Firebase Phone:', decodedToken.phone_number);
            } catch (authError) {
                console.error('Firebase Auth Verification Error:', authError);
                throw new Error('유효하지 않은 인증 토큰입니다.');
            }
        }

        // [공통] 파일 업로드 및 TB_FILE_MASTER 처리
        const processFileUpload = async (fileKey, category, existingFileId = null) => {
            const file = req.files && req.files[fileKey] ? req.files[fileKey][0] : null;
            if (!file) return existingFileId;

            const uploadResult = await uploadToGCS(file, 'drivers', connection);
            const { fileId, url, ext, originalName } = uploadResult;

            if (existingFileId) {
                await connection.execute(
                    `UPDATE TB_FILE_MASTER SET GCS_PATH = ?, ORG_FILE_NM = ?, FILE_EXT = ?, FILE_SIZE = ?, MOD_ID = ?, MOD_DT = NOW() WHERE FILE_ID = ?`,
                    [url, originalName, ext, uploadResult.fileSize, custId, existingFileId]
                );
                return existingFileId;
            } else {
                await connection.execute(
                    `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [fileId, category, bucketName, url, originalName, ext, uploadResult.fileSize, custId, custId]
                );
                return fileId;
            }
        };

        // 1. 프로필 이미지 처리 및 TB_USER 업데이트 (PROFILE_FILE_ID만 업데이트)
        const profileFileId = await processFileUpload('profileImg', 'DRIVER_PHOTO', existingProfileFileId);

        await connection.execute(
            'UPDATE TB_USER SET USER_NM = ?, HP_NO = ?, RESIDENT_NO_ENC = ?, PROFILE_FILE_ID = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [name, phone, finalResidentNoEnc, profileFileId, custId, userId]
        );

        // 2. TB_DRIVER_DETAIL 업데이트 (주소, 성별, 자기소개, 생년월일 등)
        const birthYmd = residentNo.substring(0, 6);
        const [existsDetail] = await connection.execute('SELECT 1 FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?', [custId]);
        if (existsDetail.length > 0) {
            await connection.execute(
                'UPDATE TB_DRIVER_DETAIL SET BIRTH_YMD = ?, ZIPCODE = ?, ADDRESS = ?, DETAIL_ADDRESS = ?, SEX = ?, ADDR_TYPE = ?, SELF_INTRO = ?, BANK_NM = ?, ACCT_NO = ?, ACCT_HOLD = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
                [birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, bankNm || null, acctNo || null, acctHold || null, custId, custId]
            );
        } else {
            await connection.execute(
                'INSERT INTO TB_DRIVER_DETAIL (CUST_ID, BIRTH_YMD, ZIPCODE, ADDRESS, DETAIL_ADDRESS, SEX, ADDR_TYPE, SELF_INTRO, FEE_POLICY, BANK_NM, ACCT_NO, ACCT_HOLD, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [custId, birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, 'DRIVER', bankNm || null, acctNo || null, acctHold || null, custId, custId]
            );
        }

        // 3. TB_DRIVER_DOCS 처리 (면허증, 자격증)
        const upsertDoc = async (type, no, dt, fileKey, licType = null, status = 'WAIT') => {
            if (!no && (!req.files || !req.files[fileKey])) return;

            const [docRows] = await connection.execute(
                'SELECT DOC_TYPE_SEQ FROM TB_DRIVER_DOCS WHERE CUST_ID = ? AND DOC_TYPE = ? ORDER BY DOC_TYPE_SEQ DESC LIMIT 1',
                [custId, type]
            );

            const file = req.files && req.files[fileKey] ? req.files[fileKey][0] : null;
            let currentPath = null;
            let fileId = null;

            if (file) {
                const uploadResult = await uploadToGCS(file, 'drivers', connection);
                fileId = uploadResult.fileId;
                currentPath = uploadResult.url;

                // TB_FILE_MASTER 등록
                await connection.execute(
                    `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [fileId, `DRIVER_${type}`, bucketName, currentPath, file.originalname, path.extname(file.originalname).replace('.', ''), file.size, custId, custId]
                );
            } else if (docRows.length > 0) {
                // 파일 업로드 없이 정보만 업데이트하는 경우 기존 경로 유지 (실제 운영 시에는 이력 관리 필요)
            }

            if (docRows.length > 0) {
                // 기존 데이터 업데이트 (재제출 시 승인 상태를 WAIT으로 초기화)
                const seq = docRows[0].DOC_TYPE_SEQ;
                let updateSql = `UPDATE TB_DRIVER_DOCS SET DOC_NO_ENC = ?, ISSUE_DT = ?, LICENSE_TYPE_CD = ?, INFO_STAT_CD = ?, APPROVE_STAT = 'WAIT', MOD_ID = ?, MOD_DT = NOW()`;
                const params = [encrypt(no), dt, licType, status, custId];
                if (currentPath) {
                    updateSql += `, GCS_PATH = ?, ORG_FILE_NM = ?, ORG_FILE_EXT = ?, FILE_SIZE = ?`;
                    const ext = path.extname(file.originalname).replace('.', '');
                    params.push(currentPath, file.originalname, ext, file.size);
                }
                updateSql += ` WHERE CUST_ID = ? AND DOC_TYPE = ? AND DOC_TYPE_SEQ = ?`;
                params.push(custId, type, seq);
                await connection.execute(updateSql, params);
            } else {
                // 신규 등록 시 파일 필수 체크 (통장 사본은 예외)
                if (!file) {
                    if (type === 'BANKBOOK') return; // 통장 사본은 신규 등록 시 파일 없으면 진행 안 함 (선택)
                    const typeNm = type === 'LICENSE' ? '운전면허증' : type === 'QUALIFICATION' ? '버스운전자격증' : '운전경력증명서';
                    throw new Error(`${typeNm} 파일을 업로드해주세요.`);
                }
                const ext = path.extname(file.originalname).replace('.', '');
                await connection.execute(
                    `INSERT INTO TB_DRIVER_DOCS (CUST_ID, DOC_TYPE, DOC_TYPE_SEQ, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE, LICENSE_TYPE_CD, DOC_NO_ENC, ISSUE_DT, INFO_STAT_CD, REG_ID, MOD_ID) 
                     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [custId, type, bucketName, currentPath, file.originalname, ext, file.size, licType, encrypt(no), dt, status, custId, custId]
                );
            }
        };

        await upsertDoc('LICENSE', licenseNo, licenseIssueDt, 'licenseImg', licenseType, licenseValidity === 'Y' ? 'VALID' : 'EXPIRED');
        await upsertDoc('QUALIFICATION', busLicenseNo, qualAcquisitionDt, 'busLicenseImg', null, qualStatus || 'ACTIVE');
        await upsertDoc('CAREER_CERT', 'CAREER-' + custId, today, 'careerCertImg', null, 'VALID');
        await upsertDoc('BANKBOOK', 'BANKBOOK-' + custId, today, 'bankBookImg', null, 'VALID');

        // 마케팅 알림 동의 이력 저장 (TB_USER_TERMS_HIST)
        if (marketing) {
            let marketingData = null;
            try {
                marketingData = typeof marketing === 'string' ? JSON.parse(marketing) : marketing;
            } catch (parseError) {
                console.error('[Profile Update] Marketing parse error:', parseError);
            }

            if (marketingData && typeof marketingData === 'object') {
                const mktSms = marketingData.sms ? 'Y' : 'N';
                const mktPush = marketingData.push ? 'Y' : 'N';
                const mktEmail = marketingData.email ? 'Y' : 'N';
                const mktTel = marketingData.tel ? 'Y' : 'N';
                const agreeYn = (mktSms === 'Y' || mktPush === 'Y' || mktEmail === 'Y' || mktTel === 'Y') ? 'Y' : 'N';

                // 다음 시퀀스 번호 조회
                const [seqRows] = await connection.execute(`
                    SELECT IFNULL(MAX(TERMS_HIST_SEQ), 0) + 1 AS NEXT_SEQ 
                    FROM TB_USER_TERMS_HIST 
                    WHERE CUST_ID = ?
                `, [custId]);
                const nextSeq = seqRows[0].NEXT_SEQ;

                const histQuery = `
                    INSERT INTO TB_USER_TERMS_HIST (
                        CUST_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, 
                        MKT_SMS_YN, MKT_PUSH_YN, MKT_EMAIL_YN, MKT_TEL_YN,
                        AGREE_DT
                    ) VALUES (?, ?, 'MARKETING', 'v1.0', ?, ?, ?, ?, ?, NOW())
                `;

                await connection.execute(histQuery, [
                    custId,
                    nextSeq,
                    agreeYn,
                    mktSms,
                    mktPush,
                    mktEmail,
                    mktTel
                ]);
            }
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: '기사 정보 등록이 완료되었습니다.',
            warning: verifyWarning
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[App Profile Update] Error:', err);
        res.status(500).json({ error: '정보 저장 중 오류 발생: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App] 버스 상세 정보 조회
 */
router.get('/bus/detail', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [busRows] = await pool.execute(
            `SELECT * FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ? ORDER BY REG_DT DESC LIMIT 1`,
            [custId]
        );

        if (busRows.length === 0) return res.json({ success: true, data: null });

        const bus = busRows[0];
        const getFilePath = async (fileId) => {
            if (!fileId) return null;
            const [rows] = await pool.execute(`SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = ?`, [fileId]);
            return rows.length > 0 ? rows[0].GCS_PATH : null;
        };

        res.json({
            success: true,
            data: {
                busId: bus.BUS_ID,
                vehicleNo: bus.VEHICLE_NO,
                modelNm: bus.MODEL_NM,
                manufactureYear: bus.MANUFACTURE_YEAR,
                mileage: bus.MILEAGE,
                serviceClass: bus.SERVICE_CLASS,
                amenities: typeof bus.AMENITIES === 'string' ? JSON.parse(bus.AMENITIES) : (bus.AMENITIES || []),
                hasAdas: bus.HAS_ADAS,
                lastInspectDt: bus.LAST_INSPECT_DT ? bus.LAST_INSPECT_DT.toISOString().split('T')[0] : '',
                insuranceExpDt: bus.INSURANCE_EXP_DT ? bus.INSURANCE_EXP_DT.toISOString().split('T')[0] : '',
                bizRegFile: await getFilePath(bus.BIZ_REG_FILE_ID),
                transLicFile: await getFilePath(bus.TRANS_LIC_FILE_ID),
                insCertFile: await getFilePath(bus.INS_CERT_FILE_ID)
            }
        });
    } catch (err) {
        console.error('Fetch bus detail error:', err);
        res.status(500).json({ error: '버스 정보 조회 중 오류 발생' });
    }
});

/**
 * [App] 버스 정보 조회 (TB_BUS_DRIVER_VEHICLE)
 */
router.get('/bus/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [busRows] = await pool.execute(
            `SELECT 
                BUS_ID as busId, VEHICLE_NO as vehicleNo, MODEL_NM as modelNm, 
                MANUFACTURE_YEAR as manufactureYear, MILEAGE as mileage, 
                SERVICE_CLASS as serviceClass, AMENITIES as amenities, 
                HAS_ADAS as hasAdas, 
                DATE_FORMAT(LAST_INSPECT_DT, '%Y-%m-%d') as lastInspectDt, 
                DATE_FORMAT(INSURANCE_EXP_DT, '%Y-%m-%d') as insuranceExpDt,
                VEHICLE_PHOTOS_JSON as vehiclePhotos,
                BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID
             FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?`,
            [custId]
        );

        if (busRows.length === 0) {
            return res.json({ success: true, data: null });
        }

        const busData = busRows[0];

        // 서류 파일 URL 조회 (프록시 적용)
        const fileIds = [busData.BIZ_REG_FILE_ID, busData.TRANS_LIC_FILE_ID, busData.INS_CERT_FILE_ID].filter(Boolean);
        let fileMap = {};
        if (fileIds.length > 0) {
            const [fileRows] = await pool.execute(
                `SELECT FILE_ID, CONCAT('/api/common/display-image?path=', GCS_PATH) as url FROM TB_FILE_MASTER WHERE FILE_ID IN (${fileIds.map(() => '?').join(',')})`,
                fileIds
            );
            fileRows.forEach(f => fileMap[f.FILE_ID] = f.url);
        }

        // 차량 사진 URL 조회
        let photos = [];
        const photoIds = busData.vehiclePhotos || [];
        if (photoIds.length > 0) {
            const [photoRows] = await pool.execute(
                `SELECT CONCAT('/api/common/display-image?path=', GCS_PATH) as url FROM TB_FILE_MASTER WHERE FILE_ID IN (${photoIds.map(() => '?').join(',')})`,
                photoIds
            );
            photos = photoRows.map(p => p.url);
        }

        // 한글 주석: 사업자등록 정보 조회 추가 (CUST_ID 기준)
        const [bizRows] = await pool.execute(
            `SELECT BIZ_NO as bizNo, BIZ_NM as bizNm, CEO_NM as ceoNm, BIZ_ADDR as bizAddr, BIZ_TYPE as bizType, BIZ_ITEM as bizItem, EMAIL as email 
             FROM TB_PARTNER_BIZ_INFO 
             WHERE TARGET_TYPE = 'DRIVER' AND TARGET_ID = ?`,
            [custId]
        );
        const bizData = bizRows.length > 0 ? bizRows[0] : {
            bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '', email: ''
        };
 
        res.json({
            success: true,
            data: {
                ...busData,
                bizRegImg: fileMap[busData.BIZ_REG_FILE_ID] || null,
                transLicImg: fileMap[busData.TRANS_LIC_FILE_ID] || null,
                insCertImg: fileMap[busData.INS_CERT_FILE_ID] || null,
                vehiclePhotos: photos,
                ...bizData // 사업자 정보 병합
            }
        });
    } catch (err) {
        console.error('Fetch bus profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * [App] 버스 등록 및 수정 (TB_BUS_DRIVER_VEHICLE)
 */
router.post('/bus/register', authenticateToken, memoryUpload.fields([
    { name: 'bizRegFile', maxCount: 1 },
    { name: 'transLicFile', maxCount: 1 },
    { name: 'insCertFile', maxCount: 1 },
    { name: 'vehiclePhotos', maxCount: 8 }
]), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { 
            vehicleNo, modelNm, manufactureYear, mileage, serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt,
            bizNo, bizNm, ceoNm, bizAddr, bizType, bizItem, email
        } = req.body;
        const userId = req.user.userId;
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows[0].CUST_ID;

        const [existing] = await connection.execute('SELECT BUS_ID, BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID, VEHICLE_PHOTOS_JSON FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ?', [custId]);

        let busId = existing.length > 0 ? existing[0].BUS_ID : await getNextId('TB_BUS_DRIVER_VEHICLE', 'BUS_ID', 10, connection);

        const uploadFile = async (fileKey, category, existingFileId = null) => {
            const file = req.files && req.files[fileKey] ? req.files[fileKey][0] : null;
            if (!file) return existingFileId;
            const up = await uploadToGCS(file, 'buses', connection);
            await connection.execute(
                `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [up.fileId, category, bucketName, up.url, up.originalName, up.ext, up.fileSize, custId, custId]
            );
            return up.fileId;
        };

        const bizRegId = await uploadFile('bizRegFile', 'BUS_BIZ', existing.length > 0 ? existing[0].BIZ_REG_FILE_ID : null);
        const transLicId = await uploadFile('transLicFile', 'BUS_TRANS', existing.length > 0 ? existing[0].TRANS_LIC_FILE_ID : null);
        const insCertId = await uploadFile('insCertFile', 'BUS_INS', existing.length > 0 ? existing[0].INS_CERT_FILE_ID : null);

        if (!bizRegId) throw new Error('사업자 등록증 파일을 업로드해주세요.');
        if (!transLicId) throw new Error('운송 허가증 파일을 업로드해주세요.');
        if (!insCertId) throw new Error('보험 증명서 파일을 업로드해주세요.');

        // 차량 사진 처리 (최대 8장)
        let finalPhotoIds = existing.length > 0 ? (existing[0].VEHICLE_PHOTOS_JSON || []) : [];
        if (req.files && req.files.vehiclePhotos) {
            const newPhotos = [];
            for (const file of req.files.vehiclePhotos) {
                const up = await uploadToGCS(file, 'buses', connection);
                await connection.execute(
                    `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [up.fileId, 'BUS_PHOTO', bucketName, up.url, up.originalName, up.ext, up.fileSize, custId, custId]
                );
                newPhotos.push(up.fileId);
            }
            finalPhotoIds = [...finalPhotoIds, ...newPhotos].slice(-8); // 최신 8장 유지
        }

        const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);

        if (existing.length > 0) {
            await connection.execute(
                `UPDATE TB_BUS_DRIVER_VEHICLE SET VEHICLE_NO=?, MODEL_NM=?, MANUFACTURE_YEAR=?, MILEAGE=?, SERVICE_CLASS=?, AMENITIES=?, HAS_ADAS=?, LAST_INSPECT_DT=?, INSURANCE_EXP_DT=?, VEHICLE_PHOTOS_JSON=?, BIZ_REG_FILE_ID=?, TRANS_LIC_FILE_ID=?, INS_CERT_FILE_ID=?, MOD_ID=?, MOD_DT=NOW() WHERE BUS_ID=?`,
                [vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, amenitiesJson, hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, JSON.stringify(finalPhotoIds), bizRegId, transLicId, insCertId, custId, busId]
            );
        } else {
            await connection.execute(
                `INSERT INTO TB_BUS_DRIVER_VEHICLE (BUS_ID, CUST_ID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, AMENITIES, HAS_ADAS, LAST_INSPECT_DT, INSURANCE_EXP_DT, VEHICLE_PHOTOS_JSON, BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [busId, custId, vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, amenitiesJson, hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, JSON.stringify(finalPhotoIds), bizRegId, transLicId, insCertId, custId, custId]
            );
        }

        // 한글 주석: 사업자등록 정보 (TB_PARTNER_BIZ_INFO) 저장 및 갱신 (CUST_ID 기준)
        if (bizNo && bizNm && ceoNm && bizAddr) {
            await connection.execute(
                `INSERT INTO TB_PARTNER_BIZ_INFO 
                    (TARGET_TYPE, TARGET_ID, BIZ_NO, BIZ_NM, CEO_NM, BIZ_ADDR, BIZ_TYPE, BIZ_ITEM, EMAIL, REG_ID, MOD_ID)
                 VALUES ('DRIVER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    BIZ_NO = VALUES(BIZ_NO),
                    BIZ_NM = VALUES(BIZ_NM),
                    CEO_NM = VALUES(CEO_NM),
                    BIZ_ADDR = VALUES(BIZ_ADDR),
                    BIZ_TYPE = VALUES(BIZ_TYPE),
                    BIZ_ITEM = VALUES(BIZ_ITEM),
                    EMAIL = VALUES(EMAIL),
                    MOD_ID = VALUES(MOD_ID),
                    MOD_DT = NOW()`,
                [custId, bizNo, bizNm, ceoNm, bizAddr, bizType || null, bizItem || null, email || null, custId, custId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: '버스 정보가 저장되었습니다.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Bus registration error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App] 경매 입찰 제출 (입찰하기)
 * 1. TB_AUCTION_REQ_BUS 상태 확인 (AUCTION인 경우만 가능)
 * 2. TB_AUCTION_REQ_BUS 상태를 BIDDING으로 변경
 * 3. 모든 차량의 상태가 BIDDING이면 TB_AUCTION_REQ 상태도 BIDDING으로 변경
 * 4. TB_BUS_RESERVATION 테이블에 입찰 정보 등록
 */
router.post('/auctions/:id/bid', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const reqId = req.params.id;
        const userId = req.user.userId;

        // 0. 이용 제한 상태 확인
        const [restrictionRows] = await connection.execute(`
            SELECT RESTRICT_STAT, RESTRICT_END_DT 
            FROM TB_USER_CANCEL_MANAGE 
            WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?) AND USER_TYPE = 'DRIVER'
        `, [userId]);

        if (restrictionRows.length > 0) {
            const resData = restrictionRows[0];
            const now = new Date();
            const endDt = resData.RESTRICT_END_DT ? new Date(resData.RESTRICT_END_DT) : null;

            if (resData.RESTRICT_STAT === 'P') {
                throw new Error('운영정책에 의해 서비스 이용이 무기한 제한되었습니다.');
            } else if (resData.RESTRICT_STAT === 'Y' && endDt && endDt > now) {
                const dateStr = endDt.toISOString().split('T')[0];
                throw new Error(`취소 패널티로 인해 ${dateStr}까지 신규 청약이 제한됩니다.`);
            }
        }

        // 1. 기사 정보 및 차량 정보 조회
        const [uRows] = await connection.execute('SELECT CUST_ID, USER_NM FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const custId = uRows[0].CUST_ID;
        const driverName = uRows[0].USER_NM || '기사';

        // 1-1. 기사의 멤버십 잔여 횟수 및 FEE_POLICY 정보 조회 (한글 주석)
        const [momRows] = await connection.execute(
            "SELECT REMAINING_CNT, FEE_POLICY FROM TB_MOM_MEMBER WHERE CUST_ID = ? AND YYYYMM = DATE_FORMAT(NOW(), '%Y%m')",
            [custId]
        );

        if (momRows.length > 0) {
            const remainingCnt = parseInt(momRows[0].REMAINING_CNT, 10);
            if (remainingCnt <= 0) {
                throw new Error('잔여 청약 횟수가 부족하여 청약 승인을 진행할 수 없습니다. 멤버십을 충전해주세요.');
            }
        }

        let feePolicy = null;
        if (momRows.length > 0) {
            // 기사의 멤버십 잔여 횟수가 남아있는 경우 해당 멤버십 등급 정책 사용
            feePolicy = momRows[0].FEE_POLICY;
        } else {
            // 멤버십이 없으면 기사의 상세 테이블에서 기본 수수료 정책 조회
            const [driverRows] = await connection.execute(
                "SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?",
                [custId]
            );
            if (driverRows.length > 0) {
                feePolicy = driverRows[0].FEE_POLICY;
            }
        }

        // 1-2. 경매 마스터 정보 조회 (푸시 알림 및 일정 중복 체크용)
        const [reqRows] = await connection.execute(
            'SELECT TRAVELER_ID, TRIP_TITLE, START_DT, END_DT FROM TB_AUCTION_REQ WHERE REQ_ID = ?',
            [reqId]
        );
        if (reqRows.length === 0) throw new Error('요청된 경매 정보를 찾을 수 없습니다.');
        const travelerId = reqRows[0].TRAVELER_ID;
        const tripTitle = reqRows[0].TRIP_TITLE || '요청하신 여행';
        const newStartDt = reqRows[0].START_DT;
        const newEndDt = reqRows[0].END_DT;

        // 해당 기사의 동일 일정 중복 예약 검증 (최신 DATA_STAT 활성 상태 대상: CUSTOMER_PAY_WAIT, DRIVER_PAY_WAIT, FINAL_APPROVAL_WAIT, CONFIRM, PROPOSED, ACCEPTED)
        const [duplicateRows] = await connection.execute(
            `SELECT 1 
             FROM TB_BUS_RESERVATION b
             JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
             WHERE b.DRIVER_ID = ? 
               AND b.DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'DRIVER_PAY_WAIT', 'FINAL_APPROVAL_WAIT', 'CONFIRM', 'PROPOSED', 'ACCEPTED')
               AND r.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'DRIVER_CANCEL', 'BUS_CANCEL', 'BUS_CHANGE', 'CANCEL_ADMIN', 'CANCEL_CUSTOMER', 'CANCELED')
               AND ((r.START_DT < ? AND r.END_DT > ?) OR (DATE(r.START_DT) = DATE(?) OR DATE(r.END_DT) = DATE(?)))
             LIMIT 1`,
            [custId, newEndDt, newStartDt, newStartDt, newEndDt]
        );

        if (duplicateRows.length > 0) {
            throw new Error('해당 일정에 이미 진행 중이거나 확정된 예약이 존재하여 청약할 수 없습니다.');
        }

        const [busRows] = await connection.execute(
            'SELECT BUS_ID, SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = ? LIMIT 1',
            [custId]
        );
        if (busRows.length === 0) throw new Error('등록된 버스 정보가 없습니다. 마이페이지에서 버스를 등록해주세요.');
        const { BUS_ID: busId, SERVICE_CLASS: serviceClass } = busRows[0];

        // 2. 해당 경매에서 기사의 차종과 일치하는 'AUCTION' 상태의 슬롯 조회 (잠금 처리)
        console.log(`[BID_PROCESS] Start finding slot for reqId: ${reqId}, custId: ${custId}, serviceClass: ${serviceClass}`);
        const [reqBusRows] = await connection.execute(
            `SELECT REQ_BUS_SEQ, RES_BUS_AMT, REG_ID 
             FROM TB_AUCTION_REQ_BUS 
             WHERE REQ_ID = ? AND BUS_TYPE_CD = ? AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE', 'DRIVER_CANCEL') 
             LIMIT 1 FOR UPDATE`,
            [reqId, serviceClass]
        );

        if (reqBusRows.length === 0) {
            console.log(`[BID_PROCESS] No available slot for reqId: ${reqId}, serviceClass: ${serviceClass}`);
            throw new Error('해당 차종으로 청약 가능한 버스 요청 정보가 없습니다.');
        }

        const { REQ_BUS_SEQ: reqBusSeq, RES_BUS_AMT: busAmt } = reqBusRows[0];
        console.log(`[BID_PROCESS] Selected slot: REQ_BUS_SEQ=${reqBusSeq}, busAmt=${busAmt}`);

        if (!reqBusSeq || reqBusSeq === 0) {
            console.error(`[BID_PROCESS] INVALID REQ_BUS_SEQ: ${reqBusSeq} for REQ_ID: ${reqId}`);
            throw new Error('청약 데이터 오류가 발생했습니다. (SEQ=0)');
        }

        // 3. TB_AUCTION_REQ_BUS 상태 업데이트 (CUSTOMER_PAY_WAIT) - 원자적 상태 체크 추가
        const [updateResult] = await connection.execute(
            `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'CUSTOMER_PAY_WAIT', MOD_ID = ?, MOD_DT = NOW() 
             WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE', 'DRIVER_CANCEL')`,
            [custId, reqId, reqBusSeq]
        );

        if (updateResult.affectedRows === 0) {
            console.log(`[BID_PROCESS] Slot already taken by another driver: REQ_BUS_SEQ=${reqBusSeq}`);
            throw new Error('다른 기사가 이미 해당 슬롯에 청약하였습니다. 다시 시도해주세요.');
        }

        // 4. TB_BUS_RESERVATION 등록
        const resId = await getNextId('TB_BUS_RESERVATION', 'RES_ID', 10, connection);
        console.log(`[BID_PROCESS] Generated RES_ID: ${resId} for reqBusSeq: ${reqBusSeq}`);

        // 수수료 계산 (FEE_POLICY에 따라 DRIVER = 6.6%, 그 외 = 2.2%)
        const feeRate = feePolicy === 'DRIVER' ? 0.066 : 0.022;
        const feeTotal = Math.floor(busAmt * feeRate);
        const feeRefund = Math.floor(feeTotal * (5.5 / 6.6));
        const feeAttribution = feeTotal - feeRefund;

        await connection.execute(
            `INSERT INTO TB_BUS_RESERVATION (
                RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, BUS_ID, 
                DRIVER_BIDDING_PRICE, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                DATA_STAT, REG_ID, MOD_ID, FEE_POLICY
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOMER_PAY_WAIT', ?, ?, ?)`,
            [resId, reqId, reqBusSeq, travelerId, custId, busId, busAmt, feeTotal, feeRefund, feeAttribution, custId, custId, feePolicy]
        );
        console.log(`[BID_PROCESS] Reservation inserted successfully for resId: ${resId}`);

        // 5. 전체 차량 청약 승인 완료 여부 확인 및 마스터 상태 업데이트
        const [cntAggRows] = await connection.execute(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'FINAL_APPROVAL_WAIT', 'CONFIRM', 'DONE') THEN 1 ELSE 0 END) AS approvedCnt
               FROM TB_AUCTION_REQ_BUS
              WHERE REQ_ID = ?`,
            [reqId]
        );
        const cntAgg = cntAggRows[0];
        if (Number(cntAgg.total) > 0 && Number(cntAgg.approvedCnt) === Number(cntAgg.total)) {
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CUSTOMER_PAY_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
                [custId, reqId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: '청약이 성공적으로 제출되었습니다.' });

        // 트랜잭션 성공 후 고객에게 청약 승인 푸시 알림 발송 (비동기 비차단)
        if (travelerId) {
            sendNotification(pool, {
                custId: travelerId,
                title: '[청약 승인] 요청하신 여행의 청약이 승인되었습니다.',
                body: `여정: ${tripTitle}\n${driverName} 기사님이 청약을 승인했습니다. 승인대기 정보를 확인해주세요.`,
                link: `/approval-list?reqId=${reqId}`,
                type: 'SYSTEM'
            }).catch(pushErr => {
                console.error('[Notification] Failed to send push message to traveler:', pushErr.message);
            });
        }

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Bid submission error:', err);
        res.status(400).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * 💳 [App] 기사 이용대금 결제 완료 처리 API (한글 주석)
 * 고객 1차 선택/결제 후, 기사가 본인 이용대금(수수료)을 결제하여 배차를 확정하는 API
 */
router.post('/pay', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const userId = req.user.userId;
        const { resId, reqId, payId } = req.body;

        if (!resId && !reqId) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: '예약 ID 또는 요청 ID가 필요합니다.' });
        }

        // 1. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        // 2. 예약 건의 운송 요금(DRIVER_BIDDING_PRICE) 조회
        let biddingPrice = 0;
        if (resId) {
            const [priceRows] = await connection.execute(
                'SELECT DRIVER_BIDDING_PRICE FROM TB_BUS_RESERVATION WHERE RES_ID = ?',
                [resId]
            );
            biddingPrice = priceRows.length > 0 ? Number(priceRows[0].DRIVER_BIDDING_PRICE) : 0;
        } else if (reqId) {
            const [priceRows] = await connection.execute(
                'SELECT DRIVER_BIDDING_PRICE FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND (DRIVER_ID = ? OR DRIVER_ID = ?)',
                [reqId, custId, userId]
            );
            biddingPrice = priceRows.length > 0 ? Number(priceRows[0].DRIVER_BIDDING_PRICE) : 0;
        }

        // 동적 데이터 이용료 계산
        const dynamic = await calculateDriverDynamicFee(connection, custId, biddingPrice);
        console.log(`[Driver Pay] CustID: ${custId}, resId: ${resId}, reqId: ${reqId}, payAmt (Dynamic): ${dynamic.feeTotalAmt}, feeRate: ${dynamic.feeRate}`);

        // 3. TB_BUS_RESERVATION 기사 결제 완료 업데이트 및 상태를 'FINAL_APPROVAL_WAIT' (고객 최종 승인대기)로 변경
        let updateSql = `
            UPDATE TB_BUS_RESERVATION 
            SET DRIVER_PAY_STAT = 'Y',
                DRIVER_PAY_AMT = ?,
                DRIVER_PAY_DT = NOW(),
                DRIVER_PAY_ID = ?,
                DRIVER_FEE_RATE = ?,
                DATA_STAT = 'FINAL_APPROVAL_WAIT',
                MOD_ID = ?,
                MOD_DT = NOW()
            WHERE (DRIVER_ID = ? OR DRIVER_ID = ?)
        `;
        let params = [dynamic.feeTotalAmt, payId || `PAY-DRIVER-${Date.now()}`, dynamic.feeRate, custId, custId, userId];

        if (resId) {
            updateSql += ` AND RES_ID = ?`;
            params.push(resId);
        } else if (reqId) {
            updateSql += ` AND REQ_ID = ?`;
            params.push(reqId);
        }

        const [resResult] = await connection.execute(updateSql, params);

        if (resResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: '결제 대상 청약 건을 찾을 수 없습니다.' });
        }

        // 4. TB_AUCTION_REQ_BUS 및 TB_AUCTION_REQ 상태 변경 (모든 차량 승인 완료 시 마스터 상태 갱신)
        let targetReqId = reqId;
        if (resId) {
            const [bRows] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [resId]);
            if (bRows.length > 0) {
                const { REQ_ID: rId, REQ_BUS_SEQ: uSeq } = bRows[0];
                targetReqId = rId;
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() 
                     WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                    [custId, rId, uSeq]
                );
            }
        } else if (reqId) {
            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT = 'DRIVER_PAY_WAIT'`,
                [custId, reqId]
            );
        }

        if (targetReqId) {
            const [cntAggRows] = await connection.execute(
                `SELECT COUNT(*) AS total,
                        SUM(CASE WHEN DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'FINAL_APPROVAL_WAIT', 'CONFIRM', 'DONE') THEN 1 ELSE 0 END) AS approvedCnt
                   FROM TB_AUCTION_REQ_BUS
                  WHERE REQ_ID = ?`,
                [targetReqId]
            );
            const cntAgg = cntAggRows[0];
            if (Number(cntAgg.total) > 0 && Number(cntAgg.approvedCnt) === Number(cntAgg.total)) {
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CUSTOMER_PAY_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
                    [custId, targetReqId]
                );
            }
        }

        // 5. TB_MOM_MEMBER 사용량(USE_CNT) 증가 처리
        const now = new Date();
        const yyyyMM = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
        let basicCnt = 0;
        if (dynamic.feePolicy === 'DRIVER_GENERAL') {
            basicCnt = 10;
        } else if (dynamic.feePolicy === 'DRIVER_MIDDLE') {
            basicCnt = 20;
        } else if (dynamic.feePolicy === 'DRIVER_HIGH') {
            basicCnt = 30;
        }

        if (['DRIVER_GENERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(dynamic.feePolicy)) {
            await connection.execute(
                `INSERT INTO TB_MOM_MEMBER (
                    CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                 ) VALUES (?, ?, ?, ?, 1, ?, NOW(), ?, NOW(), ?)
                 ON DUPLICATE KEY UPDATE
                    USE_CNT = USE_CNT + 1,
                    REMAINING_CNT = IF(BASIC_CNT > USE_CNT, BASIC_CNT - USE_CNT, 0),
                    MOD_DT = NOW(),
                    MOD_ID = ?`,
                [custId, yyyyMM, dynamic.feePolicy, basicCnt, basicCnt - 1, custId, custId, custId, custId]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: '기사 이용대금 결제가 성공적으로 완료되었습니다. 고객 최종 승인대기 상태로 변경되었습니다.'
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Driver Pay Error]', err);
        res.status(500).json({ success: false, error: '기사 이용대금 결제 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App] 기사 운행 예정 리스트 조회 (CONFIRM 상태)
 * 기사가 입찰한 건들 중 여행자가 확정한(CONFIRM 상태) 건들을 조회
 */
router.get('/upcoming-trips', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDt,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDt,
                b.DRIVER_BIDDING_PRICE as price,
                COALESCE(db.SERVICE_CLASS, '차종 미정') as busTypeNm,
                db.MODEL_NM as model,
                db.VEHICLE_PHOTOS_JSON as vehiclePhotos,
                b.DATA_STAT as status
            FROM TB_BUS_RESERVATION b
            LEFT JOIN TB_AUCTION_REQ r 
                ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db 
                ON b.BUS_ID = db.BUS_ID
            WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'CONFIRM'
            ORDER BY r.START_DT ASC
        `, [custId]);

        const processedRows = rows.map(row => {
            let image = null;
            if (row.vehiclePhotos) {
                try {
                    const photos = JSON.parse(row.vehiclePhotos);
                    if (photos && photos.length > 0) {
                        image = photos[0].url || photos[0];
                    }
                } catch (e) {
                    console.error('Photo parse error:', e);
                }
            }

            const endAddr = row.endAddrVia || row.endAddrMaster;

            const getShort = (addr) => {
                if (!addr) return '';
                return addr.split(' ').slice(0, 2).join(' ');
            };

            // 경로 조립: 출발(출발) -> 회차(회차) -> 도착(도착지)
            const shortParts = [`${getShort(row.startAddr)}(출발)`];
            if (row.roundTrip) shortParts.push(`${getShort(row.roundTrip)}(회차)`);
            shortParts.push(`${getShort(endAddr)}(도착지)`);

            return {
                ...row,
                endAddr: endAddr,
                route: shortParts.join(' → '),
                image: image,
                period: `${row.startDt} ~ ${row.endDt}`,
                status: '확정됨'
            };
        });

        res.json({ success: true, data: processedRows });
    } catch (err) {
        console.error('Fetch upcoming trips error:', err);
        res.status(500).json({ error: '운행 예정 목록 조회 중 오류가 발생했습니다.' });
    }
});


/**
 * [App] 기사 응찰/승인/결제 대기 목록 조회 (한글 주석)
 * GET /app/driver/bids/waiting?tab=customer_wait | driver_pay | final_approval_wait
 */
router.get('/bids/waiting', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tab } = req.query; // 'customer_wait' | 'driver_pay' | 'final_approval_wait'

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        let statusFilter = "b.DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'DRIVER_PAY_WAIT', 'FINAL_APPROVAL_WAIT')";
        if (tab === 'customer_wait') {
            statusFilter = "b.DATA_STAT = 'CUSTOMER_PAY_WAIT'";
        } else if (tab === 'driver_pay') {
            statusFilter = "b.DATA_STAT = 'DRIVER_PAY_WAIT'";
        } else if (tab === 'final_approval_wait') {
            statusFilter = "b.DATA_STAT = 'FINAL_APPROVAL_WAIT'";
        }

        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID as reqId,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_NODE' LIMIT 1) as startAddrVia,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDt,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDt,
                b.DRIVER_BIDDING_PRICE as price,
                b.RES_FEE_TOTAL_AMT as feeTotalAmt,
                b.DRIVER_FEE_RATE as driverFeeRate,
                b.DRIVER_PAY_STAT as driverPayStat,
                COALESCE(db.SERVICE_CLASS, '차종 미정') as busTypeNm,
                db.MODEL_NM as busModel,
                b.DATA_STAT as status
            FROM TB_BUS_RESERVATION b
            LEFT JOIN TB_AUCTION_REQ r 
                ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db 
                ON b.BUS_ID = db.BUS_ID
            WHERE (b.DRIVER_ID = ? OR b.DRIVER_ID = ?) AND ${statusFilter}
            ORDER BY b.REG_DT DESC
        `, [custId, userId]);

        const processedRows = [];
        for (const row of rows) {
            const endAddr = row.endAddrVia || row.endAddrMaster;
            const fullPath = [
                { label: '출발지', addr: row.startAddrVia || row.startAddr },
                ...(row.startVia ? row.startVia.split(',').map(v => ({ label: '출발 경유지', addr: v })) : []),
                ...(row.roundTrip ? [{ label: '목적지', addr: row.roundTrip }] : []),
                ...(row.endVia ? row.endVia.split(',').map(v => ({ label: '도착 경유지', addr: v })) : []),
                { label: '최종 도착지', addr: endAddr }
            ];

            // 실시간 동적 요금 계산 적용
            const dynamic = await calculateDriverDynamicFee(pool, custId, row.price);

            processedRows.push({
                ...row,
                endAddr,
                fullPath,
                feeTotalAmt: dynamic.feeTotalAmt,
                driverFeeRate: dynamic.feeRate * 100 // 퍼센트 표시 (예: 2.2 또는 3.3 또는 6.6)
            });
        }

        res.json({ success: true, data: processedRows });
    } catch (err) {
        console.error('Fetch waiting bids error:', err);
        res.status(500).json({ error: '목록 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 운행 상세 조회 (운행완료 건 포함)
 */
router.get('/mission-detail/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 2. 상세 정보 및 리뷰 정보 조인 조회
        // TB_CODE_MASTER를 조인하여 차종 명칭(busTypeNm)을 가져옵니다.
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddrMaster,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_NODE' LIMIT 1) as startAddrVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDate,
                b.DRIVER_BIDDING_PRICE as price,
                b.DATA_STAT,
                rb.RES_BUS_AMT as targetPrice,
                COALESCE(cm.CD_NM_KO, rb.BUS_TYPE_CD, '차종 미정') as busTypeNm,
                db.MODEL_NM as model,
                db.VEHICLE_NO as busNumber,
                db.VEHICLE_PHOTOS_JSON as vehiclePhotos,
                u.USER_NM as customerName,
                u.HP_NO as customerPhone,
                u.EMAIL as customerEmail,
                CASE 
                    WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH)
                    ELSE u.USER_IMAGE 
                END as customerImage,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                rev.STAR_RATING as reviewRating,
                rev.COMMENT_TEXT as reviewComment,
                rev.REPLY_TEXT as replyText,
                DATE_FORMAT(rev.REG_DT, '%Y.%m.%d') as reviewDate
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_AUCTION_REQ_BUS rb ON b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ
            LEFT JOIN TB_COMMON_CODE cm ON cm.GRP_CD = 'BUS_TYPE' AND cm.DTL_CD = rb.BUS_TYPE_CD
            LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            LEFT JOIN TB_TRIP_REVIEW rev ON b.RES_ID = rev.RES_ID
            WHERE (b.RES_ID = ? OR b.REQ_ID = ?) AND b.DRIVER_ID = ?
            ORDER BY b.REG_DT DESC
            LIMIT 1
        `, [id, id, custId]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: '운행 정보를 찾을 수 없습니다.' });

        const row = rows[0];
        const startAddr = row.startAddrVia || row.startAddrMaster || '';
        const endAddr = row.endAddrVia || row.endAddrMaster || '';

        let image = null;
        if (row.vehiclePhotos) {
            try {
                const photos = JSON.parse(row.vehiclePhotos);
                if (photos && photos.length > 0) image = photos[0].url || photos[0];
            } catch (e) { }
        }

        // 정산 상세 내역 (DB에 별도 컬럼이 없으므로 총액 기준 가상 분배 - 디자인 준수 목적)
        const totalPrice = row.price || 0;
        const breakdown = {
            base: Math.floor(totalPrice * 0.85),
            lodging: Math.floor(totalPrice * 0.08),
            tolls: Math.floor(totalPrice * 0.04),
            fuel: totalPrice - Math.floor(totalPrice * 0.85) - Math.floor(totalPrice * 0.08) - Math.floor(totalPrice * 0.04)
        };

        const data = {
            ...row,
            startAddr,
            endAddr,
            image,
            breakdown,
            waypoints: [
                { type: 'START', addr: startAddr, time: row.startDate || '출발' },
                ...(row.startVia ? row.startVia.split(',').map(v => ({ type: 'START_WAY', addr: v, time: '경유' })) : []),
                ...(row.roundTrip ? [{ type: 'ROUND', addr: row.roundTrip, time: '목적지' }] : []),
                ...(row.endVia ? row.endVia.split(',').map(v => ({ type: 'END_WAY', addr: v, time: '경유' })) : []),
                { type: 'END', addr: endAddr, time: row.endDate || '도착지' }
            ]
        };

        res.json({ success: true, data });
    } catch (err) {
        console.error('Fetch mission detail error:', err);
        res.status(500).json({ error: '상세 정보 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 운행 완료 처리
 */
router.post('/complete-mission/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 상태 업데이트 (DATA_STAT = 'DONE')
        const [result] = await pool.execute(
            `UPDATE TB_BUS_RESERVATION 
             SET DATA_STAT = 'DONE', MOD_DT = NOW(), MOD_ID = ?, DONE_DT = NOW()
             WHERE RES_ID = ? AND DRIVER_ID = ?`,
            [custId, id, custId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '운행 정보를 찾을 수 없거나 권한이 없습니다.' });
        }

        // 💰 위약금/정산 관리 테이블에 완료 정보 적재 (기사 회원 등급 조회 포함, 한글 주석)
        try {
            const [driverDetailRows] = await pool.execute(
                'SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
                [custId]
            );
            const feePolicy = driverDetailRows.length > 0 ? driverDetailRows[0].FEE_POLICY : null;

            await pool.execute(
                `INSERT INTO TB_BUS_PENALTY_DEPOSIT (YYYYMMDD, RES_ID, DATA_STAT, PENALTY_DEPOSIT_YN, FEE_POLICY, REG_ID, MOD_ID)
                 VALUES (DATE_FORMAT(NOW(), '%Y%m%d'), ?, 'DONE', 'N', ?, ?, ?)
                 ON DUPLICATE KEY UPDATE DATA_STAT = 'DONE', FEE_POLICY = ?, MOD_DT = NOW(), MOD_ID = ?`,
                [id, feePolicy, custId, custId, feePolicy, custId]
            );
        } catch (depositErr) {
            console.error('[Complete Mission] Penalty Deposit insertion failed:', depositErr);
            // 메인 비즈니스 성공을 방해하지 않도록 예외 무시
        }

        res.json({ success: true, message: '운행이 완료 처리되었습니다.' });
    } catch (err) {
        console.error('Complete mission error:', err);
        res.status(500).json({ error: '운행 완료 처리 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 운행 완료 목록 조회
 */
router.get('/completed-missions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // DATA_STAT = 'DONE' 인 예약 내역 조회
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDate,
                b.DRIVER_BIDDING_PRICE as price,
                db.MODEL_NM as model
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'DONE'
            ORDER BY r.END_DT DESC
        `, [custId]);

        const data = rows.map(row => ({
            ...row,
            endAddr: row.endAddrVia || row.endAddrMaster
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('Fetch completed missions error:', err);
        res.status(500).json({ error: '운행 완료 목록을 가져오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 보관함 목록 조회
 * TB_BUS_RESERVATION 테이블의 DATA_STAT가 CONFIRM, DONE 이고
 * TB_AUCTION_REQ_BUS 테이블의 DATA_STAT가 CONFIRM, DONE 인 목록을 조회
 */
router.get('/archive-list', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // DB 쿼리: 보관함 리스트 조회 (CONFIRM, DONE 상태 기사별 필터링)
        const [rows] = await pool.execute(`
            SELECT 
                br.RES_ID as id,
                r.TRIP_TITLE as title,
                DATE_FORMAT(r.START_DT, '%Y-%m-%d') as startDate,
                DATE_FORMAT(r.END_DT, '%Y-%m-%d') as endDate,
                u.USER_NM as driverName,
                br.DATA_STAT as reservationStat,
                ab.DATA_STAT as auctionBusStat
            FROM TB_BUS_RESERVATION br
            JOIN TB_AUCTION_REQ_BUS ab ON br.REQ_ID = ab.REQ_ID AND br.REQ_BUS_SEQ = ab.REQ_BUS_SEQ
            JOIN TB_AUCTION_REQ r ON br.REQ_ID = r.REQ_ID
            JOIN TB_USER u ON br.DRIVER_ID = u.CUST_ID
            WHERE br.DRIVER_ID = ?
              AND br.DATA_STAT IN ('CONFIRM', 'DONE')
              AND ab.DATA_STAT IN ('CONFIRM', 'DONE')
            ORDER BY r.START_DT DESC
        `, [custId]);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Fetch archive list error:', err);
        res.status(500).json({ error: '보관함 목록을 가져오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 리뷰 답글 저장
 */
router.post('/save-review-reply/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { replyText } = req.body;
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 2. 리뷰 업데이트 (기사 본인의 운행인지 확인)
        const [result] = await pool.execute(`
            UPDATE TB_TRIP_REVIEW 
            SET REPLY_TEXT = ?, REPLY_DT = NOW(), MOD_ID = ?, MOD_DT = NOW()
            WHERE RES_ID = ? AND DRIVER_ID = ?
        `, [replyText, userId, id, custId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '리뷰를 찾을 수 없거나 권한이 없습니다.' });
        }

        res.json({ success: true, message: '답글이 저장되었습니다.' });
    } catch (err) {
        console.error('Save review reply error:', err);
        res.status(500).json({ error: '답글 저장 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 요금제(멤버십) 변경
 */
router.post('/membership/update', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { feePolicy } = req.body;

        if (!['DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(feePolicy)) {
            return res.status(400).json({ success: false, error: '유효하지 않은 요금제 코드입니다.' });
        }

        // CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 다음 달 YYYYMM 구하기 (오늘 기준 다음 달 1일) (한글 주석)
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const yyyymm = nextMonth.getFullYear().toString() + String(nextMonth.getMonth() + 1).padStart(2, '0');

        // DB enum 형식으로 오타 보정 (DRIVER_GENNERAL -> DRIVER_GENERAL) (한글 주석)
        const dbFeePolicy = feePolicy === 'DRIVER_GENNERAL' ? 'DRIVER_GENERAL' : feePolicy;

        // TB_MOM_MEMBER_REQ 에 저장 (중복 시 업데이트) (한글 주석)
        await pool.execute(
            `INSERT INTO TB_MOM_MEMBER_REQ (YYYYMM, CUST_ID, FEE_POLICY, APPLY_YN, REG_ID, REG_DT, MOD_ID, MOD_DT)
             VALUES (?, ?, ?, 'N', ?, NOW(), ?, NOW())
             ON DUPLICATE KEY UPDATE FEE_POLICY = VALUES(FEE_POLICY), MOD_ID = VALUES(MOD_ID), MOD_DT = NOW()`,
            [yyyymm, custId, dbFeePolicy, custId, custId]
        );

        res.json({ success: true, message: '다음 달 요금제 변경 예약이 완료되었습니다.' });
    } catch (error) {
        console.error('[App Membership Update] Error:', error);
        res.status(500).json({ success: false, error: '요금제 변경 예약 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 요금제(멤버십) 해지
 */
router.post('/membership/terminate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 다음 달 YYYYMM 구하기 (한글 주석)
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const yyyymm = nextMonth.getFullYear().toString() + String(nextMonth.getMonth() + 1).padStart(2, '0');

        // TB_MOM_MEMBER_REQ 에 해지('DRIVER') 상태로 저장 (중복 시 업데이트) (한글 주석)
        await pool.execute(
            `INSERT INTO TB_MOM_MEMBER_REQ (YYYYMM, CUST_ID, FEE_POLICY, APPLY_YN, REG_ID, REG_DT, MOD_ID, MOD_DT)
             VALUES (?, ?, 'DRIVER', 'N', ?, NOW(), ?, NOW())
             ON DUPLICATE KEY UPDATE FEE_POLICY = VALUES(FEE_POLICY), MOD_ID = VALUES(MOD_ID), MOD_DT = NOW()`,
            [yyyymm, custId, custId, custId]
        );

        res.json({ success: true, message: '멤버십 해지가 예약되었습니다. 다음 결제일부터는 요금이 청구되지 않습니다.' });
    } catch (error) {
        console.error('[App Membership Terminate] Error:', error);
        res.status(500).json({ success: false, error: '멤버십 해지 예약 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 카드 및 멤버십(회비) 정보 조회
 */
router.get('/membership-card-info', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. 등록된 카드 정보 및 사용자 프로필 이미지 조회
        const [[user]] = await pool.execute(
            `SELECT 
                u.CUST_ID,
                u.USER_IMAGE,
                f.GCS_PATH
             FROM TB_USER u
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
             WHERE u.USER_ID = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        const custId = user.CUST_ID;
        const userImage = user.GCS_PATH ? `/api/common/display-image?path=${encodeURIComponent(user.GCS_PATH)}` : user.USER_IMAGE;

        const [rawCards] = await pool.execute(
            'SELECT CARD_SEQ, CARD_NICKNAME, CARD_NO_ENC, EXP_MONTH, EXP_YEAR, IS_PRIMARY FROM TB_PAYMENT_CARD WHERE CUST_ID = ? ORDER BY IS_PRIMARY DESC, CARD_SEQ ASC',
            [custId]
        );

        const cards = rawCards.map(card => {
            let lastFour = '';
            if (card.CARD_NO_ENC) {
                try {
                    const decrypted = plainOrLegacyDecrypt(card.CARD_NO_ENC);
                    const digits = String(decrypted || '').replace(/\D/g, '');
                    lastFour = digits.length >= 4 ? digits.slice(-4) : digits;
                } catch (err) {
                    console.error('[App Card Decrypt] Error:', err);
                }
            }
            return {
                ...card,
                CARD_NO_ENC: lastFour
            };
        });

        // 2. 월별 멤버십 이용 및 결제 내역 조회 (최근 12개월)
        const [history] = await pool.execute(
            `SELECT 
                YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT 
             FROM TB_MOM_MEMBER 
             WHERE CUST_ID = ?
             ORDER BY YYYYMM DESC 
             LIMIT 12`,
            [custId]
        );

        // 3. 현재 활성화된 요금제 확인하여 다음 결제 정보 계산
        const [detail] = await pool.execute(
            'SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );

        const currentPolicy = detail[0]?.FEE_POLICY || 'DRIVER_GENERAL';

        // 공통코드 테이블(TB_COMMON_CODE)에서 FEE_POLICY 요금 정책의 단가(CD_FNUM) 정보를 실시간 조회하여 반영 (한글 주석)
        const [codeRows] = await pool.execute(
            `SELECT DTL_CD, CD_FNUM FROM TB_COMMON_CODE 
             WHERE GRP_CD = 'FEE_POLICY' AND (USE_YN = 'Y' OR USE_YN IS NULL)`
        );

        const policyPrices = {};
        codeRows.forEach(row => {
            const val = Number(row.CD_FNUM);
            policyPrices[row.DTL_CD] = Number.isFinite(val) ? Math.round(val) : 0;
        });

        // 일반 요금제 오타 또는 상호 호환성을 위한 예외 방지 (한글 주석)
        if (policyPrices['DRIVER_GENERAL'] === undefined && policyPrices['DRIVER_GENNERAL'] !== undefined) {
            policyPrices['DRIVER_GENERAL'] = policyPrices['DRIVER_GENNERAL'];
        } else if (policyPrices['DRIVER_GENNERAL'] === undefined && policyPrices['DRIVER_GENERAL'] !== undefined) {
            policyPrices['DRIVER_GENNERAL'] = policyPrices['DRIVER_GENERAL'];
        }

        // 기본값이 없는 경우 안전하게 0원으로 초기화 (한글 주석)
        if (policyPrices['DRIVER_GENERAL'] === undefined) policyPrices['DRIVER_GENERAL'] = 0;
        if (policyPrices['DRIVER_GENNERAL'] === undefined) policyPrices['DRIVER_GENNERAL'] = 0;
        if (policyPrices['DRIVER'] === undefined) policyPrices['DRIVER'] = 0;

        // 오늘 기준 다음 달 1일 정보 계산 (한글 주석)
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextYyyymm = nextMonth.getFullYear().toString() + String(nextMonth.getMonth() + 1).padStart(2, '0');

        // 4. 다음 달 신청 요금제(TB_MOM_MEMBER_REQ) 조회 (신청 대기 상태인 APPLY_YN = 'N') (한글 주석)
        const [reqRows] = await pool.execute(
            `SELECT FEE_POLICY FROM TB_MOM_MEMBER_REQ 
             WHERE CUST_ID = ? AND YYYYMM = ? AND APPLY_YN = 'N' 
             ORDER BY REG_DT DESC LIMIT 1`,
            [custId, nextYyyymm]
        );

        let nextPaymentAmount = 0;
        if (reqRows.length > 0) {
            // 다음 달 예약 등급이 있으면 해당 등급 단가 적용 (한글 주석)
            const nextPolicy = reqRows[0].FEE_POLICY;
            nextPaymentAmount = policyPrices[nextPolicy] !== undefined ? policyPrices[nextPolicy] : 0;
        } else {
            // 다음 달 등급이 없는데 현재 등급이 요금제이면 해당 요금제 단가 적용 (0원이거나 없으면 0원) (한글 주석)
            nextPaymentAmount = policyPrices[currentPolicy] !== undefined ? policyPrices[currentPolicy] : 0;
        }

        // 결제 예정일은 금액과 무관하게 항상 다음 달 1일로 설정 (한글 주석)
        const nextPaymentDate = `${nextMonth.getMonth() + 1}월 ${nextMonth.getDate()}일`;

        const formattedHistory = history.map(item => ({
            ...item,
            amount: policyPrices[item.FEE_POLICY] || 0,
            status: 'PAID'
        }));

        res.json({
            success: true,
            data: {
                userImage: userImage || null,
                cards: cards,
                history: formattedHistory,
                nextPaymentDate: nextPaymentDate,
                nextPaymentAmount: nextPaymentAmount
            }
        });
    } catch (error) {
        console.error('[App Membership Card Info] Error:', error);
        res.status(500).json({ success: false, error: '정보 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 결제 카드 등록 API
 */
router.post('/save-card-info', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { cardNickname, cardNumber, expiryDate, birthDate, cardPwFront } = req.body;

        if (!cardNumber || !expiryDate) {
            return res.status(400).json({ success: false, error: '카드 번호와 유효기간은 필수 항목입니다.' });
        }

        // 1. 로그인된 기사 사용자의 CUST_ID 및 기본 사용자명 등 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // 2. 유효기간 파싱 (MM/YY -> expMonth, expYearYY)
        let expMonth = '';
        let expYearYY = '';
        if (expiryDate.includes('/')) {
            const parts = expiryDate.split('/');
            expMonth = parts[0].trim();
            expYearYY = parts[1].trim();
        } else if (expiryDate.length === 4) {
            expMonth = expiryDate.slice(0, 2);
            expYearYY = expiryDate.slice(2);
        } else {
            return res.status(400).json({ success: false, error: '유효기간 포맷(MM/YY)이 올바르지 않습니다.' });
        }

        // 3. 카드 등록 모듈 호출 (registerBusDriverPaymentCard)
        // 새로 등록하는 카드이므로 setAsDefault: true로 지정하여 기본결제 카드로 설정
        const result = await registerBusDriverPaymentCard(pool, {
            rawDriverId: custId,
            panDigits: cardNumber,
            expMonth,
            expYearYY,
            cardNickname: cardNickname || '기사결제카드',
            setAsDefault: true
        });

        console.log(`[App Save Card Info] Card registered successfully. CUST_ID: ${custId}, CardSeq: ${result.cardSeq}`);

        res.json({
            success: true,
            message: '카드 정보가 성공적으로 저장되었습니다.',
            data: result
        });

    } catch (error) {
        console.error('[App Save Card Info] Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || '카드 저장 중 오류가 발생했습니다.'
        });
    }
});


// FCM 기기 토큰 등록 및 업데이트 (Upsert)
router.post('/upsert-device-token', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fcmToken, clientKind = 'mobile' } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ success: false, error: 'FCM 토큰이 필요합니다.' });
        }

        // 1. CUST_ID 조회 (기사도 TB_USER 테이블에 존재)
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // [안전장치] 동일한 FCM 토큰이 다른 기사/사용자에게 이미 등록되어 있다면 삭제 (기기 소유주 변경 대응)
        await pool.execute('DELETE FROM TB_USER_DEVICE_TOKEN WHERE FCM_TOKEN = ?', [fcmToken]);

        // 2. Upsert 실행 (CUST_ID, CLIENT_KIND가 PK이므로 중복 시 UPDATE)
        await pool.execute(`
            INSERT INTO TB_USER_DEVICE_TOKEN (CUST_ID, FCM_TOKEN, CLIENT_KIND, REG_ID, MOD_ID)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                FCM_TOKEN = VALUES(FCM_TOKEN),
                MOD_DT = CURRENT_TIMESTAMP,
                MOD_ID = VALUES(MOD_ID)
        `, [custId, fcmToken, clientKind, userId, userId]);

        res.json({ success: true, message: '기사용 기기 토큰이 성공적으로 등록되었습니다.' });
    } catch (err) {
        console.error('[App Driver] Upsert device token error:', err);
        res.status(500).json({ success: false, error: '기기 토큰 등록 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 기사 운행 취소 요청 (패널티 시스템 포함)
 * 1. 1회 취소: 1주일 정지 (취소 익일부터)
 * 2. 2회 취소: 2주일 정지
 * 3. 3회 취소: 영구 정지
 */
/**
 * [App] 기사 이용 제한 여부 확인
 * TB_USER_CANCEL_MANAGE 테이블을 조회하여 무기한 정지(P) 또는 기간제 정지(Y) 여부를 반환합니다.
 */
router.get('/check-restriction', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;

        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

        const { CUST_ID: custId } = uRows[0];

        // 1. 거래제한 상태 조회
        const [rows] = await connection.execute(`
            SELECT RESTRICT_STAT, RESTRICT_START_DT, RESTRICT_END_DT 
            FROM TB_USER_CANCEL_MANAGE 
            WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'
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
                    message: `${endStr}까지 서비스 이용이 제한되어 청약 참여가 불가능합니다.`
                });
            }
        }

        res.json({ restricted: false });

    } catch (error) {
        console.error('[Check Restriction] Error:', error);
        res.status(500).json({ success: false, error: '이용 제한 상태 확인 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/cancel-mission/:id', authenticateToken, memoryUpload.single('reasonDoc'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const resId = req.params.id;
        const userId = req.user.userId;
        const { cancelCode, cancelReasonText } = req.body;
        const file = req.file;

        // 1. 기사 정보 및 CUST_ID 조회 (기사 이름 USER_NM 추가 조회)
        const [uRows] = await connection.execute('SELECT CUST_ID, USER_NM FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId, USER_NM: driverName } = uRows[0];

        // 2. 예약 정보 확인 (본인 것인지 확인) 및 고객(여행자) ID, 여정명 조회
        const [resRows] = await connection.execute(
            `SELECT R.RES_ID, R.REQ_ID, R.TRAVELER_ID, A.TRIP_TITLE 
             FROM TB_BUS_RESERVATION R
             LEFT JOIN TB_AUCTION_REQ A ON R.REQ_ID = A.REQ_ID
             WHERE R.RES_ID = ? AND R.DRIVER_ID = ? AND R.DATA_STAT = 'CONFIRM'`,
            [resId, custId]
        );
        if (resRows.length === 0) throw new Error('취소 가능한 운행 내역이 아니거나 권한이 없습니다.');
        const { REQ_ID: reqId, TRAVELER_ID: travelerId, TRIP_TITLE: tripTitle } = resRows[0];

        // 3. 파일 업로드 처리 (있는 경우)
        let gcsPath = null;
        if (file) {
            const up = await uploadToGCS(file, 'cancels', connection);
            await connection.execute(
                `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) 
                 VALUES (?, 'CANCEL_DOC', ?, ?, ?, ?, ?, ?, ?)`,
                [up.fileId, bucketName, up.url, up.originalName, up.ext, up.fileSize, custId, custId]
            );
            gcsPath = up.url;
        }

        // 4. 취소 카운트 및 패널티 계산
        // TB_USER_CANCEL_MANAGE 조회 (없으면 생성)
        const [manageRows] = await connection.execute(
            'SELECT CANCEL_BUS_DRIVER_CNT FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ? AND USER_TYPE = \'DRIVER\'',
            [custId]
        );

        let currentCnt = 0;
        if (manageRows.length === 0) {
            await connection.execute(
                'INSERT INTO TB_USER_CANCEL_MANAGE (CUST_ID, USER_TYPE, CANCEL_CNT, CANCEL_BUS_DRIVER_CNT, REG_ID, MOD_ID) VALUES (?, \'DRIVER\', 0, 0, ?, ?)',
                [custId, custId]
            );
        } else {
            currentCnt = manageRows[0].CANCEL_BUS_DRIVER_CNT;
        }

        const newCnt = currentCnt + 1;

        // 5. 상태 업데이트
        // 예약 상태 변경
        await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'DRIVER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE RES_ID = ?', [custId, resId]);

        // 슬롯 상태 변경 (다시 경매로 돌릴지 취소로 할지 고민이나, 여기서는 취소로 처리)
        await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'DRIVER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND BUS_TYPE_CD = (SELECT SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE BUS_ID = (SELECT BUS_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?))', [custId, reqId, resId]);

        // 기사 회원 등급 조회
        const [driverDetailRows] = await connection.execute(
            'SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );
        const feePolicy = driverDetailRows.length > 0 ? driverDetailRows[0].FEE_POLICY : null;

        // 💰 위약금/정산 관리 테이블에 기사 취소 정보 적재 (기사 회원 등급 조회 및 트랜잭션 연동, 한글 주석)
        await connection.execute(
            `INSERT INTO TB_BUS_PENALTY_DEPOSIT (YYYYMMDD, RES_ID, DATA_STAT, PENALTY_DEPOSIT_YN, FEE_POLICY, REG_ID, MOD_ID)
             VALUES (DATE_FORMAT(NOW(), '%Y%m%d'), ?, 'DRIVER_CANCEL', 'N', ?, ?, ?)
             ON DUPLICATE KEY UPDATE DATA_STAT = 'DRIVER_CANCEL', FEE_POLICY = ?, MOD_DT = NOW(), MOD_ID = ?`,
            [resId, feePolicy, custId, custId, feePolicy, custId]
        );

        // 패널티 적용 (9회까지 당일부터 1주일, 10회부터 당일부터 9999-12-31 무기한 제한 설정) (한글 주석)
        if (newCnt >= 10) {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_BUS_DRIVER_CNT = ?, 
                    RESTRICT_STAT = 'P',
                    RESTRICT_START_DT = NOW(),
                    RESTRICT_END_DT = '9999-12-31 23:59:59',
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = NOW(),
                    TRADE_RESTRICT_END_DT = '9999-12-31 23:59:59',
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'
            `, [newCnt, custId, custId]);
        } else {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_BUS_DRIVER_CNT = ?, 
                    RESTRICT_STAT = 'Y',
                    RESTRICT_START_DT = NOW(),
                    RESTRICT_END_DT = DATE_ADD(NOW(), INTERVAL 7 DAY),
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = NOW(),
                    TRADE_RESTRICT_END_DT = DATE_ADD(NOW(), INTERVAL 7 DAY),
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'
            `, [newCnt, custId, custId]);
        }

        // 6. 취소 이력 등록
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
            ) VALUES (?, ?, 'DRIVER', 'DRIVER_CANCEL_REASON', ?, ?, ?, ?)
        `, [custId, histSeq, cancelReasonText || '', gcsPath, custId, custId]);

        await connection.commit();
        res.json({ success: true, message: '운행 취소 처리가 완료되었습니다.' });

        // 트랜잭션 성공 후 고객에게 기사 계약 취소 푸시 알림 발송 (비동기 비차단)
        if (travelerId) {
            sendNotification(pool, {
                custId: travelerId,
                title: '[계약 취소] 기사님이 예약을 취소했습니다.',
                body: `여정: ${tripTitle || ''}\n${driverName || '기사'} 기사님이 예약을 취소했습니다. 상세 내역을 확인해 주세요.`,
                link: `/reservation-detail/${reqId}`,
                type: 'SYSTEM'
            }).catch(pushErr => {
                console.error('[Notification] Failed to send push message to traveler on driver cancel:', pushErr.message);
            });
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[Driver Cancel Mission] Error:', error);
        res.status(500).json({ success: false, error: error.message || '취소 처리 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * [App] 기사 입찰 취소 (Bidding 취소)
 * 1. 입찰 대기 상태(BIDDING)인 경우에만 취소 가능 (매칭된 후에는 cancel-mission 이용)
 * 2. TB_BUS_RESERVATION의 상태를 DRIVER_CANCEL로 변경
 * 3. TB_AUCTION_REQ_BUS의 슬롯 상태를 AUCTION으로 되돌려 다른 기사가 재입찰할 수 있도록 함
 * 4. TB_AUCTION_REQ 마스터 상태 또한 AUCTION으로 롤백
 */
router.post('/cancel-bid/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const resId = req.params.id; // TB_BUS_RESERVATION.RES_ID
        const userId = req.user.userId;

        // 1. 기사 정보 및 CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const custId = uRows[0].CUST_ID;

        // 2. 예약(입찰) 정보 확인 (CUSTOMER_PAY_WAIT 또는 DRIVER_PAY_WAIT 상태 대상)
        const [resRows] = await connection.execute(
            `SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION 
             WHERE RES_ID = ? AND DRIVER_ID = ? AND DATA_STAT IN ('CUSTOMER_PAY_WAIT', 'DRIVER_PAY_WAIT')`,
            [resId, custId]
        );
        if (resRows.length === 0) {
            throw new Error('취소 가능한 청약 내역이 아니거나 이미 확정되어 권한이 없습니다.');
        }
        const { REQ_ID: reqId, REQ_BUS_SEQ: reqBusSeq } = resRows[0];

        // 3. TB_BUS_RESERVATION 상태 변경 (DRIVER_CANCEL)
        await connection.execute(
            "UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'DRIVER_CANCEL', MOD_ID = ?, MOD_DT = NOW() WHERE RES_ID = ?",
            [custId, resId]
        );

        // 4. TB_AUCTION_REQ_BUS 슬롯을 다시 'AUCTION' 상태로 돌려놓음 (다른 기사가 입찰할 수 있도록)
        await connection.execute(
            "UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'AUCTION', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?",
            [custId, reqId, reqBusSeq]
        );

        // 5. 마스터 TB_AUCTION_REQ 상태도 'AUCTION'으로 되돌려놓음 (슬롯 하나가 비었으므로)
        await connection.execute(
            "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
            [custId, reqId]
        );

        // 6. 기사 취소 페널티/제한 누적 관리 (TB_USER_CANCEL_MANAGE)
        const [manageRows] = await connection.execute(
            'SELECT CANCEL_BUS_DRIVER_CNT FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?',
            [custId]
        );
        if (manageRows.length > 0) {
            await connection.execute(
                `UPDATE TB_USER_CANCEL_MANAGE 
                 SET CANCEL_BUS_DRIVER_CNT = CANCEL_BUS_DRIVER_CNT + 1, MOD_ID = ?, MOD_DT = NOW() 
                 WHERE CUST_ID = ?`,
                [custId, custId]
            );
        } else {
            await connection.execute(
                `INSERT INTO TB_USER_CANCEL_MANAGE (CUST_ID, USER_TYPE, CANCEL_BUS_DRIVER_CNT, REG_ID, REG_DT, MOD_ID, MOD_DT)
                 VALUES (?, 'DRIVER', 1, ?, NOW(), ?, NOW())`,
                [custId, custId, custId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: '청약 취소가 완료되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[Driver Cancel Bid] Error:', error);
        res.status(500).json({ success: false, error: error.message || '청약 취소 중 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

const axios = require('axios');
const crypto = require('crypto');

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function getTimestamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}${h}${min}${s}`;
}

/**
 * 이니시스 빌링 서명 및 파라미터 생성 API
 */
router.get('/inicis-bill-signature', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        const mid = process.env.INICIS_BILL_MID || 'INIBillTst';
        // 모바일 빌라이트 테스트 상점아이디(INIBillTst)일 경우, 전용 테스트 대칭키를 강제 적용합니다.
        let signKey = process.env.INICIS_BILL_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
        if (mid === 'INIBillTst') {
            signKey = 'b09LVzhuTGZVaEY1WmJoQnZzdXpRdz09';
        }
        
        const timestamp = getTimestamp();
        const oid = `BILL_${custId}_${timestamp}`;
        const price = '1000'; // 빌링키 등록 시 이니시스 검증 오류를 피하기 위해 더미 금액인 1000원 설정

        // signature = SHA256(oid + price + timestamp)
        const signature = sha256(oid + price + timestamp);
        
        // mKey = SHA256(signKey)
        const mKey = sha256(signKey);

        // 모바일 빌라이트(INILite)용 해시데이터 생성: SHA256(mid + oid + timestamp + signKey)
        const hashdata = sha256(mid + oid + timestamp + signKey);

        res.json({
            success: true,
            data: {
                mid,
                oid,
                price,
                timestamp,
                signature,
                mKey,
                hashdata,
                custId
            }
        });
    } catch (err) {
        console.error('[Inicis Bill Signature] Error:', err);
        res.status(500).json({ success: false, error: '이니시스 서명 생성 중 오류가 발생했습니다.' });
    }
});

/**
 * 이니시스 빌링 완료 리턴 수신 API (POST)
 */
router.post('/inicis-bill-return', async (req, res) => {
    try {
        // 1. 모바일 빌라이트(INILite) 응답 여부 판단 (resultcode 또는 resultCode 가 있는 경우)
        const isMobileLite = (req.body.resultcode !== undefined || req.body.resultCode !== undefined);
        // 2. 기존 모바일 기기 결제 콜백 여부 판단 (P_STATUS, P_TID 등이 포함된 경우)
        const isMobile = (req.body.P_STATUS !== undefined || req.body.P_TID !== undefined);

        if (isMobileLite) {
            // 이니시스 빌라이트는 리턴 파라미터가 소문자로 전달되므로 양쪽 모두 지원되도록 처리합니다.
            const resultCode = req.body.resultcode !== undefined ? req.body.resultcode : req.body.resultCode;
            const resultMsg = req.body.resultmsg !== undefined ? req.body.resultmsg : req.body.resultMsg;
            const billkey = req.body.billkey !== undefined ? req.body.billkey : req.body.billKey;
            const orderId = req.body.orderid !== undefined ? req.body.orderid : req.body.orderId;
            const merchantReserved = req.body.merchantreserved !== undefined ? req.body.merchantreserved : req.body.merchantReserved;
            const cardNo = req.body.cardno !== undefined ? req.body.cardno : (req.body.cardNo !== undefined ? req.body.cardNo : req.body.cardNum);
            const cardName = req.body.cardname !== undefined ? req.body.cardname : (req.body.cardName !== undefined ? req.body.cardName : req.body.cardname);

            console.log('[Inicis Bill Return] 모바일 빌라이트 파라미터 수신:', { resultCode, resultMsg, billkey, orderId, merchantReserved, cardNo, cardName });

            // 빌라이트 인증 실패 시 처리
            if (resultCode !== '0000') {
                const errorMsg = resultMsg || '모바일 빌라이트 카드 인증에 실패했습니다.';
                return res.redirect(`https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=${encodeURIComponent(errorMsg)}`);
            }

            if (!billkey) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('발급된 모바일 빌키가 존재하지 않습니다.'));
            }

            // merchantReserved 파싱하여 기사 고유 정보 및 카드 별칭 조회 (형식: "custId:cardNickname")
            const reservedData = String(merchantReserved || '');
            const sepIndex = reservedData.indexOf(':');
            let custId = '';
            let cardNickname = '기사결제카드';

            if (sepIndex !== -1) {
                custId = reservedData.substring(0, sepIndex).trim();
                cardNickname = reservedData.substring(sepIndex + 1).trim() || '기사결제카드';
            } else {
                custId = reservedData.trim();
            }

            if (!custId) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('사용자 식별 정보(CUST_ID)가 누락되었습니다.'));
            }

            // 결제 카드 DB 등록 처리
            const registerResult = await registerBusDriverPaymentCard(pool, {
                rawDriverId: custId,
                billKey: billkey,
                panDigits: cardNo || '',
                cardNickname,
                originalCardName: cardName || '신용카드',
                setAsDefault: true
            });

            console.log('[Inicis Bill Return] 모바일 빌라이트 카드 등록 성공:', registerResult);
            return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=success');

        } else if (isMobile) {
            const { P_STATUS, P_RMESG1, P_TID, P_REQ_URL, P_NOTI, P_MID } = req.body;
            console.log('[Inicis Bill Return] 모바일 파라미터 수신:', { P_STATUS, P_RMESG1, P_TID, P_REQ_URL, P_NOTI, P_MID });

            // 모바일 1차 인증 결과 실패 시 처리
            if (P_STATUS !== '00') {
                const errorMsg = P_RMESG1 || '모바일 카드 인증에 실패했습니다.';
                return res.redirect(`https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=${encodeURIComponent(errorMsg)}`);
            }

            if (!P_REQ_URL || !P_TID) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('모바일 승인 요청 정보가 부족합니다.'));
            }

            // 2. 이니시스 모바일 승인 API 호출 (Server-to-Server)
            const approvalUrl = P_REQ_URL;
            const params = new URLSearchParams();
            params.append('P_MID', P_MID || process.env.INICIS_BILL_MID || 'INIBillTst');
            params.append('P_TID', P_TID);

            console.log('[Inicis Bill Return] 모바일 승인 요청 URL:', approvalUrl);
            const response = await axios.post(approvalUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const rawText = response.data;
            console.log('[Inicis Bill Return] 모바일 승인 API 응답(Raw):', rawText);

            // 이니시스 모바일 응답 문자열 파싱 (Key=Value 형태로 연결되어 수신됨)
            let resultMap = {};
            if (typeof rawText === 'string') {
                if (rawText.trim().startsWith('{')) {
                    try {
                        resultMap = JSON.parse(rawText);
                    } catch (e) {
                        console.error('모바일 승인 JSON 파싱 실패:', e);
                    }
                } else {
                    rawText.split('&').forEach(pair => {
                        const sepIdx = pair.indexOf('=');
                        if (sepIdx !== -1) {
                            const key = pair.substring(0, sepIdx).trim();
                            const val = pair.substring(sepIdx + 1).trim();
                            resultMap[key] = val;
                        }
                    });
                }
            } else if (typeof rawText === 'object') {
                resultMap = rawText;
            }

            const resStatus = String(resultMap.P_STATUS || '');
            const resMsg = String(resultMap.P_RMESG1 || '모바일 최종 승인 실패');

            if (resStatus !== '00' && resStatus !== '0000') {
                console.error('[Inicis Bill Return] 모바일 최종 승인 실패:', resMsg);
                return res.redirect(`https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=${encodeURIComponent(resMsg)}`);
            }

            // 빌링키 획득
            const billKey = resultMap.P_BILLKEY;
            const cardNum = resultMap.P_CARD_NUM || '';
            const cardName = resultMap.P_FN_NM || '신용카드';

            if (!billKey) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('발급된 모바일 빌링키가 존재하지 않습니다.'));
            }

            // P_NOTI 파싱하여 기사 고유 정보 조회 (형식: "custId:cardNickname")
            const notiData = String(P_NOTI || resultMap.P_NOTI || '');
            const sepIndex = notiData.indexOf(':');
            let custId = '';
            let cardNickname = '기사결제카드';

            if (sepIndex !== -1) {
                custId = notiData.substring(0, sepIndex).trim();
                cardNickname = notiData.substring(sepIndex + 1).trim() || '기사결제카드';
            } else {
                custId = notiData.trim();
            }

            if (!custId) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('사용자 식별 정보(CUST_ID)가 누락되었습니다.'));
            }

            // 3. 결제 카드 DB 등록 처리
            const registerResult = await registerBusDriverPaymentCard(pool, {
                rawDriverId: custId,
                billKey,
                panDigits: cardNum,
                cardNickname,
                originalCardName: cardName,
                setAsDefault: true
            });

            console.log('[Inicis Bill Return] 모바일 카드 등록 성공:', registerResult);
            return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=success');

        } else {
            // --- 기존 PC 웹표준 결과 처리 로직 ---
            const { authUrl, authToken, mid, merchantData } = req.body;
            console.log('[Inicis Bill Return] PC 파라미터 수신:', { authUrl, authToken, mid, merchantData });

            if (!authToken) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('인증 토큰이 없습니다.'));
            }

            // merchantData 파싱 (형식: "custId:cardNickname")
            const mData = String(merchantData || '');
            const sepIndex = mData.indexOf(':');
            let custId = '';
            let cardNickname = '기사결제카드';

            if (sepIndex !== -1) {
                custId = mData.substring(0, sepIndex).trim();
                cardNickname = mData.substring(sepIndex + 1).trim() || '기사결제카드';
            } else {
                custId = mData.trim();
            }

            if (!custId) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('사용자 식별 정보(CUST_ID)가 누락되었습니다.'));
            }

            // 2. 이니시스 승인 API 통신 (HTTP POST)
            const requestTimestamp = getTimestamp();
            const signKey = process.env.INICIS_BILL_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
            
            // signature = SHA256(authToken + timestamp)
            const approveSignature = sha256(authToken + requestTimestamp);

            const params = new URLSearchParams();
            params.append('mid', mid || 'INIBillTst');
            params.append('authToken', authToken);
            params.append('signature', approveSignature);
            params.append('timestamp', requestTimestamp);
            params.append('charset', 'UTF-8');
            params.append('format', 'JSON');

            // authUrl 이 있으면 사용하고, 없으면 기본 API URL 사용
            const approvalUrl = authUrl || 'https://iniapi.inicis.com/api/v1/auth';
            console.log('[Inicis Bill Return] PC 승인 요청 URL:', approvalUrl);

            const response = await axios.post(approvalUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const resultMap = response.data;
            console.log('[Inicis Bill Return] PC 승인 API 응답:', resultMap);

            const resultCode = String(resultMap.resultCode || '');
            const resultMsg = String(resultMap.resultMsg || '인증 실패');

            if (resultCode === '0000') {
                const billKey = resultMap.CARD_BillKey;
                const cardNum = resultMap.cardNum || resultMap.CARD_Num || '';
                const cardName = resultMap.cardName || resultMap.CARD_Name || '신용카드';

                if (!billKey) {
                    return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('발급된 빌링키가 존재하지 않습니다.'));
                }

                // 3. 카드 등록 모듈 호출
                const registerResult = await registerBusDriverPaymentCard(pool, {
                    rawDriverId: custId,
                    billKey,
                    panDigits: cardNum,
                    cardNickname,
                    originalCardName: cardName,
                    setAsDefault: true
                });

                console.log('[Inicis Bill Return] PC 카드 등록 성공:', registerResult);
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=success');
            } else {
                console.error('[Inicis Bill Return] PC 승인 실패:', resultMsg);
                return res.redirect(`https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=${encodeURIComponent(resultMsg)}`);
            }
        }
    } catch (err) {
        console.error('[Inicis Bill Return] 치명적인 에러 발생:', err);
        return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent(err.message || '알 수 없는 서버 에러'));
    }
});


/**
 * [App] 기사 정산 내역 및 상세 조회 (TB_BUS_PENALTY_DEPOSIT 연동, 한글 주석)
 * GET /app/driver/settlement-history
 */
router.get('/settlement-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const year = req.query.year || '2026';

        // 1. 기사의 CUST_ID 조회
        const [uRows] = await pool.execute(
            `SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?`,
            [userId]
        );
        if (uRows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
        }
        const custId = uRows[0].CUST_ID;

        // 2. 기사의 요금제 정보(FEE_POLICY) 및 면제 한도 건수(CD_FNUM) 조회 (기본값 제공 및 호환용)
        const [policyRows] = await pool.execute(
            `SELECT d.FEE_POLICY, c.CD_FNUM 
             FROM TB_DRIVER_DETAIL d
             LEFT JOIN TB_COMMON_CODE c ON c.GRP_CD = 'FEE_POLICY_CNT' AND c.DTL_CD = d.FEE_POLICY
             WHERE d.CUST_ID = ?`,
            [custId]
        );

        let feePolicy = null;
        let limitCount = 0;
        if (policyRows.length > 0) {
            feePolicy = policyRows[0].FEE_POLICY;
            limitCount = policyRows[0].CD_FNUM ? parseInt(policyRows[0].CD_FNUM, 10) : 0;
        }

        // 2-B. 요금 정책별 면제 한도 건수(CD_FNUM) 일괄 캐싱 조회
        const [codeRows] = await pool.execute(
            `SELECT DTL_CD, CD_FNUM FROM TB_COMMON_CODE 
             WHERE GRP_CD = 'FEE_POLICY_CNT' AND (USE_YN = 'Y' OR USE_YN IS NULL)`
        );
        const policyLimits = {};
        codeRows.forEach(row => {
            policyLimits[row.DTL_CD] = row.CD_FNUM ? parseInt(row.CD_FNUM, 10) : 0;
        });
        // 'DRIVER' 요금제(멤버십 적용)의 경우 기본 면제 한도를 10000건으로 고정하여 혜택 보장
        policyLimits['DRIVER'] = 10000;

        // 3. 기사의 전체 위약금 및 정산 내역(TB_BUS_PENALTY_DEPOSIT)과 예약 정보(TB_BUS_RESERVATION) 조인 조회
        // 누적 완료 횟수 카운트를 위해 전체 조회하며 REG_DT ASC 순으로 정렬
        const [historyRows] = await pool.execute(
            `SELECT 
                p.YYYYMMDD,
                p.RES_ID,
                p.DATA_STAT,
                p.REG_DT as DEPOSIT_REG_DT,
                r.DRIVER_BIDDING_PRICE,
                r.RES_FEE_TOTAL_AMT,
                r.RES_FEE_REFUND_AMT,
                r.RES_FEE_ATTRIBUTION_AMT,
                p.FEE_POLICY, -- 위약금/정산 관리 테이블(TB_BUS_PENALTY_DEPOSIT)의 FEE_POLICY 이용
                req.TRIP_TITLE,
                req.START_ADDR,
                req.END_ADDR,
                DATE_FORMAT(req.START_DT, '%Y-%m-%d %H:%i') as START_DT,
                DATE_FORMAT(req.END_DT, '%Y-%m-%d %H:%i') as END_DT
             FROM TB_BUS_PENALTY_DEPOSIT p
             INNER JOIN TB_BUS_RESERVATION r ON p.RES_ID = r.RES_ID
             INNER JOIN TB_AUCTION_REQ req ON r.REQ_ID = req.REQ_ID
             WHERE r.DRIVER_ID = ?
             ORDER BY p.REG_DT ASC, p.RES_ID ASC`,
            [custId]
        );

        let doneCount = 0;
        const allCalculated = [];

        for (const row of historyRows) {
            let settlementAmount = 0;
            const biddingPrice = parseInt(row.DRIVER_BIDDING_PRICE || 0, 10);
            const feeAttribution = parseInt(row.RES_FEE_ATTRIBUTION_AMT || 0, 10);
            const feeTotal = parseInt(row.RES_FEE_TOTAL_AMT || 0, 10);
            const feeRefund = parseInt(row.RES_FEE_REFUND_AMT || 0, 10);

            // 개별 예약 건에 적용된 요금제(FEE_POLICY)에 기반하여 면제 한도 동적 결정
            const currentItemPolicy = row.FEE_POLICY || 'DRIVER_GENERAL';
            const currentItemLimit = policyLimits[currentItemPolicy] !== undefined ? policyLimits[currentItemPolicy] : 0;

            if (row.DATA_STAT === 'DONE') {
                doneCount++;
                if (doneCount <= currentItemLimit) {
                    // 면제 횟수 이하: DRIVER_BIDDING_PRICE - RES_FEE_ATTRIBUTION_AMT
                    settlementAmount = biddingPrice - feeAttribution;
                } else {
                    // 면제 횟수 초과: DRIVER_BIDDING_PRICE - RES_FEE_TOTAL_AMT
                    settlementAmount = biddingPrice - feeTotal;
                }
            } else if (row.DATA_STAT === 'TRAVELER_CANCEL') {
                // 여행자 취소: RES_FEE_REFUND_AMT
                settlementAmount = feeRefund;
            } else if (row.DATA_STAT === 'DRIVER_CANCEL') {
                // 기사 취소: 0원
                settlementAmount = 0;
            }

            allCalculated.push({
                resId: row.RES_ID,
                yyyyyMMdd: row.YYYYMMDD,
                dataStat: row.DATA_STAT,
                tripTitle: row.TRIP_TITLE,
                startAddr: row.START_ADDR,
                endAddr: row.END_ADDR,
                startDt: row.START_DT,
                endDt: row.END_DT,
                biddingPrice,
                feeAttribution,
                feeTotal,
                feeRefund,
                settlementAmount,
                feePolicy: currentItemPolicy, // 해당 개별 정산 건의 요금 정책 전달
                doneSeq: row.DATA_STAT === 'DONE' ? doneCount : null,
                isAttribution: row.DATA_STAT === 'DONE' && doneCount <= currentItemLimit
            });
        }

        // 4. 선택 연도로 필터링 및 월별 요약 합산
        const filtered = allCalculated.filter(item => item.yyyyyMMdd.startsWith(year));

        const monthlySummary = {};
        let totalSettlementYear = 0;

        filtered.forEach(item => {
            const monthPart = item.yyyyyMMdd.substring(4, 6);
            const monthKey = `${year}년 ${monthPart}월`;
            if (!monthlySummary[monthKey]) {
                monthlySummary[monthKey] = {
                    month: monthKey,
                    amount: 0,
                    count: 0
                };
            }
            monthlySummary[monthKey].amount += item.settlementAmount;
            monthlySummary[monthKey].count += 1;
            totalSettlementYear += item.settlementAmount;
        });

        // 📅 최신 월이 상단에 배치되도록 내림차순 정렬 (한글 주석)
        const monthlyDataList = Object.values(monthlySummary).sort((a, b) => b.month.localeCompare(a.month));

        res.json({
            success: true,
            data: {
                feePolicy,
                limitCount,
                summary: {
                    year: parseInt(year, 10),
                    totalAmount: totalSettlementYear,
                    nextSettlementDate: '2026.06.12',
                    pendingAmount: 1250000
                },
                monthlyData: monthlyDataList,
                details: filtered
            }
        });

    } catch (err) {
        console.error('Fetch settlement history error:', err);
        res.status(500).json({ error: '정산 내역 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * [App] 통장 사본 OCR 분석 API
 * 한글 주석: 통장 사본 이미지 파일을 받아 은행명, 계좌번호, 예금주를 추출하여 반환합니다.
 */
router.post('/ocr/bankbook', authenticateToken, memoryUpload.single('bankBookImg'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: '업로드된 통장 사본 파일이 없습니다.' });
        }

        // ocrService의 분석 함수 호출
        const ocrData = await processBankbookOcr(file.buffer);
        
        res.json({
            success: true,
            data: ocrData
        });
    } catch (err) {
        console.error('[OCR Bankbook API] Error:', err);
        res.status(500).json({ error: '통장 사본 분석 중 오류 발생: ' + err.message });
    }
});

/**
 * [App] 사업자 등록증 OCR 분석 API
 * 한글 주석: 사업자 등록증 이미지 파일을 받아 사업자등록번호, 상호, 대표자명, 주소, 업태, 종목을 추출하여 반환합니다.
 */
router.post('/ocr/bizreg', authenticateToken, memoryUpload.single('bizRegImg'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: '업로드된 사업자 등록증 파일이 없습니다.' });
        }

        // ocrService의 분석 함수 호출
        const ocrData = await processBizRegOcr(file.buffer);
        
        res.json({
            success: true,
            data: ocrData
        });
    } catch (err) {
        console.error('[OCR BizReg API] Error:', err);
        res.status(500).json({ error: '사업자 등록증 분석 중 오류 발생: ' + err.message });
    }
});

/**
 * [App] 기사 알림 연동용 여정/예약 상태 조회 API
 * 한글 주석: 알림 클릭 시 결제/최종 승인/운행예정 상세 화면으로의 동적 분기를 위해 여정의 현재 상태(DATA_STAT)를 반환합니다.
 */
router.get('/bids/status', authenticateToken, async (req, res) => {
    try {
        const { reqId, resId } = req.query;
        if (!reqId || !resId) {
            return res.status(400).json({ success: false, error: 'reqId와 resId는 필수 파라미터입니다.' });
        }

        const [rows] = await pool.execute(
            'SELECT DATA_STAT FROM TB_BUS_RESERVATION WHERE RES_ID = ? AND REQ_ID = ?',
            [resId, reqId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '해당 예약건을 찾을 수 없습니다.' });
        }

        res.json({ success: true, status: rows[0].DATA_STAT });
    } catch (err) {
        console.error('[Fetch Bid Status API] Error:', err);
        res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
    }
});

module.exports = router;


