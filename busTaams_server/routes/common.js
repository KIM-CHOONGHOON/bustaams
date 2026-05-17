const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getBucket, bucketName } = require('../db');

/**
 * [공통] 이미지 표시용 프록시 라우트
 * GCS URL이나 로컬 경로를 받아 이미지를 클라이언트에 전달합니다.
 * @google-cloud/storage SDK를 사용하여 보안 및 성능을 최적화합니다.
 */
router.get('/display-image', async (req, res) => {
    const { path: rawPath } = req.query;

    if (!rawPath) {
        return res.status(400).send('Image path is required');
    }

    console.log(`[Display Image] Request path: ${rawPath}`);

    try {
        let gcsFilePath = '';

        if (rawPath.startsWith('http')) {
            // 1. GCS URL 또는 외부 URL 처리
            const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
            
            if (rawPath.startsWith(urlPrefix)) {
                gcsFilePath = rawPath.replace(urlPrefix, '');
                console.log(`[Display Image] GCS URL detected. Stripped path: ${gcsFilePath}`);
            } else {
                console.log(`[Display Image] External URL detected. Proxying: ${rawPath}`);
                const response = await axios.get(rawPath, { responseType: 'stream' });
                res.setHeader('Content-Type', response.headers['content-type']);
                return response.data.pipe(res);
            }
        } else {
            // 2. GCS 상대 경로인 경우
            gcsFilePath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath; // 맨 앞 슬래시 제거
            console.log(`[Display Image] Relative path detected: ${gcsFilePath}`);
        }

        const bucket = getBucket();
        const file = bucket.file(gcsFilePath);

        const [exists] = await file.exists();
        if (!exists) {
            console.error(`[Display Image] FILE NOT FOUND in GCS Bucket: "${bucketName}", Path: "${gcsFilePath}"`);
            // 버킷 내 파일 목록 확인 (디버깅용 - 실제 서비스에선 제외 가능)
            return res.status(404).send('Image not found in storage');
        }

        // 이미지 메타데이터 가져오기
        const [metadata] = await file.getMetadata();
        console.log(`[Display Image] Serving file: ${gcsFilePath}, Type: ${metadata.contentType}`);
        
        res.setHeader('Content-Type', metadata.contentType || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600'); 

        // 스트림으로 클라이언트에 전송
        file.createReadStream()
            .on('error', (err) => {
                console.error('[GCS Stream Error]:', err.message);
                if (!res.headersSent) res.status(500).send('Stream error');
            })
            .pipe(res);
    } catch (error) {
        console.error('[Display Image Error]:', error.message);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
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

module.exports = router;
