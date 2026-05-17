const { pool } = require('./db');

async function updateTable() {
    const dropSql = `DROP TABLE IF EXISTS TB_USER_DEVICE_TOKEN;`;
    
    const createSql = `
    CREATE TABLE TB_USER_DEVICE_TOKEN (
      CUST_ID varchar(10) NOT NULL,
      FCM_TOKEN varchar(512) NOT NULL,
      CLIENT_KIND varchar(20) NOT NULL DEFAULT 'mobile' COMMENT 'mobile, tablet, desktop 중 하나',
      REG_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '이력 등록 일시',
      REG_ID varchar(10) DEFAULT NULL COMMENT '등록자 ID',
      MOD_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '이력 수정 일시',
      MOD_ID varchar(10) DEFAULT NULL COMMENT '수정자 ID',
      PRIMARY KEY (CUST_ID, CLIENT_KIND),
      UNIQUE KEY UK_USER_FCM_TOKEN (FCM_TOKEN(256)),
      KEY IDX_USER_DEVICE_UPD (CUST_ID, MOD_DT)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='FCM 기기 토큰 (1인당 기기별 1대 제한)';
    `;

    try {
        console.log('Dropping existing table...');
        await pool.execute(dropSql);
        console.log('Creating new table...');
        await pool.execute(createSql);
        console.log('✅ TB_USER_DEVICE_TOKEN table updated successfully to new schema.');
    } catch (err) {
        console.error('❌ Error updating table:', err);
    } finally {
        process.exit();
    }
}

updateTable();
