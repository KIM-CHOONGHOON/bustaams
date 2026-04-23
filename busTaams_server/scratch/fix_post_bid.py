import sys
import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

post_bid_old = """// [추가] 기사: 실시간 입찰 제안 제출 (TB_BUS_RESERVATION 사용)
app.post('/api/driver/bid', authenticateToken, async (req, res) => {
    try {
        let { reqId, busId, baseFare, tollFee, fuelFee, roomBoardFee, driverTip, serviceMemo } = req.body;
        
        if (!reqId || baseFare === undefined) {
            return res.status(400).json({ error: '필수 항목(기본요금 등)이 누락되었습니다.' });
        }

        const userId = req.user.userId;

        // 만약 busId가 제공되지 않았다면, 기사의 첫 번째 등록된 차량을 사용
        if (!busId) {
            const [busRows] = await pool.execute(
                `SELECT BUS_ID as busId FROM TB_BUS_DRIVER_VEHICLE WHERE CUST_ID = (SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?) LIMIT 1`,
                [userId]
            );
                );
                if (newBusRows.length > 0) {
                    busUuid = newBusRows[0].busUuid;
                } else {
                    return res.status(400).json({ error: '등록된 차량이 없습니다. 차량 정보를 먼저 등록해주세요.' });
                }
            } else {
                busUuid = busRows[0].busUuid;
            }
        }

        const bidUuid = randomUUID();
        const bidUuidBuf = uuidToBuffer(bidUuid);
        const reqUuidBuf = uuidToBuffer(reqUuid);
        const busUuidBuf = uuidToBuffer(busUuid);

        // [중요] 외래키 제약 조건 충족을 위해 TB_DRIVER_BUS에 레코드가 있는지 확인하고 없다면 생성
        const [vInfo] = await pool.execute(
            `SELECT VEHICLE_NO, MODEL_NM, SERVICE_CLASS FROM TB_BUS_DRIVER_VEHICLE WHERE BUS_ID = ?`,
            [busUuidBuf]
        );
        
        // 총 입찰 금액 계산 (NaN 방지)
        const totalBidAmt = Number(baseFare || 0) + Number(tollFee || 0) + Number(fuelFee || 0) + Number(roomBoardFee || 0) + Number(driverTip || 0);
        
        if (isNaN(totalBidAmt)) {
            return res.status(400).json({ error: '금액 형식이 올바르지 않습니다.' });
        }

        const sql = `
            INSERT INTO TB_BID (
                BID_UUID, REQ_UUID, DRIVER_UUID, BUS_UUID, 
                BASE_FARE, TOLL_FEE, FUEL_FEE, ROOM_BOARD_FEE, DRIVER_TIP, 
                TOTAL_BID_AMT, SERVICE_MEMO, BID_STAT, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?)
        `;

        await pool.execute(sql, [
            bidUuidBuf, reqUuidBuf, userUuidBuf, busUuidBuf,
            Number(baseFare || 0), Number(tollFee || 0), Number(fuelFee || 0), Number(roomBoardFee || 0), Number(driverTip || 0),
            totalBidAmt, serviceMemo || '', userId, userId
        ]);

        res.status(201).json({ success: true, message: '입찰 제안이 성공적으로 제출되었습니다.', bidUuid });
    } catch (err) {"""

post_bid_new = """// [추가] 기사: 실시간 입찰 제안 제출 (TB_BUS_RESERVATION 사용)
app.post('/api/driver/bid', authenticateToken, async (req, res) => {
    try {
        let { reqId, busId, baseFare, tollFee, fuelFee, roomBoardFee, driverTip, serviceMemo } = req.body;
        
        if (!reqId || baseFare === undefined) {
            return res.status(400).json({ error: '필수 항목(기본요금 등)이 누락되었습니다.' });
        }

        const userId = req.user.userId;

        // 만약 busId가 제공되지 않았다면, 기사의 첫 번째 등록된 차량을 사용
        if (!busId) {
            const [busRows] = await pool.execute(
                `SELECT v.BUS_ID as busId FROM TB_BUS_DRIVER_VEHICLE v JOIN TB_USER u ON v.CUST_ID = u.CUST_ID WHERE u.USER_ID = ? LIMIT 1`,
                [userId]
            );
            if (busRows.length > 0) {
                busId = busRows[0].busId;
            } else {
                return res.status(400).json({ error: '등록된 차량이 없습니다. 차량 정보를 먼저 등록해주세요.' });
            }
        }
        
        // 총 입찰 금액 계산 (NaN 방지)
        const totalBidAmt = Number(baseFare || 0) + Number(tollFee || 0) + Number(fuelFee || 0) + Number(roomBoardFee || 0) + Number(driverTip || 0);
        
        if (isNaN(totalBidAmt)) {
            return res.status(400).json({ error: '금액 형식이 올바르지 않습니다.' });
        }

        // TB_BUS_RESERVATION 에 데이터 삽입
        const sql = `
            INSERT INTO TB_BUS_RESERVATION (
                REQ_ID, DRIVER_ID, BUS_ID, 
                DRIVER_BIDDING_PRICE, DATA_STAT, REG_ID, MOD_ID
            ) VALUES (?, ?, ?, ?, 'BIDDING', ?, ?)
        `;

        await pool.execute(sql, [
            reqId, userId, busId,
            totalBidAmt, userId, userId
        ]);

        res.status(201).json({ success: true, message: '입찰 제안이 성공적으로 제출되었습니다.' });
    } catch (err) {"""

content = content.replace(post_bid_old, post_bid_new)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
