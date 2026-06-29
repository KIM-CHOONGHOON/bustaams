const { pool } = require('./db');

async function createTable() {
    try {
        console.log('📡 Cafe24 DB 연결 및 테이블 생성 시도 중...');
        const createQuery = `
            CREATE TABLE IF NOT EXISTS TB_BUS_PENALTY_DEPOSIT (
              YYYYMMDD varchar(8) NOT NULL COMMENT '년월일(YYYYMMDD)',
              RES_ID varchar(10) NOT NULL COMMENT '예약 요청정보 키값',
              DATA_STAT enum('DONE', 'TRAVELER_CANCEL', 'DRIVER_CANCEL') NOT NULL COMMENT '예약 완료/취소 상태',
              PENALTY_DEPOSIT_YN char(1) NOT NULL DEFAULT 'N' COMMENT '위약금 입금 여부(Y/N)',
              PENALTY_DEPOSIT_DT datetime DEFAULT NULL COMMENT '위약금 입금 일자',
              REG_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
              REG_ID varchar(10) DEFAULT NULL COMMENT '등록자 ID',
              MOD_DT datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
              MOD_ID varchar(10) DEFAULT NULL COMMENT '수정자 ID',
              PRIMARY KEY (YYYYMMDD, RES_ID),
              KEY IDX_BUS_PENALTY_RES_ID (RES_ID),
              KEY IDX_BUS_PENALTY_DATA_STAT (DATA_STAT),
              KEY IDX_BUS_PENALTY_DEPOSIT_YN (PENALTY_DEPOSIT_YN)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='예약 완료/취소 위약금 입금 관리';
        `;
        
        await pool.execute(createQuery);
        console.log('✅ TB_BUS_PENALTY_DEPOSIT 테이블 생성 완료!');
    } catch (e) {
        console.error('❌ 테이블 생성 오류:', e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createTable();
