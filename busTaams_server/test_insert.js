const { pool, getNextId } = require('./db');

async function test() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = '1000000001'; 
        const startAddr = 'Test Start';
        const endAddr = 'Test End';
        const startDt = '2026-04-22T08:00';
        const endDt = '2026-04-22T18:00';
        const passengerCnt = 20;
        const totalReqAmt = 100000;
        const tripTitle = 'Test Title';
        
        const reqId = await getNextId('TB_AUCTION_REQ', 'REQ_ID', 10);
        console.log('reqId:', reqId);

        await connection.execute(`
            INSERT INTO TB_AUCTION_REQ (
                REQ_ID, TRAVELER_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                START_DT, END_DT, PASSENGER_CNT, REQ_AMT, DATA_STAT, EXPIRE_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUCTION', DATE_ADD(NOW(), INTERVAL 7 DAY))
        `, [reqId, userId, tripTitle, startAddr, endAddr, startDt, endDt, passengerCnt, totalReqAmt]);
        console.log('Success Master');

        const bus = { busTypeCd: 'NORMAL_45', reqAmt: 100000, tollsAmt: 0, fuelCost: 0 };
        const reqBusSeq = 1;
        await connection.execute(`
            INSERT INTO TB_AUCTION_REQ_BUS (
                REQ_BUS_SEQ, REQ_ID, BUS_TYPE_CD, DATA_STAT, TOLLS_AMT, FUEL_COST
            ) VALUES (?, ?, ?, 'AUCTION', ?, ?)
        `, [reqBusSeq, reqId, bus.busTypeCd, bus.tollsAmt || 0, bus.fuelCost || 0]);

        const vias = [{viaType: 'START_NODE', addr: 'Start'}, {viaType: 'END_NODE', addr: 'End'}];
        for (let i = 0; i < vias.length; i++) {
             const via = vias[i];
             await connection.execute(`
                 INSERT INTO TB_AUCTION_REQ_VIA (
                     REQ_ID, VIA_SEQ, VIA_TYPE, VIA_ADDR
                 ) VALUES (?, ?, ?, ?)
             `, [reqId, i + 1, via.viaType, via.addr]);
         }
        
        console.log('Success all inserts');
        await connection.rollback();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}
test();
