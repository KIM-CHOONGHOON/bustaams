const express = require('express');
const router = express.Router();
const { pool, getNextId } = require('../db');
const { encrypt, decrypt } = require('../crypto');
const jwt = require('jsonwebtoken');

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
router.post('/profile/update', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { 
            name, phone, residentNo, zipcode, address, detailAddress, 
            licenseType, licenseNo, licenseIssueDt, licenseValidity,
            busLicenseNo, qualAcquisitionDt, qualStatus,
            profileImg, licenseImg, busLicenseImg 
        } = req.body;
        
        const userId = req.user.userId;

        // [추가] TB_FILE_MASTER 등록 함수
        const registerFileInMaster = async (filePath, category) => {
            if (!filePath) return null;
            const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
            
            await connection.execute(
                `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_PATH, ORG_FILE_NM, REG_ID, MOD_ID) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fileId, category, filePath, `${category}_${userId}.png`, userId, userId]
            );
            return fileId;
        };

        // 1. TB_USER 업데이트
        const profileFileId = await registerFileInMaster(profileImg, 'DRIVER_PROFILE');
        await connection.execute(
            'UPDATE TB_USER SET USER_NM = ?, HP_NO = ?, RESIDENT_NO_ENC = ?, PROFILE_IMG_PATH = ?, PROFILE_FILE_ID = ?, MOD_ID = ? WHERE USER_ID = ?',
            [name, phone, encrypt(residentNo), profileImg, profileFileId, userId, userId]
        );

        // 2. TB_DRIVER_DETAIL 업데이트
        const [existsDetail] = await connection.execute('SELECT 1 FROM TB_DRIVER_DETAIL WHERE USER_ID = ?', [userId]);
        if (existsDetail.length > 0) {
            await connection.execute(
                'UPDATE TB_DRIVER_DETAIL SET ZIPCODE = ?, ADDRESS = ?, DETAIL_ADDRESS = ?, MOD_ID = ?, MOD_DT = NOW() WHERE USER_ID = ?',
                [zipcode, address, detailAddress, userId, userId]
            );
        } else {
            await connection.execute(
                'INSERT INTO TB_DRIVER_DETAIL (USER_ID, ZIPCODE, ADDRESS, DETAIL_ADDRESS, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, zipcode, address, detailAddress, userId, userId]
            );
        }

        // 3. TB_DRIVER_DOCS 처리 유틸
        const upsertDoc = async (type, no, dt, path, licType = null, status = 'WAITING') => {
            if (!no) return;
            
            const fileId = await registerFileInMaster(path, `DRIVER_${type}`);
            
            const [exists] = await connection.execute('SELECT 1 FROM TB_DRIVER_DOCS WHERE USER_ID = ? AND DOC_TYPE = ?', [userId, type]);
            if (exists.length > 0) {
                await connection.execute(
                    `UPDATE TB_DRIVER_DOCS SET DOC_NO_ENC = ?, ISSUE_DT = ?, FILE_PATH = ?, FILE_ID = ?, LICENSE_TYPE_CD = ?, INFO_STAT_CD = ?, MOD_ID = ?, MOD_DT = NOW() 
                     WHERE USER_ID = ? AND DOC_TYPE = ?`,
                    [encrypt(no), dt, path, fileId, licType, status, userId, userId, type]
                );
            } else {
                await connection.execute(
                    `INSERT INTO TB_DRIVER_DOCS (USER_ID, DOC_TYPE, LICENSE_TYPE_CD, DOC_NO_ENC, ISSUE_DT, FILE_PATH, FILE_ID, INFO_STAT_CD, REG_ID, MOD_ID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, type, licType, encrypt(no), dt, path, fileId, status, userId, userId]
                );
            }
        };

        await upsertDoc('LICENSE', licenseNo, licenseIssueDt, licenseImg, licenseType, licenseValidity === 'Y' ? 'VALID' : 'EXPIRED');
        await upsertDoc('QUALIFICATION', busLicenseNo, qualAcquisitionDt, busLicenseImg, null, qualStatus || 'ACTIVE');

        await connection.commit();
        res.json({ success: true, message: '프로필 업데이트가 완료되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('App Driver update error:', err);
        res.status(500).json({ error: '기사 정보 업데이트 중 오류 발생' });
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
router.post('/bus/register', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { 
            vehicleNo, modelNm, manufactureYear, mileage, serviceClass, 
            amenities, hasAdas, lastInspectDt, insuranceExpDt,
            bizRegFile, transLicFile, insCertFile, vehiclePhotos 
        } = req.body;

        const userId = req.user.userId;

        const [existing] = await connection.execute('SELECT BUS_ID FROM TB_BUS_DRIVER_VEHICLE WHERE USER_ID = ?', [userId]);
        
        let busId;
        if (existing.length > 0) {
            busId = existing[0].BUS_ID;
        } else {
            busId = await getNextId('TB_BUS_DRIVER_VEHICLE', 'BUS_ID', 10);
        }

        const registerFile = async (filePath, category) => {
            if (!filePath) return null;
            const [existingFile] = await connection.execute('SELECT FILE_ID FROM TB_FILE_MASTER WHERE GCS_PATH = ?', [filePath]);
            if (existingFile.length > 0) return existingFile[0].FILE_ID;

            const fileId = await getNextId('TB_FILE_MASTER', 'FILE_ID', 20);
            await connection.execute(
                `INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_PATH, ORG_FILE_NM, REG_ID, MOD_ID) VALUES (?, ?, ?, ?, ?, ?)`,
                [fileId, category, filePath, `${category}_${userId}.png`, userId, userId]
            );
            return fileId;
        };

        const bizRegId = await registerFile(bizRegFile, 'BUS_BIZ_REG');
        const transLicId = await registerFile(transLicFile, 'BUS_TRANS_LIC');
        const insCertId = await registerFile(insCertFile, 'BUS_INS_CERT');

        const photoIds = [];
        if (Array.isArray(vehiclePhotos)) {
            for (const path of vehiclePhotos) {
                const id = await registerFile(path, 'BUS_VEHICLE_PHOTO');
                if (id) photoIds.push(id);
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
            [vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, JSON.stringify(amenities), hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, bizRegId, transLicId, insCertId, JSON.stringify(photoIds), userId, busId] :
            [busId, userId, vehicleNo, modelNm, manufactureYear, mileage || 0, serviceClass, JSON.stringify(amenities), hasAdas || 'N', lastInspectDt || null, insuranceExpDt || null, bizRegId, transLicId, insCertId, JSON.stringify(photoIds), userId, userId];

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

