const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * [공통] 이미지 표시용 프록시 라우트
 * 로컬 파일 시스템을 먼저 탐색하고, 없으면 Cafe24 실서버(https://bustaams.cafe24.com)에서 프록시합니다.
 * ※ Google Cloud Storage는 더 이상 사용하지 않습니다.
 *
 * 동작 순서:
 *   1. rawPath가 https://bustaams.cafe24.com/... 이면 상대 경로(uploads/xxx)로 변환
 *   2. 로컬 디스크(busTaams_server/uploads/...)에 파일이 있으면 로컬에서 스트리밍
 *   3. 없으면 https://bustaams.cafe24.com/{relativePath} 로 프록시 요청
 */
router.get('/display-image', async (req, res) => {
    const { path: rawPath } = req.query;

    if (!rawPath) {
        return res.status(400).send('Image path is required');
    }

    console.log(`[Display Image] Request path: ${rawPath}`);

    try {
        const path = require('path');
        const fs = require('fs');

        // ────────────────────────────────────────────────────────────────
        // STEP 1. rawPath 정규화 → relativePath (uploads/xxx/yyy.jpg 형태)
        // ────────────────────────────────────────────────────────────────
        let relativePath;

        if (rawPath.startsWith('http')) {
            const cafe24Prefix = 'https://bustaams.cafe24.com/';
            if (rawPath.startsWith(cafe24Prefix)) {
                // https://bustaams.cafe24.com/uploads/documents/xxx.jpg → uploads/documents/xxx.jpg
                relativePath = rawPath.substring(cafe24Prefix.length);
                console.log(`[Display Image] Cafe24 absolute URL → relative: ${relativePath}`);
            } else {
                // 완전히 다른 외부 URL은 그대로 프록시
                console.log(`[Display Image] External URL. Proxying directly: ${rawPath}`);
                const extResp = await axios.get(rawPath, { responseType: 'stream', timeout: 10000 });
                res.setHeader('Content-Type', extResp.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                return extResp.data.pipe(res);
            }
        } else {
            // 상대 경로: 맨 앞 슬래시 제거
            relativePath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
        }

        // ────────────────────────────────────────────────────────────────
        // STEP 2. 로컬 디스크 탐색
        //   Cafe24 실서버에 배포 시 로컬 = 실제 파일이므로 먼저 확인
        // ────────────────────────────────────────────────────────────────
        let localFilePath = path.join(__dirname, '..', relativePath);

        // uploads/ 가 붙어있지 않은 경우 한 번 더 시도
        if (!fs.existsSync(localFilePath) || !fs.lstatSync(localFilePath).isFile()) {
            const fallbackPath = path.join(__dirname, '..', 'uploads', relativePath);
            if (fs.existsSync(fallbackPath) && fs.lstatSync(fallbackPath).isFile()) {
                localFilePath = fallbackPath;
            }
        }

        if (fs.existsSync(localFilePath) && fs.lstatSync(localFilePath).isFile()) {
            console.log(`[Display Image] Serving local file: ${localFilePath}`);
            const ext = path.extname(localFilePath).toLowerCase();
            let contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.pdf') contentType = 'application/pdf';
            else if (ext === '.svg') contentType = 'image/svg+xml';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return fs.createReadStream(localFilePath).pipe(res);
        }

        // ────────────────────────────────────────────────────────────────
        // STEP 3. 로컬에 없으면 Cafe24 실서버에서 프록시
        //   uploads/documents/xxx.jpg
        //     → https://bustaams.cafe24.com/uploads/documents/xxx.jpg
        // ────────────────────────────────────────────────────────────────
        const cafe24Url = `https://bustaams.cafe24.com/${relativePath}`;
        console.log(`[Display Image] Local not found. Proxying from Cafe24: ${cafe24Url}`);

        const response = await axios.get(cafe24Url, {
            responseType: 'stream',
            timeout: 10000,
            headers: { 'User-Agent': 'BusTaams-Admin/1.0' }
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return response.data.pipe(res);

    } catch (error) {
        console.error(`[Display Image Error] path="${rawPath}":`, error.message);
        if (!res.headersSent) {
            res.status(404).send('Image not found');
        }
    }
});

/**
 * [공통] 그룹 코드에 따른 상세 코드 목록 조회
 * TB_COMMON_CODE 테이블에서 해당 그룹의 사용 가능한 코드 목록을 반환합니다.
 */
router.get('/codes/:groupCode', async (req, res) => {
    const { groupCode } = req.params;
    const { pool } = require('../db');

    try {
        const [rows] = await pool.execute(
            `SELECT DTL_CD as code, CD_NM_KO as name, CD_DESC as description
             FROM TB_COMMON_CODE 
             WHERE GRP_CD = ? AND USE_YN = 'Y' 
             ORDER BY DISP_ORD ASC`,
            [groupCode]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error(`[Common Codes Error] Group: ${groupCode}, Error:`, error.message);
        res.status(500).json({ success: false, error: '코드 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * [공통] 차량 번호 가입 여부 확인
 * TB_BUS_DRIVER_VEHICLE 테이블에서 해당 차량 번호가 존재하는지 체크합니다.
 */
router.get('/check-vehicle', async (req, res) => {
    const { vehicleNo } = req.query;
    const { pool } = require('../db');

    if (!vehicleNo) {
        return res.status(400).json({ success: false, error: '차량 번호를 입력해주세요.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT VEHICLE_NO FROM TB_BUS_DRIVER_VEHICLE WHERE VEHICLE_NO = ? LIMIT 1`,
            [vehicleNo.trim()]
        );

        const exists = rows.length > 0;

        res.json({
            success: true,
            exists: exists
        });
    } catch (error) {
        console.error(`[Check Vehicle Error] VehicleNo: ${vehicleNo}, Error:`, error.message);
        res.status(500).json({ success: false, error: '차량 번호 조회 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
