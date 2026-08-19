const { pool } = require('./db');
async function test() {
    console.log('🚀 Altering TB_AUCTION_REQ.PAYMENT_STS to VARCHAR(20)...');
    try {
        await pool.execute(`
            ALTER TABLE TB_AUCTION_REQ 
            MODIFY COLUMN PAYMENT_STS VARCHAR(20) NULL COMMENT '결제 상태'
        `);
        console.log('✅ Alter Table SUCCESS!');

        const [desc] = await pool.execute(`
            SHOW COLUMNS FROM TB_AUCTION_REQ LIKE 'PAYMENT_STS'
        `);
        console.log('Column details:', desc);
    } catch (e) {
        console.error('❌ Error executing query:', e);
    } finally {
        process.exit();
    }
}
test();
