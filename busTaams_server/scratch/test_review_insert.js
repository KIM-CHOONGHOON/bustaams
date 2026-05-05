const { pool } = require('../db');

async function testInsert() {
    const resUuid = '0000000001';
    const custId = '0000000001';
    const userId = 'oasis';
    const rating = 5;
    const comment = '테스트 리뷰입니다.';

    try {
        console.log('--- Testing Review Insertion ---');
        
        // 1. Get driverId
        const [resRows] = await pool.execute('SELECT DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [resUuid]);
        if (resRows.length === 0) {
            console.error('Reservation not found');
            process.exit(1);
        }
        const driverId = resRows[0].DRIVER_ID;
        console.log('Found Driver ID:', driverId);

        // 2. Get nextSeq
        const [seqRows] = await pool.execute('SELECT COALESCE(MAX(REVIEW_SEQ), 0) + 1 as nextSeq FROM TB_TRIP_REVIEW WHERE RES_ID = ?', [resUuid]);
        const nextSeq = seqRows[0].nextSeq;
        console.log('Next Seq:', nextSeq);

        // 3. Insert
        const [result] = await pool.execute(
            `INSERT INTO TB_TRIP_REVIEW (RES_ID, REVIEW_SEQ, WRITER_ID, DRIVER_ID, STAR_RATING, COMMENT_TEXT, REG_ID, MOD_ID) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [resUuid, nextSeq, custId, driverId, rating, comment, userId, userId]
        );
        console.log('Insert Result:', result);
        
        process.exit(0);
    } catch (err) {
        console.error('Error during test insert:', err);
        process.exit(1);
    }
}

testInsert();
