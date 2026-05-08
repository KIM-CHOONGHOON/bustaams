const express = require('express');
const router = express.Router();
const { getBucket, bucketName } = require('../db');

/**
 * [공통] 이미지 표시용 프록시 라우트
 * GCS URL이나 로컬 경로를 받아 이미지를 클라이언트에 전달합니다.
 * @google-cloud/storage SDK를 사용하여 보안 및 성능을 최적화합니다.
 */
router.get('/display-image', async (req, res) => {
    const { path: rawPath } = req.query;

    if (!rawPath) {
        return res.status(400).send('Path is required');
    }

    try {
        let gcsFilePath = '';

        if (rawPath.startsWith('http')) {
            // 1. GCS URL 또는 외부 URL 처리
            const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
            
            if (rawPath.startsWith(urlPrefix)) {
                gcsFilePath = rawPath.replace(urlPrefix, '');
            } else {
                // 외부 URL인 경우 (예: 카카오 프로필 등) 스트리밍 유지
                const axios = require('axios');
                const response = await axios({
                    method: 'get',
                    url: rawPath,
                    responseType: 'stream'
                });
                res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
                return response.data.pipe(res);
            }
        } else {
            // 2. GCS 상대 경로인 경우 (예: VEHICLE_PHOTO/...)
            gcsFilePath = rawPath;
        }

        // GCS에서 파일 가져오기
        const bucket = getBucket();
        const file = bucket.file(gcsFilePath);

        // 파일 존재 여부 확인
        const [exists] = await file.exists();
        if (!exists) {
            // 로컬 파일인지 마지막으로 확인 (호환성 유지)
            const path = require('path');
            const fs = require('fs');
            if (fs.existsSync(rawPath) && !fs.lstatSync(rawPath).isDirectory()) {
                return res.sendFile(rawPath);
            }
            console.warn(`[Display Image] File not found in GCS or Local: ${gcsFilePath}`);
            return res.status(404).send('Image not found');
        }

        // 메타데이터에서 Content-Type 가져오기
        const [metadata] = await file.getMetadata();
        res.setHeader('Content-Type', metadata.contentType || 'image/png');

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
