const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function createTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS TB_BID (
            BID_UUID BINARY(16) NOT NULL PRIMARY KEY,
            REQ_UUID BINARY(16) NOT NULL,
            DRIVER_UUID BINARY(16) NOT NULL,
            BUS_UUID BINARY(16) NOT NULL,
            BASE_FARE DECIMAL(18, 0) DEFAULT 0,
            TOLL_FEE DECIMAL(18, 0) DEFAULT 0,
            FUEL_FEE DECIMAL(18, 0) DEFAULT 0,
            ROOM_BOARD_FEE DECIMAL(18, 0) DEFAULT 0,
            DRIVER_TIP DECIMAL(18, 0) DEFAULT 0,
            TOTAL_BID_AMT DECIMAL(18, 0) NOT NULL,
            SERVICE_MEMO TEXT,
            BID_STAT ENUM('SUBMITTED', 'SELECTED', 'FAILED') DEFAULT 'SUBMITTED',
            REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
            REG_ID  VARCHAR(30) COMMENT '등록자 ID',
            MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
            MOD_ID  VARCHAR(30) COMMENT '수정자 ID'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='기사 실시간 입찰 제안서';
    `;
    
    try {
        console.log('Creating TB_BID table...');
        await pool.execute(sql);
        console.log('TB_BID table created or already exists.');
        
        // Add foreign keys separately for safety
        try {
            await pool.execute('ALTER TABLE TB_BID ADD CONSTRAINT FK_BID_REQ FOREIGN KEY (REQ_UUID) REFERENCES TB_AUCTION_REQ (REQ_UUID)');
            await pool.execute('ALTER TABLE TB_BID ADD CONSTRAINT FK_BID_DRIVER FOREIGN KEY (DRIVER_UUID) REFERENCES TB_USER (USER_UUID)');
            await pool.execute('ALTER TABLE TB_BID ADD CONSTRAINT FK_BID_BUS FOREIGN KEY (BUS_UUID) REFERENCES TB_DRIVER_BUS (BUS_UUID)');
            console.log('Foreign keys added.');
        } catch (fkError) {
            console.log('Foreign keys might already exist or referenced tables are different:', fkError.message);
        }
        
    } catch (err) {
        console.error('Error creating TB_BID table:', err);
    } finally {
        await pool.end();
    }
}

createTable();
