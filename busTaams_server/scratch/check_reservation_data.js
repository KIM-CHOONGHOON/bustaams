const { pool } = require('../db');

async function checkData() {
    try {
        // 1. 전체 요청 상태 확인
        const [reqStats] = await pool.execute('SELECT DATA_STAT, COUNT(*) as cnt FROM TB_AUCTION_REQ GROUP BY DATA_STAT');
        console.log('--- TB_AUCTION_REQ Stats ---');
        console.table(reqStats);
        
        // 2. 전체 입찰 상태 확인
        const [resStats] = await pool.execute('SELECT DATA_STAT, COUNT(*) as cnt FROM TB_BUS_RESERVATION GROUP BY DATA_STAT');
        console.log('--- TB_BUS_RESERVATION Stats ---');
        console.table(resStats);
        
        // 3. CONFIRM된 예약이 있는지 확인
        const [confirms] = await pool.execute(`
            SELECT 
                r.REQ_ID, r.TRAVELER_ID, r.DATA_STAT as reqStat, res.DATA_STAT as resStat
            FROM TB_AUCTION_REQ r
            JOIN TB_BUS_RESERVATION res ON r.REQ_ID = res.REQ_ID
            WHERE res.DATA_STAT = 'CONFIRM'
        `);
        console.log('--- CONFIRMED Reservations ---');
        console.table(confirms);
        
        // 4. 특정 사용자의 데이터가 있는지 확인 (사용자 ID를 모를 경우 최근 데이터 확인)
        const [recent] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ ORDER BY REG_DT DESC LIMIT 5');
        console.log('--- RECENT Requests ---');
        console.table(recent);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
