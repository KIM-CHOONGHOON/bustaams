const { pool } = require('./db');

async function alterTable() {
    try {
        console.log('📡 Cafe24 DB 연결 및 FEE_POLICY 컬럼 추가 시도 중...');
        const alterQuery = `
            ALTER TABLE TB_BUS_PENALTY_DEPOSIT 
            ADD COLUMN FEE_POLICY varchar(30) DEFAULT NULL COMMENT '기사회원등급코드'
            AFTER PENALTY_DEPOSIT_DT
        `;
        
        await pool.execute(alterQuery);
        console.log('✅ TB_BUS_PENALTY_DEPOSIT 테이블에 FEE_POLICY 컬럼 추가 완료!');
    } catch (e) {
        console.error('❌ 컬럼 추가 오류:', e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

alterTable();
