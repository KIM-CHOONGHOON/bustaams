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
const uploadToGCS = async (file, folder) => {
    if (!file) return null;
    const ext = path.extname(file.originalname).replace('.', '') || 'png';
    const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
    const gcsFileName = `${folder}/${fileId}.${ext}`;
    const gcsFile = bucket.file(gcsFileName);

    await gcsFile.save(file.buffer, {
        metadata: { contentType: file.mimetype }
    });

    return {
        fileId,
        url: `https://storage.googleapis.com/${bucketName}/${gcsFileName}`,
        ext,
        originalName: file.originalname
    };
};

// [APP] 기사 프로필 상세 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [userRows] = await pool.execute(
            `SELECT USER_NM, HP_NO, RESIDENT_NO_ENC, PROFILE_IMG_PATH FROM TB_USER WHERE USER_ID = ?`,
            [userId]
        );

        if (userRows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

        const [detailRows] = await pool.execute(
            'SELECT ZIPCODE as zipcode, ADDRESS as address, DETAIL_ADDRESS as detailAddress FROM TB_DRIVER_DETAIL WHERE USER_ID = ?',
            [userId]
        );

        const [docRows] = await pool.execute(
            `SELECT DOC_TYPE, LICENSE_TYPE_CD, DOC_NO_ENC, DATE_FORMAT(ISSUE_DT, '%Y-%m-%d') as issueDt, INFO_STAT_CD, FILE_PATH
             FROM TB_DRIVER_DOCS WHERE USER_ID = ? ORDER BY REG_DT DESC`,
            [userId]
        );

        const userData = userRows[0];
        const driverData = {
            ...(detailRows.length > 0 ? detailRows[0] : {}),
            residentNo: userData.RESIDENT_NO_ENC ? decrypt(userData.RESIDENT_NO_ENC) : '',
            profileImg: userData.PROFILE_IMG_PATH
        };

        for (const doc of docRows) {
            if (doc.DOC_TYPE === 'LICENSE' && !driverData.licenseNo) {
                driverData.licenseType = doc.LICENSE_TYPE_CD;
                driverData.licenseNo = doc.DOC_NO_ENC ? decrypt(doc.DOC_NO_ENC) : '';
                driverData.licenseIssueDt = doc.issueDt;
                driverData.licenseImg = doc.FILE_PATH;
            } else if (doc.DOC_TYPE === 'QUALIFICATION' && !driverData.busLicenseNo) {
                driverData.busLicenseNo = doc.DOC_NO_ENC ? decrypt(doc.DOC_NO_ENC) : '';
                driverData.qualAcquisitionDt = doc.issueDt;
                driverData.busLicenseImg = doc.FILE_PATH;
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
        console.error(err);
        res.status(500).json({ error: '기사 프로필 조회 중 오류 발생' });
    }
});

// [APP] 기사 프로필 업데이트
router.post('/profile/update', authenticateToken, memoryUpload.fields([
    { name: 'profileImg', maxCount: 1 },
    { name: 'licenseImg', maxCount: 1 },
    { name: 'busLicenseImg', maxCount: 1 }
]), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { 
            name, phone, residentNo, zipcode, address, detailAddress, 
            licenseType, licenseNo, licenseIssueDt, licenseValidity,
            busLicenseNo, qualAcquisitionDt, qualStatus
        } = req.body;
        
        const userId = req.user.userId;

        // 0. CUST_ID 및 기존 PROFILE_FILE_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID, PROFILE_FILE_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        if (uRows.length === 0) throw new Error('사용자를 찾을 수 없습니다.');
        const { CUST_ID: custId, PROFILE_FILE_ID: existingProfileFileId } = uRows[0];

        // [공통] 파일 업로드 및 DB 처리 함수
        const processFileUpload = async (fileKey, category, existingFileId = null) => {
            const file = req.files && req.files[fileKey] ? req.files[fileKey][0] : null;
            if (!file) return existingFileId;

            const uploadResult = await uploadToGCS(file, 'drivers');
            const { fileId, url, ext, originalName } = uploadResult;

            if (existingFileId) {
                // 기존 파일 정보가 있으면 수정 (MOD_ID만 업데이트)
                await connection.execute(
                    `UPDATE TB_FILE_MASTER SET GCS_PATH = ?, ORG_FILE_NM = ?, FILE_EXT = ?, MOD_ID = ?, MOD_DT = NOW() WHERE FILE_ID = ?`,
                    [url, originalName, ext, custId, existingFileId]
                );
                return existingFileId;
            } else {
                // 기존 파일 정보가 없으면 신규 등록 (REG_ID, MOD_ID 모두 설정)
                await connection.execute(
                    `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [fileId, category, bucketName, url, originalName, ext, custId, custId]
                );
                return fileId;
            }
        };

        // 1. 프로필 이미지 처리
        const profileFileId = await processFileUpload('profileImg', 'DRIVER_PROFILE', existingProfileFileId);
        const [profileRows] = await connection.execute('SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = ?', [profileFileId]);
        const profileImgUrl = profileRows.length > 0 ? profileRows[0].GCS_PATH : null;

        // 2. TB_USER 업데이트
        await connection.execute(
            'UPDATE TB_USER SET USER_NM = ?, HP_NO = ?, RESIDENT_NO_ENC = ?, PROFILE_IMG_PATH = ?, PROFILE_FILE_ID = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
            [name, phone, encrypt(residentNo), profileImgUrl, profileFileId, custId, userId]
        );

        // 3. TB_DRIVER_DETAIL 업데이트
        const [existsDetail] = await connection.execute('SELECT 1 FROM TB_DRIVER_DETAIL WHERE USER_ID = ?', [userId]);
        if (existsDetail.length > 0) {
            await connection.execute(
                'UPDATE TB_DRIVER_DETAIL SET ZIPCODE = ?, ADDRESS = ?, DETAIL_ADDRESS = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
                [zipcode, address, detailAddress, custId, userId]
            );
        } else {
            await connection.execute(
                'INSERT INTO TB_DRIVER_DETAIL (USER_ID, ZIPCODE, ADDRESS, DETAIL_ADDRESS, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, zipcode, address, detailAddress, custId, custId]
            );
        }

        // 4. TB_DRIVER_DOCS 처리 유틸
        const upsertDoc = async (type, no, dt, fileKey, licType = null, status = 'WAITING') => {
            if (!no && (!req.files || !req.files[fileKey])) return;
            
            // 기존 문서 정보 조회
            const [docRows] = await connection.execute('SELECT FILE_ID, FILE_PATH FROM TB_DRIVER_DOCS WHERE USER_ID = ? AND DOC_TYPE = ?', [userId, type]);
            const existingDocFileId = docRows.length > 0 ? docRows[0].FILE_ID : null;
            let currentPath = docRows.length > 0 ? docRows[0].FILE_PATH : null;
            
            const fileId = await processFileUpload(fileKey, `DRIVER_${type}`, existingDocFileId);
            if (fileId) {
                const [fRows] = await connection.execute('SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = ?', [fileId]);
                if (fRows.length > 0) currentPath = fRows[0].GCS_PATH;
            }
            
            if (docRows.length > 0) {
                await connection.execute(
                    `UPDATE TB_DRIVER_DOCS SET DOC_NO_ENC = ?, ISSUE_DT = ?, FILE_PATH = ?, FILE_ID = ?, LICENSE_TYPE_CD = ?, INFO_STAT_CD = ?, MOD_ID = ?, MOD_DT = NOW() 
                     WHERE USER_ID = ? AND DOC_TYPE = ?`,
                    [encrypt(no), dt, currentPath, fileId, licType, status, custId, userId, type]
                );
            } else {
                await connection.execute(
                    `INSERT INTO TB_DRIVER_DOCS (USER_ID, DOC_TYPE, LICENSE_TYPE_CD, DOC_NO_ENC, ISSUE_DT, FILE_PATH, FILE_ID, INFO_STAT_CD, REG_ID, MOD_ID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, type, licType, encrypt(no), dt, currentPath, fileId, status, custId, custId]
                );
            }
        };

        await upsertDoc('LICENSE', licenseNo, licenseIssueDt, 'licenseImg', licenseType, licenseValidity === 'Y' ? 'VALID' : 'EXPIRED');
        await upsertDoc('QUALIFICATION', busLicenseNo, qualAcquisitionDt, 'busLicenseImg', null, qualStatus || 'ACTIVE');

        await connection.commit();
        res.json({ success: true, message: '프로필 업데이트가 완료되었습니다.' });
    } finally {
        connection.release();
    }
});

// [APP] 버스 상세 정보 조회
router.get('/bus/detail', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [busRows] = await pool.execute(
            `SELECT * FROM TB_BUS_DRIVER_VEHICLE WHERE USER_ID = ? ORDER BY REG_DT DESC LIMIT 1`,
            [userId]
        );

        if (busRows.length === 0) {
            return res.json({ success: true, data: null });
        }

        const bus = busRows[0];
        
        const getFilePath = async (fileId) => {
            if (!fileId) return null;
            const [rows] = await pool.execute(`SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID = ?`, [fileId]);
            return rows.length > 0 ? rows[0].GCS_PATH : null;
        };

        const bizRegFilePath = await getFilePath(bus.BIZ_REG_FILE_ID);
        const transLicFilePath = await getFilePath(bus.TRANS_LIC_FILE_ID);
        const insCertFilePath = await getFilePath(bus.INS_CERT_FILE_ID);

        const vehiclePhotoPaths = [];
        if (bus.VEHICLE_PHOTOS_JSON) {
            let ids = [];
            try {
                ids = typeof bus.VEHICLE_PHOTOS_JSON === 'string' ? JSON.parse(bus.VEHICLE_PHOTOS_JSON) : bus.VEHICLE_PHOTOS_JSON;
            } catch (e) {}
            if (Array.isArray(ids)) {
                for (const id of ids) {
                    const path = await getFilePath(id);
                    if (path) vehiclePhotoPaths.push(path);
                }
            }
        }

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
                bizRegFile: bizRegFilePath,
                transLicFile: transLicFilePath,
                insCertFile: insCertFilePath,
                vehiclePhotos: vehiclePhotoPaths
            }
        });
    } catch (err) {
        console.error('Fetch bus detail error:', err);
        res.status(500).json({ error: '버스 정보 조회 중 오류 발생' });
    }
});

// [APP] 버스 등록 및 수정
router.post('/bus/register', authenticateToken, memoryUpload.fields([
    { name: 'bizRegFile', maxCount: 1 },
    { name: 'transLicFile', maxCount: 1 },
    { name: 'insCertFile', maxCount: 1 },
    { name: 'vehiclePhotos', maxCount: 10 }
]), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { 
            vehicleNo, modelNm, manufactureYear, mileage, serviceClass, 
            amenities, hasAdas, lastInspectDt, insuranceExpDt
        } = req.body;

        const userId = req.user.userId;

        // 0. CUST_ID 조회
        const [uRows] = await connection.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [userId]);
        const custId = uRows.length > 0 ? uRows[0].CUST_ID : userId;

        const [existing] = await connection.execute('SELECT * FROM TB_BUS_DRIVER_VEHICLE WHERE USER_ID = ?', [userId]);
        
        let busId;
        if (existing.length > 0) {
            busId = existing[0].BUS_ID;
        } else {
            busId = await getNextId('TB_BUS_DRIVER_VEHICLE', 'BUS_ID', 10);
        }

        // [공통] 파일 업로드 및 DB 처리 함수
        const processFileUpload = async (file, category, existingFileId = null) => {
            if (!file) return existingFileId;

            const uploadResult = await uploadToGCS(file, 'buses');
            const { fileId, url, ext, originalName } = uploadResult;

            if (existingFileId) {
                await connection.execute(
                    `UPDATE TB_FILE_MASTER SET GCS_PATH = ?, ORG_FILE_NM = ?, FILE_EXT = ?, MOD_ID = ?, MOD_DT = NOW() WHERE FILE_ID = ?`,
                    [url, originalName, ext, custId, existingFileId]
                );
                return existingFileId;
            } else {
                await connection.execute(
                    `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_PATH, ORG_FILE_NM, FILE_EXT, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [fileId, category, url, originalName, ext, custId, custId]
                );
                return fileId;
            }
        };

        const bizRegFile = req.files && req.files['bizRegFile'] ? req.files['bizRegFile'][0] : null;
        const transLicFile = req.files && req.files['transLicFile'] ? req.files['transLicFile'][0] : null;
        const insCertFile = req.files && req.files['insCertFile'] ? req.files['insCertFile'][0] : null;

        const bizRegId = await processFileUpload(bizRegFile, 'BUS_BIZ_REG', existing.length > 0 ? existing[0].BIZ_REG_FILE_ID : null);
        const transLicId = await processFileUpload(transLicFile, 'BUS_TRANS_LIC', existing.length > 0 ? existing[0].TRANS_LIC_FILE_ID : null);
        const insCertId = await processFileUpload(insCertFile, 'BUS_INS_CERT', existing.length > 0 ? existing[0].INS_CERT_FILE_ID : null);

        const photoIds = [];
        let existingPhotoIds = [];
        if (existing.length > 0 && existing[0].VEHICLE_PHOTOS_JSON) {
            try {
                existingPhotoIds = typeof existing[0].VEHICLE_PHOTOS_JSON === 'string' ? JSON.parse(existing[0].VEHICLE_PHOTOS_JSON) : existing[0].VEHICLE_PHOTOS_JSON;
            } catch (e) {}
        }

        const vehiclePhotoFiles = req.files && req.files['vehiclePhotos'] ? req.files['vehiclePhotos'] : [];
        
        // 기존 사진 ID 유지 또는 업데이트 (업로드된 파일 수만큼 처리)
        for (let i = 0; i < vehiclePhotoFiles.length; i++) {
            const file = vehiclePhotoFiles[i];
            const existingId = existingPhotoIds[i] || null;
            const id = await processFileUpload(file, 'BUS_VEHICLE_PHOTO', existingId);
            if (id) photoIds.push(id);
        }
        
        // 업로드되지 않은 기존 사진 ID도 유지 (필요 시)
        if (photoIds.length < existingPhotoIds.length) {
            for (let i = photoIds.length; i < existingPhotoIds.length; i++) {
                photoIds.push(existingPhotoIds[i]);
            }
        }

        const query = existing.length > 0 ? 
            `UPDATE TB_BUS_DRIVER_VEHICLE SET 
                VEHICLE_NO = ?, MODEL_NM = ?, MANUFACTURE_YEAR = ?, MILEAGE = ?, SERVICE_CLASS = ?, 
                AMENITIES = ?, HAS_ADAS = ?, LAST_INSPECT_DT = ?, INSURANCE_EXP_DT = ?, 
                BIZ_REG_FILE_ID = ?, TRANS_LIC_FILE_ID = ?, INS_CERT_FILE_ID = ?, 
                VEHICLE_PHOTOS_JSON = ?, MOD_ID = ?, MOD_DT = CURRENT_TIMESTAMP
             WHERE BUS_ID = ?` :
            `INSERT INTO TB_BUS_DRIVER_VEHICLE (
                BUS_ID, USER_ID, VEHICLE_NO, MODEL_NM, MANUFACTURE_YEAR, MILEAGE, SERVICE_CLASS, 
                AMENITIES, HAS_ADAS, LAST_INSPECT_DT, INSURANCE_EXP_DT, 
                BIZ_REG_FILE_ID, TRANS_LIC_FILE_ID, INS_CERT_FILE_ID, VEHICLE_PHOTOS_JSON, REG_ID, MOD_ID, MOD_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        const params = existing.length > 0 ?
            [vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, JSON.stringify(amenities), hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, bizRegId, transLicId, insCertId, JSON.stringify(photoIds), custId, busId] :
            [busId, userId, vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, JSON.stringify(amenities), hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, bizRegId, transLicId, insCertId, JSON.stringify(photoIds), custId, custId];

        await connection.execute(query, params);

        await connection.commit();
        res.json({ success: true, message: '버스가 성공적으로 등록되었습니다.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Bus registration error:', err);
        res.status(500).json({ error: '버스 등록 중 오류 발생: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

