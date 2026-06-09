const { pool } = require('./db');

// 한글 주석: TB_DRIVER_DOCS 테이블의 DOC_TYPE 컬럼 ENUM 목록에 'BANKBOOK' 추가
async function run() {
    try {
        console.log('[DB ALTER] TB_DRIVER_DOCS.DOC_TYPE ENUM 수정 쿼리 시작...');
        const sql = `ALTER TABLE TB_DRIVER_DOCS MODIFY COLUMN DOC_TYPE ENUM(
            'LICENSE', 'QUALIFICATION', 'APTITUDE', 'BIZ_REG', 'TRANSPORT_PERMIT', 'INSURANCE',
            'DRIVER_PHOTO', 'VEHICLE_PHOTO', 'TERMS_OF_USE', 'PRIVACY_CONSENT', 'MARKETING_CONSENT',
            'DRIVER_CONTRACT', 'TRAVELER_CONTRACT', 'PARTNER_CONTRACT', 'TERMS_INTEGRATED',
            'CAREER_CERT', 'BANKBOOK'
        ) NOT NULL`;
        
        await pool.query(sql);
        console.log('✅ [DB ALTER] 성공적으로 컬럼 ENUM이 갱신되었습니다!');
    } catch (err) {
        console.error('❌ [DB ALTER] 오류 발생:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
