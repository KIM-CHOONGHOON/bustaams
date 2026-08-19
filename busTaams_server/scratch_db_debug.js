const { pool } = require('./db');
async function test() {
    console.log('🚀 Altering TB_PAYMENT_MASTER.PAY_STATUS enum to include "CANCEL"...');
    try {
        // 1. 컬럼 타입 수정 (CANCEL 추가)
        await pool.execute(`
            ALTER TABLE TB_PAYMENT_MASTER 
            MODIFY COLUMN PAY_STATUS enum('READY','REQ','SUCCESS','FAIL','REQ_RETRY1','REQ_RETRY2','CANCEL') 
            DEFAULT 'READY' 
            COMMENT '결제 상태'
        `);
        console.log('✅ Alter Table SUCCESS!');

        // 2. 잘 적용되었는지 스키마 상세 정보 조회
        const [desc] = await pool.execute(`
            SHOW COLUMNS FROM TB_PAYMENT_MASTER LIKE 'PAY_STATUS'
        `);
        console.log('Column details:', desc);
    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
