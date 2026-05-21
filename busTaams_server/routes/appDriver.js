const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { pool, getNextId, uploadToLocal } = require('../db');
const { encrypt, decrypt, plainOrLegacyDecrypt } = require('../crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { registerBusDriverPaymentCard } = require('../lib/busDriverCreditCardRegistration');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'bustaams-dev-secret-key-2026';

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

// 로컬 파일 업로드 공통 함수 (기존 uploadToGCS를 대체하여 로컬 스토리지에 저장)
const uploadToGCS = async (file, folder, connection = null) => {
    if (!file) return null;

    // 업로드 대상 하위 폴더 결정 (signatures, profiles, documents, vehicles, legal, cancels 등)
    let folderName = 'documents'; // 기본 디렉터리

    if (file.fieldname === 'profileImg') {
        folderName = 'profiles';
    } else if (file.fieldname === 'vehiclePhotos') {
        folderName = 'vehicles';
    } else if (['licenseImg', 'busLicenseImg', 'careerCertImg'].includes(file.fieldname)) {
        folderName = 'documents';
    } else if (['bizRegFile', 'transLicFile', 'insCertFile'].includes(file.fieldname)) {
        folderName = 'legal';
    } else if (folder === 'cancels' || file.fieldname === 'reasonDoc') {
        folderName = 'cancels';
    } else if (folder === 'drivers') {
        folderName = 'documents';
    } else if (folder === 'buses') {
        folderName = 'vehicles';
    }

    // 로컬 스토리지 업로드 실행
    const uploadResult = await uploadToLocal(file, folderName, connection);
    return uploadResult;
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

        // 2. 기사 상세 정보 등록 여부 확인 (TB_DRIVER_DETAIL)
        const [detailRows] = await pool.execute(
            'SELECT 1 FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );
        const isDriverInfoRegistered = detailRows.length > 0;

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

        // 5. 기타 통계 및 상세 수익 계산
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const [statsRows] = await pool.execute(
            `SELECT 
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'BIDDING') as countBidding,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'CONFIRM') as countConfirmed,
                (SELECT COUNT(*) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'DONE') as countDone,
                (SELECT SUM(DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'DONE' AND DATE_FORMAT(MOD_DT, '%Y-%m') = ?) as monthlyProfit,
                (SELECT SUM(DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'CONFIRM') as pendingProfit,
                (SELECT SUM(DRIVER_BIDDING_PRICE) FROM TB_BUS_RESERVATION WHERE DRIVER_ID = ? AND DATA_STAT = 'DONE') as totalProfit`,
            [custId, custId, custId, custId, currentMonth, custId, custId]
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
                countBidding: statsRows[0].countBidding,
                countConfirmed: statsRows[0].countConfirmed,
                countDone: statsRows[0].countDone,
                monthlyProfit: statsRows[0].monthlyProfit || 0,
                pendingProfit: statsRows[0].pendingProfit || 0,
                totalProfit: statsRows[0].totalProfit || 0,
                todayTrip: todayRows.length > 0 ? todayRows[0] : null,
                countAuctions,
                auctionList,
                restriction
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
                fullPath
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
            'SELECT ZIPCODE as zipcode, ADDRESS as address, DETAIL_ADDRESS as detailAddress, SEX as sex, ADDR_TYPE as addrType, SELF_INTRO as selfIntro, FEE_POLICY as feePolicy FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?',
            [custId]
        );

        // 3. TB_DRIVER_DOCS 인증 서류 정보 (면허증, 자격증 등)
        const [docRows] = await pool.execute(
            `SELECT DOC_TYPE, LICENSE_TYPE_CD, DOC_NO_ENC, DATE_FORMAT(ISSUE_DT, '%Y-%m-%d') as issueDt, INFO_STAT_CD, 
                    CASE WHEN GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', GCS_PATH) ELSE NULL END as filePath, 
                    APPROVE_STAT as approveStat
             FROM TB_DRIVER_DOCS WHERE CUST_ID = ? ORDER BY REG_DT DESC`,
            [custId]
        );

        const driverData = {
            sex: 'M',
            addrType: 'HOME',
            selfIntro: '',
            ...(detailRows.length > 0 ? detailRows[0] : {}),
            residentNo: userData.RESIDENT_NO_ENC ? decrypt(userData.RESIDENT_NO_ENC) : '',
            profileImg: userData.userImage
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
            }
        }

        res.json({
            success: true,
            data: {
                user: {
                    name: userData.USER_NM,
                    phone: userData.HP_NO
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
    { name: 'careerCertImg', maxCount: 1 }
]), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const {
            name, phone, residentNo, zipcode, address, detailAddress,
            licenseType, licenseNo, licenseIssueDt, licenseValidity,
            busLicenseNo, qualAcquisitionDt, qualStatus,
            sex, addrType, selfIntro, firebaseToken
        } = req.body;

        // 주민등록번호 유효성 검증
        if (!validateRRN(residentNo)) {
            throw new Error('유효하지 않은 주민등록번호입니다.');
        }

        // 공백 및 하이픈 제거
        const cleanResidentNo = residentNo.replace(/[^0-9]/g, '');

        // 0. 중복 체크 (암호화된 컬럼이므로 전체 기사를 조회하여 복호화 비교)
        // 본인(userId)은 제외하고 검색
        const [allDrivers] = await connection.execute(
            'SELECT USER_ID, RESIDENT_NO_ENC FROM TB_USER WHERE USER_TYPE = "DRIVER" AND RESIDENT_NO_ENC IS NOT NULL AND USER_ID != ?',
            [req.user.userId]
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

        // 필수 필드 검증 (면허 발급일 및 자격 취득일)
        if (!licenseIssueDt || !licenseIssueDt.trim()) {
            throw new Error('면허 발급일을 입력해주세요.');
        }
        if (!qualAcquisitionDt || !qualAcquisitionDt.trim()) {
            throw new Error('자격 취득일을 입력해주세요.');
        }

        // 날짜 유효성 검증 (과거여야 함)
        const today = new Date().toISOString().split('T')[0];
        if (licenseIssueDt && licenseIssueDt > today) {
            throw new Error('면허 발급일은 오늘 이전 날짜여야 합니다.');
        }
        if (qualAcquisitionDt && qualAcquisitionDt > today) {
            throw new Error('자격 취득일은 오늘 이전 날짜여야 합니다.');
        }

        const userId = req.user.userId;

        // 0. CUST_ID 및 기존 프로필 파일 ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID, PROFILE_FILE_ID, HP_NO FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId, PROFILE_FILE_ID: existingProfileFileId, HP_NO: existingPhone } = uRows[0];

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
                    [fileId, category, 'LOCAL', url, originalName, ext, uploadResult.fileSize, custId, custId]
                );
                return fileId;
            }
        };

        // 1. 프로필 이미지 처리 및 TB_USER 업데이트 (PROFILE_FILE_ID만 업데이트)
        const profileFileId = await processFileUpload('profileImg', 'DRIVER_PHOTO', existingProfileFileId);

        await connection.execute(
            'UPDATE TB_USER SET USER_NM = ?, HP_NO = ?, RESIDENT_NO_ENC = ?, PROFILE_FILE_ID = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [name, phone, encrypt(residentNo), profileFileId, custId, userId]
        );

        // 2. TB_DRIVER_DETAIL 업데이트 (주소, 성별, 자기소개, 생년월일 등)
        const birthYmd = residentNo.substring(0, 6);
        const [existsDetail] = await connection.execute('SELECT 1 FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?', [custId]);
        if (existsDetail.length > 0) {
            await connection.execute(
                'UPDATE TB_DRIVER_DETAIL SET BIRTH_YMD = ?, ZIPCODE = ?, ADDRESS = ?, DETAIL_ADDRESS = ?, SEX = ?, ADDR_TYPE = ?, SELF_INTRO = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
                [birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, custId, custId]
            );
        } else {
            await connection.execute(
                'INSERT INTO TB_DRIVER_DETAIL (CUST_ID, BIRTH_YMD, ZIPCODE, ADDRESS, DETAIL_ADDRESS, SEX, ADDR_TYPE, SELF_INTRO, FEE_POLICY, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [custId, birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, 'DRIVER', custId, custId]
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
                    [fileId, `DRIVER_${type}`, 'LOCAL', currentPath, file.originalname, path.extname(file.originalname).replace('.', ''), file.size, custId, custId]
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
                // 신규 등록 시 파일 필수 체크
                if (!file) {
                    const typeNm = type === 'LICENSE' ? '운전면허증' : type === 'QUALIFICATION' ? '버스운전자격증' : '운전경력증명서';
                    throw new Error(`${typeNm} 파일을 업로드해주세요.`);
                }
                const ext = path.extname(file.originalname).replace('.', '');
                await connection.execute(
                    `INSERT INTO TB_DRIVER_DOCS (CUST_ID, DOC_TYPE, DOC_TYPE_SEQ, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, ORG_FILE_EXT, FILE_SIZE, LICENSE_TYPE_CD, DOC_NO_ENC, ISSUE_DT, INFO_STAT_CD, REG_ID, MOD_ID) 
                     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [custId, type, 'LOCAL', currentPath, file.originalname, ext, file.size, licType, encrypt(no), dt, status, custId, custId]
                );
            }
        };

        await upsertDoc('LICENSE', licenseNo, licenseIssueDt, 'licenseImg', licenseType, licenseValidity === 'Y' ? 'VALID' : 'EXPIRED');
        await upsertDoc('QUALIFICATION', busLicenseNo, qualAcquisitionDt, 'busLicenseImg', null, qualStatus || 'ACTIVE');
        // 3번째 필수 서류: 운전경력증명서 (번호가 없으므로 'CAREER' 상수로 대체)
        await upsertDoc('CAREER_CERT', 'CAREER-' + custId, today, 'careerCertImg', null, 'VALID');

        await connection.commit();
        res.json({ success: true, message: '기사 정보 등록이 완료되었습니다.' });
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

        res.json({
            success: true,
            data: {
                ...busData,
                bizRegImg: fileMap[busData.BIZ_REG_FILE_ID] || null,
                transLicImg: fileMap[busData.TRANS_LIC_FILE_ID] || null,
                insCertImg: fileMap[busData.INS_CERT_FILE_ID] || null,
                vehiclePhotos: photos
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
        const { vehicleNo, modelNm, manufactureYear, mileage, serviceClass, amenities, hasAdas, lastInspectDt, insuranceExpDt } = req.body;
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
                [up.fileId, category, 'LOCAL', up.url, up.originalName, up.ext, up.fileSize, custId, custId]
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
                    [up.fileId, 'BUS_PHOTO', 'LOCAL', up.url, up.originalName, up.ext, up.fileSize, custId, custId]
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
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const custId = uRows[0].CUST_ID;

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
            throw new Error('해당 차종으로 청약 가능한 슬롯이 없거나 이미 청약이 완료되었습니다.');
        }

        const { REQ_BUS_SEQ: reqBusSeq, RES_BUS_AMT: busAmt, REG_ID: travelerId } = reqBusRows[0];
        console.log(`[BID_PROCESS] Selected slot: REQ_BUS_SEQ=${reqBusSeq}, busAmt=${busAmt}`);

        if (!reqBusSeq || reqBusSeq === 0) {
            console.error(`[BID_PROCESS] INVALID REQ_BUS_SEQ: ${reqBusSeq} for REQ_ID: ${reqId}`);
            throw new Error('청약 데이터 오류가 발생했습니다. (SEQ=0)');
        }

        // 3. TB_AUCTION_REQ_BUS 상태 업데이트 (BIDDING) - 원자적 상태 체크 추가
        const [updateResult] = await connection.execute(
            `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'BIDDING', MOD_ID = ?, MOD_DT = NOW() 
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

        // 수수료 계산 (마스터 로직과 동일하게 6.6%, 5.5%, 1.1%)
        const feeTotal = Math.floor(busAmt * 0.066);
        const feeRefund = Math.floor(busAmt * 0.055);
        const feeAttribution = Math.floor(busAmt * 0.011);

        await connection.execute(
            `INSERT INTO TB_BUS_RESERVATION (
                RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, BUS_ID, 
                DRIVER_BIDDING_PRICE, RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                DATA_STAT, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BIDDING', ?, ?)`,
            [resId, reqId, reqBusSeq, travelerId, custId, busId, busAmt, feeTotal, feeRefund, feeAttribution, custId, custId]
        );
        console.log(`[BID_PROCESS] Reservation inserted successfully for resId: ${resId}`);

        // 5. 전체 차량 입찰 완료 여부 확인 및 마스터 상태 업데이트
        const [pendingRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT = "AUCTION"',
            [reqId]
        );

        if (pendingRows[0].count === 0) {
            await connection.execute(
                "UPDATE TB_AUCTION_REQ SET DATA_STAT = 'BIDDING', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?",
                [custId, reqId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: '청약이 성공적으로 제출되었습니다.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Bid submission error:', err);
        res.status(400).json({ success: false, error: err.message });
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
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDt,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d') as endDt,
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
 * [App] 승인 대기 목록 조회
 * 기사가 입찰한 건들 중 아직 여행자가 확정하지 않은(BIDDING 상태) 건들을 조회
 */
router.get('/bids/waiting', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. CUST_ID 조회
        const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d') as startDt,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d') as endDt,
                b.DRIVER_BIDDING_PRICE as price,
                COALESCE(db.SERVICE_CLASS, '차종 미정') as busTypeNm,
                db.MODEL_NM as busModel,
                b.DATA_STAT as status
            FROM TB_BUS_RESERVATION b
            LEFT JOIN TB_AUCTION_REQ r 
                ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db 
                ON b.BUS_ID = db.BUS_ID
            WHERE b.DRIVER_ID = ? AND b.DATA_STAT = 'BIDDING'
            ORDER BY b.REG_DT DESC
        `, [custId]);

        const processedRows = rows.map(row => ({
            ...row,
            endAddr: row.endAddrVia || row.endAddrMaster
        }));

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
             SET DATA_STAT = 'DONE', MOD_DT = NOW(), MOD_ID = ?
             WHERE RES_ID = ? AND DRIVER_ID = ?`,
            [custId, id, custId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '운행 정보를 찾을 수 없거나 권한이 없습니다.' });
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
                DATE_FORMAT(r.START_DT, '%Y/%m/%d') as startDate,
                DATE_FORMAT(r.END_DT, '%Y/%m/%d') as endDate,
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

        // 요금제 업데이트 (TB_DRIVER_DETAIL)
        const [result] = await pool.execute(
            'UPDATE TB_DRIVER_DETAIL SET FEE_POLICY = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
            [feePolicy, custId, custId]
        );

        if (result.affectedRows === 0) {
            // 상세 정보가 없는 경우 신규 생성 (기본값과 함께)
            await pool.execute(
                'INSERT INTO TB_DRIVER_DETAIL (CUST_ID, FEE_POLICY, REG_ID, MOD_ID) VALUES (?, ?, ?, ?)',
                [custId, feePolicy, custId, custId]
            );
        }

        res.json({ success: true, message: '요금제가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('[App Membership Update] Error:', error);
        res.status(500).json({ success: false, error: '요금제 변경 중 오류가 발생했습니다.' });
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

        // 요금제 해지 처리 (FEE_POLICY = 'DRIVER')
        const [result] = await pool.execute(
            'UPDATE TB_DRIVER_DETAIL SET FEE_POLICY = ?, MOD_ID = ?, MOD_DT = NOW() WHERE CUST_ID = ?',
            ['DRIVER', custId, custId]
        );

        if (result.affectedRows === 0) {
            // 상세 정보가 없는 경우 신규 생성
            await pool.execute(
                'INSERT INTO TB_DRIVER_DETAIL (CUST_ID, FEE_POLICY, REG_ID, MOD_ID) VALUES (?, ?, ?, ?)',
                [custId, 'DRIVER', custId, custId]
            );
        }

        res.json({ success: true, message: '멤버십 해지가 완료되었습니다. 다음 결제일부터는 요금이 청구되지 않습니다.' });
    } catch (error) {
        console.error('[App Membership Terminate] Error:', error);
        res.status(500).json({ success: false, error: '멤버십 해지 처리 중 오류가 발생했습니다.' });
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

        // 정책별 금액 매핑
        const policyPrices = {
            'DRIVER_GENERAL': 0,
            'DRIVER_GENNERAL': 0, // DB 오타 대응
            'DRIVER': 0,
            'DRIVER_MIDDLE': 500000,
            'DRIVER_HIGH': 800000
        };

        let nextPaymentDate = null;
        let nextPaymentAmount = 0;

        // 유료 멤버십인 경우에만 다음 결제 정보 생성 (다음 달 1일 결제)
        if (currentPolicy !== 'DRIVER_GENERAL' && currentPolicy !== 'DRIVER_GENNERAL') {
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            nextPaymentDate = `${nextMonth.getMonth() + 1}월 ${nextMonth.getDate()}일`;
            nextPaymentAmount = policyPrices[currentPolicy] || 0;
        }

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

        // 1. 기사 정보 및 CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId } = uRows[0];

        // 2. 예약 정보 확인 (본인 것인지 확인)
        const [resRows] = await connection.execute(
            'SELECT RES_ID, REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ? AND DRIVER_ID = ? AND DATA_STAT = \'CONFIRM\'',
            [resId, custId]
        );
        if (resRows.length === 0) throw new Error('취소 가능한 운행 내역이 아니거나 권한이 없습니다.');
        const { REQ_ID: reqId } = resRows[0];

        // 3. 파일 업로드 처리 (있는 경우)
        let gcsPath = null;
        if (file) {
            const up = await uploadToGCS(file, 'cancels', connection);
            await connection.execute(
                `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_ID, MOD_ID) 
                 VALUES (?, 'CANCEL_DOC', ?, ?, ?, ?, ?, ?, ?)`,
                [up.fileId, 'LOCAL', up.url, up.originalName, up.ext, up.fileSize, custId, custId]
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
        let restrictStat = 'Y';
        let restrictDays = 0;

        if (newCnt === 1) {
            restrictDays = 7;
        } else if (newCnt === 2) {
            restrictDays = 14;
        } else {
            restrictStat = 'P'; // Permanent
        }

        // 5. 상태 업데이트
        // 예약 상태 변경
        await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'DRIVER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE RES_ID = ?', [custId, resId]);

        // 슬롯 상태 변경 (다시 경매로 돌릴지 취소로 할지 고민이나, 여기서는 취소로 처리)
        await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'DRIVER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND BUS_TYPE_CD = (SELECT SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE BUS_ID = (SELECT BUS_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?))', [custId, reqId, resId]);

        // 패널티 적용
        if (restrictStat === 'P') {
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_BUS_DRIVER_CNT = ?, 
                    RESTRICT_STAT = 'P',
                    RESTRICT_END_DT = NULL,
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = NOW(),
                    TRADE_RESTRICT_END_DT = NULL,
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'
            `, [newCnt, custId, custId]);
        } else {
            // 정지 시작일은 익일(내일)부터
            await connection.execute(`
                UPDATE TB_USER_CANCEL_MANAGE 
                SET CANCEL_BUS_DRIVER_CNT = ?, 
                    RESTRICT_STAT = 'Y',
                    RESTRICT_START_DT = DATE_ADD(CURDATE(), INTERVAL 1 DAY),
                    RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL ? + 1 DAY),
                    TRADE_RESTRICT_YN = 'Y',
                    TRADE_RESTRICT_START_DT = DATE_ADD(CURDATE(), INTERVAL 1 DAY),
                    TRADE_RESTRICT_END_DT = DATE_ADD(CURDATE(), INTERVAL ? + 1 DAY),
                    MOD_ID = ?, MOD_DT = NOW()
                WHERE CUST_ID = ? AND USER_TYPE = 'DRIVER'
            `, [newCnt, restrictDays, restrictDays, custId, custId]);
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

        // 2. 예약(입찰) 정보 확인 (본인의 입찰 대기중인 건인지 확인)
        const [resRows] = await connection.execute(
            'SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ? AND DRIVER_ID = ? AND DATA_STAT = \'BIDDING\'',
            [resId, custId]
        );
        if (resRows.length === 0) {
            throw new Error('취소 가능한 청약 내역이 아니거나 이미 확정되어 권한이 없습니다.');
        }
        const { REQ_ID: reqId, REQ_BUS_SEQ: reqBusSeq } = resRows[0];

        // 3. TB_BUS_RESERVATION 상태 변경 (DRIVER_CANCEL)
        await connection.execute(
            'UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'DRIVER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE RES_ID = ?',
            [custId, resId]
        );

        // 4. TB_AUCTION_REQ_BUS 슬롯을 다시 \'AUCTION\' 상태로 돌려놓음 (다른 기사가 입찰할 수 있도록)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'AUCTION\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?',
            [custId, reqId, reqBusSeq]
        );

        // 5. 마스터 TB_AUCTION_REQ 상태도 \'AUCTION\'으로 되돌려놓음 (슬롯 하나가 비었으므로)
        await connection.execute(
            'UPDATE TB_AUCTION_REQ SET DATA_STAT = \'AUCTION\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?',
            [custId, reqId]
        );

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
        const signKey = process.env.INICIS_BILL_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
        
        const timestamp = getTimestamp();
        const oid = `BILL_${custId}_${timestamp}`;
        const price = '0'; // 빌링키 등록 시 가격은 0원

        // signature = SHA256(oid + price + timestamp)
        const signature = sha256(oid + price + timestamp);
        
        // mKey = SHA256(signKey)
        const mKey = sha256(signKey);

        res.json({
            success: true,
            data: {
                mid,
                oid,
                price,
                timestamp,
                signature,
                mKey,
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
        const { authUrl, authToken, mid, merchantData } = req.body;
        console.log('[Inicis Bill Return] Params Received:', { authUrl, authToken, mid, merchantData });

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
        console.log('[Inicis Bill Return] Approving at URL:', approvalUrl);

        const response = await axios.post(approvalUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const resultMap = response.data;
        console.log('[Inicis Bill Return] Approval Response:', resultMap);

        const resultCode = String(resultMap.resultCode || '');
        const resultMsg = String(resultMap.resultMsg || '인증 실패');

        if (resultCode === '0000') {
            const billKey = resultMap.CARD_BillKey;
            const cardNum = resultMap.cardNum || resultMap.CARD_Num || '';
            const cardName = resultMap.cardName || resultMap.CARD_Name || '신용카드';

            if (!billKey) {
                return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent('발급된 빌링키가 존재하지 않습니다.'));
            }

            // 3. 카드 등록 모듈 호출 (registerBusDriverPaymentCard)
            // 빌링키가 있으므로 빌링모드로 자동 동작
            const registerResult = await registerBusDriverPaymentCard(pool, {
                rawDriverId: custId,
                billKey,
                panDigits: cardNum,
                cardNickname,
                originalCardName: cardName,
                setAsDefault: true
            });

            console.log('[Inicis Bill Return] Card registered successfully:', registerResult);
            return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=success');
        } else {
            console.error('[Inicis Bill Return] Approval Failed:', resultMsg);
            return res.redirect(`https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=${encodeURIComponent(resultMsg)}`);
        }
    } catch (err) {
        console.error('[Inicis Bill Return] Critical Error:', err);
        return res.redirect('https://bustaams.cafe24.com/membership-card-mgmt?status=fail&msg=' + encodeURIComponent(err.message || '알 수 없는 서버 에러'));
    }
});

module.exports = router;


