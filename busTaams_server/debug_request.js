const { pool } = require('./db');

async function debugRequests() {
    try {
        console.log('--- DEBUG: TB_AUCTION_REQ 현황 ---');
        const [rows] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, TRIP_TITLE, DATA_STAT, REG_DT FROM TB_AUCTION_REQ ORDER BY REG_DT DESC');
        console.log(`총 ${rows.length}건의 요청이 발견되었습니다.`);
        rows.forEach(row => {
            console.log(`[${row.DATA_STAT}] ID: ${row.REQ_ID} | User: ${row.TRAVELER_ID} | Title: ${row.TRIP_TITLE} | Reg: ${row.REG_DT}`);
        });
        
        console.log('\n--- 최근 등록된 1건의 상세 분석 ---');
        if (rows.length > 0) {
            const latest = rows[0];
            console.log(`최근 요청 ID: ${latest.REQ_ID}`);
            // 여기서 해당 사용자의 다른 정보나 상태가 대시보드 쿼리 조건에 부합하는지 눈으로 확인 가능
        }
    } catch (err) {
        console.error('DB 조회 에러:', err);
    } finally {
        process.exit();
    }
}

debugRequests();
