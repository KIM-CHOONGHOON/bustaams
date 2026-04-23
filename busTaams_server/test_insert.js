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
        const reqBusId = await getNextId('TB_AUCTION_REQ_BUS', 'REQ_BUS_ID', 10);
        console.log('reqBusId:', reqBusId);
        await connection.execute(`
            INSERT INTO TB_AUCTION_REQ_BUS (
                REQ_BUS_ID, REQ_ID, BUS_TYPE_CD, DATA_STAT, TOLLS_AMT, FUEL_COST
            ) VALUES (?, ?, ?, 'AUCTION', ?, ?)
        `, [reqBusId, reqId, bus.busTypeCd, bus.tollsAmt || 0, bus.fuelCost || 0]); // Note: in my appCustomer.js I added REQ_BUS_CNT ? WAIT

        const vias = [{viaType: 'START_NODE', addr: 'Start'}, {viaType: 'END_NODE', addr: 'End'}];
        for (let i = 0; i < vias.length; i++) {
             const via = vias[i];
             const viaId = await getNextId('TB_AUCTION_REQ_VIA', 'VIA_ID', 10);
             await connection.execute(`
                 INSERT INTO TB_AUCTION_REQ_VIA (
                     VIA_ID, REQ_ID, VIA_TYPE, VIA_ORD, VIA_ADDR
                 ) VALUES (?, ?, ?, ?, ?)
             `, [viaId, reqId, via.viaType, i + 1, via.addr]);
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
