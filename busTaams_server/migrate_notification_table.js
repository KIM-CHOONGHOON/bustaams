const { pool } = require('./db');

async function createNotificationTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS TB_NOTIFICATION (
      SEQ bigint NOT NULL AUTO_INCREMENT,
      CUST_ID varchar(10) NOT NULL COMMENT '수신자 CUST_ID',
      TITLE varchar(255) NOT NULL,
      BODY text NOT NULL,
      LINK varchar(255) DEFAULT NULL COMMENT '클릭 시 이동할 앱 경로',
      NOTIF_TYPE varchar(50) DEFAULT 'SYSTEM' COMMENT 'CHAT, BID, PAYMENT, SYSTEM 등',
      READ_YN char(1) NOT NULL DEFAULT 'N' COMMENT '읽음 여부 (Y/N)',
      REG_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (SEQ),
      KEY IDX_NOTIF_CUST (CUST_ID, REG_DT)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 알림 내역 센터';
    `;

    try {
        console.log('Creating TB_NOTIFICATION table...');
        await pool.execute(sql);
        console.log('✅ TB_NOTIFICATION table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit();
    }
}

createNotificationTable();
