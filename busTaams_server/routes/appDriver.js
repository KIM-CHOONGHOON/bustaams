const express = require('express');
const router = express.Router();
const { pool, getNextId, bucket, bucketName } = require('../db');
const { encrypt, decrypt } = require('../crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

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

// GCS 파일 업로드 공통 함수
const uploadToGCS = async (file, folder, connection = null) => {
    if (!file) return null;
    const ext = path.extname(file.originalname).replace('.', '') || 'png';
    const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20, connection);
    const gcsFileName = `${folder}/${fileId}.${ext}`;
    const gcsFile = bucket.file(gcsFileName);

    await gcsFile.save(file.buffer, {
        metadata: { contentType: file.mimetype }
    });

    try {
        await gcsFile.makePublic();
    } catch (e) {
        console.log('GCS makePublic failed:', e.message);
    }

    return {
        fileId,
        url: `https://storage.googleapis.com/${bucketName}/${gcsFileName}`,
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

        // 2. 기사 상세 정보 등록 여부 확인 (TB_DRIVER_DETAIL)
        const [detailRows] = await pool.execute(
            'SELECT 1 FROM TB_DRIVER_DETAIL WHERE USER_ID = ?',
            [userId]
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
            const [listRows] = await pool.execute(
                `SELECT 
                    r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                    DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                    r.REQ_AMT as price,
                    r.REG_DT as regDt,
                    (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                    (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
                 FROM TB_AUCTION_REQ r
                 JOIN TB_AUCTION_REQ_BUS b ON r.REQ_ID = b.REQ_ID
                 WHERE b.BUS_TYPE_CD = ? AND b.DATA_STAT = 'AUCTION' AND r.START_DT >= CURDATE()
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
                auctionList
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

        const [listRows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
                r.REQ_AMT as price,
                r.REG_DT as regDt,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
             FROM TB_AUCTION_REQ r
             JOIN TB_AUCTION_REQ_BUS b ON r.REQ_ID = b.REQ_ID
             WHERE b.BUS_TYPE_CD = ? AND b.DATA_STAT = 'AUCTION' AND r.START_DT >= CURDATE()
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
        
        // 1. 마스터 및 경유지 정보 조회
        const [masterRows] = await pool.execute(
            `SELECT 
                r.REQ_ID as id, r.TRIP_TITLE as title, r.START_ADDR as startAddr, r.END_ADDR as endAddrMaster,
                DATE_FORMAT(r.START_DT, '%Y-%m-%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y-%m-%d %H:%i') as endDate,
                r.PASSENGER_CNT as passengers, r.REQ_AMT as price,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia
             FROM TB_AUCTION_REQ r
             WHERE r.REQ_ID = ?`,
            [id]
        );
        if (masterRows.length === 0) return res.status(404).json({ error: '요청 정보를 찾을 수 없습니다.' });
        const row = masterRows[0];
        const endAddr = row.endAddrVia || row.endAddrMaster;

        // 경로 시퀀스 가공
        const fullPath = [
            { label: '출발지', addr: row.startAddr },
            ...(row.startVia ? row.startVia.split(',').map(v => ({ label: '출발경유지', addr: v })) : []),
            ...(row.roundTrip ? [{ label: '회차지', addr: row.roundTrip }] : []),
            ...(row.endVia ? row.endVia.split(',').map(v => ({ label: '회차경유지', addr: v })) : []),
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
            'SELECT ZIPCODE as zipcode, ADDRESS as address, DETAIL_ADDRESS as detailAddress, SEX as sex, ADDR_TYPE as addrType, SELF_INTRO as selfIntro, FEE_POLICY as feePolicy FROM TB_DRIVER_DETAIL WHERE USER_ID = ?',
            [userId]
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
            sex, addrType, selfIntro
        } = req.body;
        
        // 주민등록번호 유효성 검증
        if (!validateRRN(residentNo)) {
            throw new Error('유효하지 않은 주민등록번호입니다.');
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
        const [uRows] = await connection.execute('SELECT CUST_ID, PROFILE_FILE_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId, PROFILE_FILE_ID: existingProfileFileId } = uRows[0];

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
            [name, phone, encrypt(residentNo), profileFileId, custId, userId]
        );

        // 2. TB_DRIVER_DETAIL 업데이트 (주소, 성별, 자기소개, 생년월일 등)
        const birthYmd = residentNo.substring(0, 6);
        const [existsDetail] = await connection.execute('SELECT 1 FROM TB_DRIVER_DETAIL WHERE USER_ID = ?', [userId]);
        if (existsDetail.length > 0) {
            await connection.execute(
                'UPDATE TB_DRIVER_DETAIL SET BIRTH_YMD = ?, ZIPCODE = ?, ADDRESS = ?, DETAIL_ADDRESS = ?, SEX = ?, ADDR_TYPE = ?, SELF_INTRO = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
                [birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, custId, userId]
            );
        } else {
            await connection.execute(
                'INSERT INTO TB_DRIVER_DETAIL (USER_ID, BIRTH_YMD, ZIPCODE, ADDRESS, DETAIL_ADDRESS, SEX, ADDR_TYPE, SELF_INTRO, FEE_POLICY, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, birthYmd, zipcode, address, detailAddress, sex, addrType, selfIntro, 'DRIVER_GENNERAL', custId, custId]
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
                // 신규 등록 시 파일 필수 체크
                if (!file) {
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

        // 2. 해당 경매에서 기사의 차종과 일치하는 'AUCTION' 상태의 슬롯 조회
        const [reqBusRows] = await connection.execute(
            `SELECT REQ_BUS_SEQ, RES_BUS_AMT, REG_ID 
             FROM TB_AUCTION_REQ_BUS 
             WHERE REQ_ID = ? AND BUS_TYPE_CD = ? AND DATA_STAT = 'AUCTION' 
             LIMIT 1`,
            [reqId, serviceClass]
        );

        if (reqBusRows.length === 0) {
            throw new Error('해당 차종으로 입찰 가능한 슬롯이 없거나 이미 입찰이 완료되었습니다.');
        }

        const { REQ_BUS_SEQ: reqBusSeq, RES_BUS_AMT: busAmt, REG_ID: travelerId } = reqBusRows[0];

        // 3. TB_AUCTION_REQ_BUS 상태 업데이트 (BIDDING)
        await connection.execute(
            `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'BIDDING', MOD_ID = ?, MOD_DT = NOW() 
             WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
            [custId, reqId, reqBusSeq]
        );

        // 4. TB_BUS_RESERVATION 등록
        const resId = await getNextId('TB_BUS_RESERVATION', 'RES_ID', 10, connection);
        
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
        res.json({ success: true, message: '입찰이 성공적으로 제출되었습니다.' });

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
                ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db 
                ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
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
                ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db 
                ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
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
        if (uRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const custId = uRows[0].CUST_ID;

        // 2. 상세 정보 및 리뷰 정보 조인 조회
        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddr,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDate,
                b.DRIVER_BIDDING_PRICE as price,
                db.MODEL_NM as model,
                db.VEHICLE_NO as busNumber,
                db.VEHICLE_PHOTOS_JSON as vehiclePhotos,
                u.USER_NM as customerName,
                u.HP_NO as customerPhone,
                u.EMAIL as customerEmail,
                CASE 
                    WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) 
                    WHEN u.USER_IMAGE IS NOT NULL AND u.USER_IMAGE LIKE 'http%' THEN CONCAT('/api/common/display-image?path=', u.USER_IMAGE)
                    WHEN u.USER_IMAGE IS NOT NULL THEN CONCAT('/uploads/profiles/', u.USER_IMAGE)
                    ELSE NULL 
                END as customerImage,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia,
                rev.STAR_RATING as reviewRating,
                rev.COMMENT_TEXT as reviewComment,
                rev.REPLY_TEXT as replyText,
                DATE_FORMAT(rev.REG_DT, '%Y.%m.%d') as reviewDate
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_USER u ON r.TRAVELER_ID COLLATE utf8mb4_unicode_ci = u.CUST_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_TRIP_REVIEW rev ON b.RES_ID = rev.RES_ID
            WHERE TRIM(b.RES_ID) = TRIM(?) AND b.DRIVER_ID = ?
        `, [id, custId]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: '운행 정보를 찾을 수 없습니다.' });

        const row = rows[0];
        const endAddr = row.endAddrVia || row.endAddrMaster;
        
        let image = null;
        if (row.vehiclePhotos) {
            try {
                const photos = JSON.parse(row.vehiclePhotos);
                if (photos && photos.length > 0) image = photos[0].url || photos[0];
            } catch (e) {}
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
            endAddr,
            image,
            breakdown,
            waypoints: [
                { type: 'START', addr: row.startAddr, time: row.startDate || '출발' },
                ...(row.startVia ? row.startVia.split(',').map(v => ({ type: 'START_WAY', addr: v, time: '경유' })) : []),
                ...(row.roundTrip ? [{ type: 'ROUND', addr: row.roundTrip, time: '회차지' }] : []),
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
             WHERE RES_ID = ? AND DRIVER_ID COLLATE utf8mb4_unicode_ci = ?`,
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
            JOIN TB_AUCTION_REQ r ON b.REQ_ID COLLATE utf8mb4_unicode_ci = r.REQ_ID COLLATE utf8mb4_unicode_ci
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID COLLATE utf8mb4_unicode_ci = db.BUS_ID COLLATE utf8mb4_unicode_ci
            WHERE b.DRIVER_ID COLLATE utf8mb4_unicode_ci = ? AND b.DATA_STAT = 'DONE'
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
            'UPDATE TB_DRIVER_DETAIL SET FEE_POLICY = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [feePolicy, custId, userId]
        );

        if (result.affectedRows === 0) {
            // 상세 정보가 없는 경우 신규 생성 (기본값과 함께)
            await pool.execute(
                'INSERT INTO TB_DRIVER_DETAIL (USER_ID, FEE_POLICY, REG_ID, MOD_ID) VALUES (?, ?, ?, ?)',
                [userId, feePolicy, custId, custId]
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

        // 요금제 해지 처리 (기본 요금제로 변경하거나 특정 상태값 업데이트)
        // 여기서는 기본 요금제인 'DRIVER_GENNERAL'로 강제 변경하는 것으로 구현
        const [result] = await pool.execute(
            'UPDATE TB_DRIVER_DETAIL SET FEE_POLICY = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            ['DRIVER_GENNERAL', custId, userId]
        );

        if (result.affectedRows === 0) {
            // 상세 정보가 없는 경우 (이미 일반이거나 정보가 없음)
            return res.json({ success: true, message: '현재 일반 요금제 상태입니다.' });
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

        // 1. 등록된 카드 정보 조회
        const [cards] = await pool.execute(
            'SELECT CARD_SEQ, CARD_NICKNAME, CARD_NO_ENC, EXP_MONTH, EXP_YEAR, IS_PRIMARY FROM TB_PAYMENT_CARD WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?) ORDER BY IS_PRIMARY DESC, CARD_SEQ ASC',
            [userId]
        );

        // 2. 월별 멤버십 이용 및 결제 내역 조회 (최근 12개월)
        const [history] = await pool.execute(
            `SELECT 
                YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT 
             FROM TB_MON_MEMBER 
             WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?)
             ORDER BY YYYYMM DESC 
             LIMIT 12`,
            [userId]
        );

        // 3. 현재 활성화된 요금제 확인하여 다음 결제 정보 계산
        const [detail] = await pool.execute(
            'SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE USER_ID = ?',
            [userId]
        );

        const currentPolicy = detail[0]?.FEE_POLICY || 'DRIVER_GENERAL';

        // 정책별 금액 매핑
        const policyPrices = {
            'DRIVER_GENERAL': 0,
            'DRIVER_MIDDLE': 500000,
            'DRIVER_HIGH': 800000
        };

        let nextPaymentDate = null;
        let nextPaymentAmount = 0;

        // 유료 멤버십인 경우에만 다음 결제 정보 생성 (예: 다음 달 10일 결제 가정)
        if (currentPolicy !== 'DRIVER_GENERAL') {
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
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

module.exports = router;

