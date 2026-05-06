const pool = require('../db');

async function diagnose() {
    try {
        console.log('--- 1. TB_AUCTION_REQ_BUS 구조 및 최근 데이터 ---');
        const [busCols] = await pool.execute('DESCRIBE TB_AUCTION_REQ_BUS');
        console.table(busCols);
        const [busRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_BUS ORDER BY REG_DT DESC LIMIT 1');
        console.log('최근 버스 요청 데이터:', JSON.stringify(busRows[0], null, 2));

        console.log('\n--- 2. TB_AUCTION_REQ_VIA 구조 및 최근 데이터 ---');
        const [viaCols] = await pool.execute('DESCRIBE TB_AUCTION_REQ_VIA');
        console.table(viaCols);
        if (busRows.length > 0) {
            const [viaRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_ORD ASC', [busRows[0].REQ_ID]);
            console.log(`REQ_ID [${busRows[0].REQ_ID}] 에 대한 경로 데이터:`);
            console.table(viaRows);
        }

        console.log('\n--- 3. 트리거 확인 ---');
        const [triggers] = await pool.execute('SHOW TRIGGERS');
        console.table(triggers);

    } catch (err) {
        console.error('Diagnosis Error:', err);
    } finally {
        process.exit();
    }
}

diagnose();
