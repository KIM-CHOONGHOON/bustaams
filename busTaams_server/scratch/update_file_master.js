const pool = require('../db');

async function updateFileMaster() {
    try {
        console.log('--- Recreating TB_FILE_MASTER ---');
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
        await pool.execute('DROP TABLE IF EXISTS `TB_FILE_MASTER`');
        await pool.execute(`
            CREATE TABLE \`TB_FILE_MASTER\` (
              \`FILE_ID\` varchar(20) NOT NULL COMMENT '파일 고유 식별자 (ID)',
              \`FILE_CATEGORY\` varchar(50) NOT NULL COMMENT '파일 분류 코드',
              \`GCS_BUCKET_NM\` varchar(100) DEFAULT 'bustaams-secure-data' COMMENT 'GCS 버킷명',
              \`GCS_PATH\` varchar(255) NOT NULL COMMENT 'GCS 내 물리적 경로',
              \`ORG_FILE_NM\` varchar(255) DEFAULT NULL COMMENT '원본 파일명',
              \`FILE_EXT\` char(5) DEFAULT 'png' COMMENT '파일 확장자',
              \`FILE_SIZE\` bigint DEFAULT NULL COMMENT '파일 크기 (Byte)',
              \`REG_DT\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
              \`REG_ID\` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
              \`MOD_DT\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
              \`MOD_ID\` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
              PRIMARY KEY (\`FILE_ID\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 파일 마스터 테이블'
        `);
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Success: TB_FILE_MASTER recreated with FILE_ID varchar(20)');
    } catch (err) {
        console.error('❌ Error updating table:', err);
    } finally {
        process.exit();
    }
}

updateFileMaster();
