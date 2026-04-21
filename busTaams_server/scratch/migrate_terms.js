const { pool } = require('../db');

async function migrate() {
    try {
        console.log('Dropping existing TB_USER_TERMS_HIST...');
        await pool.execute('DROP TABLE IF EXISTS TB_USER_TERMS_HIST');
        
        console.log('Creating new TB_USER_TERMS_HIST...');
        const createTableSql = `
            CREATE TABLE \`TB_USER_TERMS_HIST\` (
              \`USER_ID\` varchar(10) NOT NULL,
              \`TERMS_HIST_SEQ\` int NOT NULL,
              \`TERMS_TYPE\` enum('SERVICE','PRIVACY','MARKETING','PARTNER_CONTRACT') NOT NULL COMMENT '약관 종류',
              \`TERMS_VER\` varchar(10) NOT NULL,
              \`AGREE_YN\` enum('Y','N') DEFAULT 'Y',
              \`MKT_SMS_YN\` enum('Y','N') DEFAULT 'N',
              \`MKT_PUSH_YN\` enum('Y','N') DEFAULT 'N',
              \`MKT_EMAIL_YN\` enum('Y','N') DEFAULT 'N',
              \`MKT_TEL_YN\` enum('Y','N') DEFAULT 'N',
              \`SIGN_FILE_ID\` varchar(20) DEFAULT NULL,
              \`AGREE_DT\` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`USER_ID\`,\`TERMS_HIST_SEQ\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원 약관 동의 및 서명 관리'
        `;
        await pool.execute(createTableSql);
        
        console.log('✅ TABLE TB_USER_TERMS_HIST RECREATED SUCCESSFULLY.');
    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err);
    } finally {
        process.exit();
    }
}

migrate();
