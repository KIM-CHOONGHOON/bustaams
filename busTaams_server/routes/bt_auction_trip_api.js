const express = require('express');
const { decrypt } = require('../crypto');
const { 
    generateNextNumericId, 
    sendAlimTalkAndLog,
    trimAddress,
    parseDataUrlPayload
} = require('../lib/bt_common_utils');

/**
 * BusTaams 여정 요청 및 경매(입찰) 관련 API
 */
function createAuctionTripRouter(pool, admin, bucket, bucketName) {
    console.log('✅ [INIT] AuctionTripRouter Loaded');
    const router = express.Router();
    const API_BASE = (process.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

    // [GET] 여정 상세 정보 조회 (다양한 패턴 대응)
    const getDetailHandler = async (req, res) => {
        const reqId = req.params.reqId || req.query.reqId;
        const custId = req.query.custId;
        console.log(`\n--------------------------------------------------`);
        console.log(`📡 [BACKEND] 상세 정보 요청 수신! REQ_ID: ${reqId}`);
        console.log(`--------------------------------------------------`);
        
        let connection;
        try {
            connection = await pool.getConnection();
            const [master] = await connection.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            if (master.length === 0) {
                console.log(`❌ [BACKEND] 데이터를 찾을 수 없음: ${reqId}`);
                return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
            }

            const [buses] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? ORDER BY REQ_BUS_SEQ ASC', [reqId]);
            const [vias] = await connection.execute('SELECT VIA_ADDR as address, VIA_SEQ, VIA_TYPE as via_type FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC', [reqId]);

            let bidInfo = null;
            if (custId) {
                const [bid] = await connection.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ?', [reqId, custId]);
                if (bid.length > 0) bidInfo = bid[0];
            }

            res.json({
                ...master[0],
                buses,
                waypoints: vias,
                driverBiddingPrice: bidInfo ? bidInfo.DRIVER_BIDDING_PRICE : 0,
                resId: bidInfo ? bidInfo.RES_ID : null,
                resStat: bidInfo ? bidInfo.DATA_STAT : 'REQ'
            });
        } catch (e) {
            console.error(`❌ [BACKEND] 에러 발생:`, e.message);
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    };

    router.get('/detail', getDetailHandler);
    router.get('/view/:reqId', getDetailHandler);


    // 1. [POST] 여정 견적 요청 저장
    router.post('/request', async (req, res) => {
        let connection;
        try {
            const {
                custId, userId, tripTitle, startAddr, endAddr, startDt, endDt,
                passengerCnt, totalAmount, waypoints, vehicles
            } = req.body;

            console.log('[DEBUG] Reservation Payload:', JSON.stringify(req.body, null, 2));

            if (!custId || !tripTitle || !startAddr || !endAddr || !startDt || !endDt) {
                return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [maxReqRows] = await connection.execute('SELECT MAX(REQ_ID) as maxId FROM TB_AUCTION_REQ');
            const reqId = generateNextNumericId(maxReqRows[0].maxId);
            const secureRegId = String(custId).substring(0, 10);

            // 1-1. TB_AUCTION_REQ (Master)
            const destWp = waypoints && waypoints.find(wp => wp.type === 'ROUND_TRIP' || wp.type === 'END_NODE');
            const targetEndAddr = destWp ? (destWp.address || destWp.addr) : endAddr;

            const masterQuery = `
                INSERT INTO TB_AUCTION_REQ (
                    REQ_ID, TRAVELER_ID, TRIP_TITLE, START_ADDR, END_ADDR, 
                    START_DT, END_DT, PASSENGER_CNT, DATA_STAT, EXPIRE_DT, 
                    REQ_AMT, REG_DT, REG_ID, MOD_DT, MOD_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AUCTION', DATE_SUB(?, INTERVAL 1 DAY), ?, NOW(), ?, NOW(), ?)
            `;
            
            await connection.execute(masterQuery, [
                reqId, custId, tripTitle, trimAddress(startAddr), trimAddress(targetEndAddr),
                startDt, endDt, passengerCnt || 0, startDt, totalAmount || 0, 
                secureRegId, secureRegId
            ]);

            // 1-2. TB_AUCTION_REQ_BUS (Vehicles)
            if (vehicles && vehicles.length > 0) {
                const busQuery = `
                    INSERT INTO TB_AUCTION_REQ_BUS (
                        REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, FUEL_COST, TOLLS_AMT, RES_BUS_AMT,
                        RES_FEE_TOTAL_AMT, RES_FEE_REFUND_AMT, RES_FEE_ATTRIBUTION_AMT,
                        REG_DT, REG_ID, MOD_DT, MOD_ID, DATA_STAT
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, 'AUCTION')
                `;
                
                let busSeq = 1;
                for (const bus of vehicles) {
                    const qty = bus.qty || 0;
                    const price = Number(bus.price) || 0;
                    const fuel = Number(bus.fuelCost) || 0;

                    for (let i = 0; i < qty; i++) {
                        const totalFee = Math.floor(price * 0.066);
                        const refundFee = Math.floor(price * 0.055);
                        const attrFee = totalFee - refundFee;

                        await connection.execute(busQuery, [
                            reqId, busSeq++, bus.type, fuel, 0, price,
                            totalFee, refundFee, attrFee, secureRegId, secureRegId
                        ]);
                    }
                }
            }

            // 1-3. TB_AUCTION_REQ_VIA (Waypoints)
            if (waypoints && waypoints.length > 0) {
                const viaQuery = `
                    INSERT INTO TB_AUCTION_REQ_VIA (
                        REQ_ID, VIA_SEQ, VIA_ADDR, VIA_TYPE, STOP_TIME_MIN, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
                `;
                let viaSeq = 1;
                for (const wp of waypoints) {
                    await connection.execute(viaQuery, [
                        reqId, viaSeq++, wp.address || wp.addr, wp.type || 'START_WAY', 
                        wp.stopTime || 0, secureRegId, secureRegId
                    ]);
                }
            }

            await connection.commit();
            res.status(201).json({ message: '견적 요청이 성공적으로 등록되었습니다.', reqId });

            // [비동기] 알림톡 발송
            (async () => {
                try {
                    const busTypes = vehicles.filter(v => v.qty > 0).map(v => v.type);
                    const [drivers] = await pool.query(`
                        SELECT DISTINCT u.CUST_ID, u.HP_NO 
                        FROM TB_USER u
                        INNER JOIN TB_BUS_DRIVER_VEHICLE v ON u.CUST_ID = v.CUST_ID
                        WHERE v.SERVICE_CLASS IN (?) AND u.USER_TYPE = 'DRIVER' AND u.USER_STAT = 'ACTIVE'
                    `, [busTypes]);

                    for (const d of drivers) {
                        const content = `[busTaams] 신규 견적 요청\n■ 여정: ${tripTitle}\n■ 출발: ${startAddr}\n■ 도착: ${targetEndAddr}\n지금 앱에서 확인하세요!`;
                        await sendAlimTalkAndLog(pool, {
                            reqId, receiverId: d.CUST_ID, receiverPhone: d.HP_NO, content, category: 'REQ_REG'
                        });
                    }
                } catch (e) { console.error('AlimTalk Error:', e); }
            })();

        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // [GET] 최근 견적 요청 조회
    router.get('/recent/:custId', async (req, res) => {
        try {
            const { custId } = req.params;
            const [rows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE TRAVELER_ID = ? ORDER BY REG_DT DESC LIMIT 1', [custId]);
            if (rows.length === 0) return res.json(null);
            const recent = rows[0];
            
            const [buses] = await pool.execute('SELECT BUS_TYPE_CD FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [recent.REQ_ID]);
            recent.vehicles = buses;
            
            const [vias] = await pool.execute('SELECT VIA_ADDR as address, VIA_SEQ, VIA_TYPE as via_type FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC', [recent.REQ_ID]);
            recent.waypoints = vias;
            
            res.json(recent);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // [GET] 사용자의 모든 견적 요청 목록 (대시보드용)
    router.get('/user/:custId', async (req, res) => {
        try {
            const { custId } = req.params;
            const query = `
                SELECT r.REQ_ID, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REQ_AMT,
                    (SELECT GROUP_CONCAT(CONCAT(BUS_TYPE_CD, ':', CAST(COALESCE(RES_BUS_AMT, 0) AS CHAR))) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CANCEL')) as ALL_BUS_TYPES,
                    (SELECT COUNT(*) FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = r.REQ_ID AND DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CANCEL')) as TOTAL_BUS_CNT,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY' ORDER BY VIA_SEQ ASC LIMIT 1) as VIA_START_ADDR,
                    (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' ORDER BY VIA_SEQ ASC LIMIT 1) as VIA_END_ADDR
                FROM TB_AUCTION_REQ r
                WHERE r.TRAVELER_ID = ? AND r.DATA_STAT NOT IN ('DONE', 'TRAVELER_CANCEL') AND r.START_DT > NOW()
                ORDER BY r.REG_DT DESC
            `;
            const [rows] = await pool.execute(query, [custId]);
            
            for (let row of rows) {
                // 주소 정제 (시/도 + 시군구)
                row.START_ADDR_DISP = trimAddress(row.VIA_START_ADDR || row.START_ADDR);
                row.END_ADDR_DISP = trimAddress(row.VIA_END_ADDR || row.END_ADDR);
                
                const [vias] = await pool.execute('SELECT VIA_ADDR as address, VIA_SEQ, VIA_TYPE as via_type FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ ASC', [row.REQ_ID]);
                row.waypoints = vias;
            }
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // [GET] 특정 요청의 버스 목록
    router.get('/req-buses/:reqId', async (req, res) => {
        try {
            const [rows] = await pool.execute('SELECT BUS_TYPE_CD, RES_BUS_AMT as UNIT_REQ_AMT, DATA_STAT as BUS_STAT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'TRAVELER_CANCEL\', \'BUS_CANCEL\')', [req.params.reqId]);
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // 2. [POST] 복합 예약 취소 (Full Cancel)
    router.post('/complex-cancel', async (req, res) => {
        let connection;
        try {
            const { reasonCode, reasonText, fileData, fileName } = req.body;
            const reqId = req.body.reqId || req.body.REQ_ID;
            const custId = req.body.custId || req.body.travelerId || req.body.TRAVELER_ID;

            if (!reqId || !custId) return res.status(400).json({ error: 'reqId and custId are required' });

            connection = await pool.getConnection();
            await connection.beginTransaction();

            let fileId = null;
            if (fileData) {
                const parsed = parseDataUrlPayload(fileData, fileName);
                if (parsed) {
                    const [maxRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
                    fileId = generateNextNumericId(maxRows[0].maxId || '0', 20);
                    const gcsPath = `cancel_docs/${custId}/${fileId}_${parsed.orgName}.${parsed.ext}`;
                    const gcsFile = bucket.file(gcsPath);
                    await gcsFile.save(parsed.buffer, { metadata: { contentType: parsed.mime }, resumable: false });
                    await connection.execute(`
                        INSERT INTO TB_FILE_MASTER (FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT)
                        VALUES (?, 'CANCEL_DOC', ?, ?, ?, ?, ?, NOW())
                    `, [fileId, bucketName, gcsPath, parsed.orgName, parsed.ext, parsed.buffer.length]);
                }
            }

            await connection.execute("UPDATE TB_AUCTION_REQ SET DATA_STAT = 'TRAVELER_CANCEL', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?", [custId, reqId]);
            await connection.execute("UPDATE TB_BUS_RESERVATION SET DATA_STAT = 'TRAVELER_CANCEL', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?", [custId, reqId]);
            await connection.execute("UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'TRAVELER_CANCEL', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?", [custId, reqId]);

            const [maxHist] = await connection.execute('SELECT MAX(HIST_SEQ) as maxSeq FROM TB_USER_CANCEL_HIST WHERE CUST_ID = ?', [custId]);
            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_HIST (CUST_ID, HIST_SEQ, CANCEL_REASON_GRP_CD, CANCEL_REASON_DTL_CD, CANCEL_REASON_TEXT, REASON_DOC_FILE_NM, REG_DT, MOD_DT)
                VALUES (?, ?, 'TRAVELER_CANCEL_REASON', ?, ?, ?, NOW(), NOW())
            `, [custId, (maxHist[0].maxSeq || 0) + 1, reasonCode, reasonText || '', fileId]);

            await connection.execute(`
                INSERT INTO TB_USER_CANCEL_MANAGE (CUST_ID, CANCEL_CNT, CANCEL_TRAVELER_ALL_CNT, REG_ID, MOD_ID, REG_DT, MOD_DT)
                VALUES (?, 1, 1, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE CANCEL_CNT = CANCEL_CNT + 1, CANCEL_TRAVELER_ALL_CNT = CANCEL_TRAVELER_ALL_CNT + 1,
                TRADE_RESTRICT_YN = CASE WHEN (CANCEL_TRAVELER_ALL_CNT + 1) >= 3 THEN 'Y' ELSE TRADE_RESTRICT_YN END, MOD_ID = ?, MOD_DT = NOW()
            `, [custId, custId, custId, custId]);

            await connection.commit();
            res.json({ success: true, message: '예약 취소 완료' });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 3. [POST] 버스 재등록
    router.post('/re-register-bus', async (req, res) => {
        let connection;
        try {
            const { reqId, vehicles, custId } = req.body;
            const secureModId = String(custId || 'SYSTEM').substring(0, 10);

            connection = await pool.getConnection();
            await connection.beginTransaction();

            for (const bus of vehicles) {
                const [seqRows] = await connection.execute('SELECT IFNULL(MAX(REQ_BUS_SEQ), 0) + 1 as nextSeq FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [reqId]);
                await connection.execute(`
                    INSERT INTO TB_AUCTION_REQ_BUS (REQ_ID, REQ_BUS_SEQ, BUS_TYPE_CD, DATA_STAT, RES_BUS_AMT, REG_ID, MOD_ID) 
                    VALUES (?, ?, ?, 'AUCTION', ?, ?, ?)
                `, [reqId, seqRows[0].nextSeq, bus.type, bus.price, secureModId, secureModId]);
            }

            const totalNewAmt = vehicles.reduce((sum, v) => sum + (Number(v.price) * (Number(v.qty) || 1)), 0);
            await connection.execute("UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', REQ_AMT = REQ_AMT + ?, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?", [totalNewAmt, secureModId, reqId]);

            await connection.commit();
            res.json({ message: '버스 재등록 완료' });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 4. [POST] 버스 변경 요청
    router.post('/bus-change', async (req, res) => {
        let connection;
        try {
            const { reqId, reqBusSeq, custId } = req.body;
            const secureModId = String(custId || 'SYSTEM').substring(0, 10);
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [activeBuses] = await connection.execute(
                'SELECT REQ_BUS_SEQ, RES_BUS_AMT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND DATA_STAT NOT IN (\'TRAVELER_CANCEL\', \'BUS_CANCEL\') FOR UPDATE',
                [reqId]
            );
            const busToCancel = activeBuses.find(b => b.REQ_BUS_SEQ === Number(reqBusSeq));
            if (!busToCancel) {
                await connection.rollback();
                return res.status(404).json({ error: '취소할 버스 정보를 찾을 수 없습니다.' });
            }

            const oldBusAmt = busToCancel.RES_BUS_AMT || 0;
            const masterStatusUpdate = activeBuses.length === 1 ? ', DATA_STAT = \'TRAVELER_CANCEL\'' : '';

            await connection.execute(`UPDATE TB_AUCTION_REQ SET BUS_CHANG_CNT = BUS_CHANG_CNT + 1, REQ_AMT = REQ_AMT - ?, MOD_ID = ?, MOD_DT = NOW() ${masterStatusUpdate} WHERE REQ_ID = ?`, [oldBusAmt, secureModId, reqId]);
            await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [secureModId, reqId, reqBusSeq]);
            await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'TRAVELER_CANCEL\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = \'CONFIRM\'', [reqId, reqBusSeq]);

            await connection.commit();
            res.json({ message: '버스 변경 요청 완료' });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 5. [POST] 버스 취소
    router.post('/bus-cancel', async (req, res) => {
        let connection;
        try {
            const { reqId, reqBusSeq, custId } = req.body;
            const secureModId = String(custId || 'SYSTEM').substring(0, 10);
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [busRows] = await connection.execute('SELECT RES_BUS_AMT FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? FOR UPDATE', [reqId, reqBusSeq]);
            if (busRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: '해당 버스 요청을 찾을 수 없습니다.' });
            }

            await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'BUS_CANCEL\', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [secureModId, reqId, reqBusSeq]);
            await connection.execute('UPDATE TB_AUCTION_REQ SET REQ_AMT = REQ_AMT - ?, MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?', [busRows[0].RES_BUS_AMT || 0, secureModId, reqId]);
            await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'BUS_CANCEL\', MOD_DT = NOW() WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = \'CONFIRM\'', [reqId, reqBusSeq]);

            await connection.commit();
            res.json({ message: '버스 취소 완료' });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 4. [GET] 내 여정 기록 조회
    router.get('/history/:custId', async (req, res) => {
        let connection;
        try {
            const { custId } = req.params;
            connection = await pool.getConnection();
            const query = `
                SELECT r.REQ_ID, ab.REQ_BUS_SEQ, r.TRIP_TITLE, r.START_ADDR, r.END_ADDR, r.TRAVELER_ID,
                       r.START_DT, r.END_DT, r.PASSENGER_CNT, r.DATA_STAT, r.REG_DT, ab.BUS_TYPE_CD,
                       ab.RES_BUS_AMT as UNIT_REQ_AMT, ab.DATA_STAT as BUS_STAT,
                       (SELECT res.DATA_STAT FROM TB_BUS_RESERVATION res WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'COMPLETED') THEN 0 ELSE 1 END ASC LIMIT 1) as RES_STAT,
                       (SELECT u.USER_NM FROM TB_BUS_RESERVATION res LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'COMPLETED') THEN 0 ELSE 1 END ASC LIMIT 1) as DRIVER_NM,
                       (SELECT u.PROFILE_FILE_ID FROM TB_BUS_RESERVATION res LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID WHERE res.REQ_ID = r.REQ_ID AND CAST(res.REQ_BUS_SEQ AS UNSIGNED) = CAST(ab.REQ_BUS_SEQ AS UNSIGNED) ORDER BY CASE WHEN res.DATA_STAT IN ('CONFIRM', 'COMPLETED') THEN 0 ELSE 1 END ASC LIMIT 1) as PROFILE_PHOTO_ID
                FROM TB_AUCTION_REQ r
                INNER JOIN TB_AUCTION_REQ_BUS ab ON r.REQ_ID = ab.REQ_ID
                WHERE r.TRAVELER_ID = ? AND r.DATA_STAT NOT IN ('TRAVELER_CANCEL', 'BUS_CHANGE') AND ab.DATA_STAT NOT IN ('BUS_CHANGE', 'TRAVELER_CANCEL', 'BUS_CANCEL')
                ORDER BY r.REG_DT DESC, ab.REQ_BUS_SEQ ASC
            `;
            const [rows] = await connection.execute(query, [custId]);
            for (let row of rows) {
                if (row.DRIVER_NM && row.DRIVER_NM.includes(':')) {
                    try { row.DRIVER_NM = decrypt(row.DRIVER_NM); } catch (e) {}
                }
            }
            res.json(rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });


    // 6. [PUT] 기사 입찰 등록/수정
    router.put('/bid', async (req, res) => {
        let connection;
        try {
            const { reqId, reqBusSeq, custId, bidPrice } = req.body;
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [existing] = await connection.execute('SELECT RES_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ? AND REQ_BUS_SEQ = ?', [reqId, custId, reqBusSeq]);
            
            if (existing.length > 0) {
                await connection.execute('UPDATE TB_BUS_RESERVATION SET DRIVER_BIDDING_PRICE = ?, DATA_STAT = \'BIDDING\', MOD_DT = NOW() WHERE RES_ID = ?', [bidPrice, existing[0].RES_ID]);
            } else {
                const [maxRes] = await connection.execute('SELECT MAX(RES_ID) as maxId FROM TB_BUS_RESERVATION');
                const resId = generateNextNumericId(maxRes[0].maxId, 10);
                await connection.execute(`
                    INSERT INTO TB_BUS_RESERVATION (RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, DRIVER_BIDDING_PRICE, DATA_STAT, REG_DT, REG_ID)
                    SELECT ?, ?, ?, TRAVELER_ID, ?, ?, 'BIDDING', NOW(), ? FROM TB_AUCTION_REQ WHERE REQ_ID = ?
                `, [resId, reqId, reqBusSeq, custId, bidPrice, custId, reqId]);
            }

            await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = \'BIDDING\' WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [reqId, reqBusSeq]);
            await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = \'BIDDING\' WHERE REQ_ID = ?', [reqId]);

            await connection.commit();
            res.json({ success: true });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 7. [PUT] 기사 입찰 취소
    router.put('/bid-cancel', async (req, res) => {
        let connection;
        try {
            const { reqId, custId, reqBusSeq } = req.body;
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [rows] = await connection.execute(
                'SELECT RES_ID FROM TB_BUS_RESERVATION WHERE REQ_ID = ? AND DRIVER_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = \'BIDDING\'',
                [reqId, custId, reqBusSeq]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ error: '취소할 수 있는 입찰 정보를 찾을 수 없습니다.' });
            }

            await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = \'CANCELLATION_OF_BID\', MOD_DT = NOW() WHERE RES_ID = ?', [rows[0].RES_ID]);
            
            await connection.commit();
            res.json({ success: true });
        } catch (e) {
            if (connection) await connection.rollback();
            res.status(500).json({ error: e.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // 8. [GET] 사용자의 확정된 예약 목록 조회
    router.get('/confirmed/:custId', async (req, res) => {
        try {
            const { custId } = req.params;
            const query = `
                SELECT r.REQ_ID, r.TRIP_TITLE, r.START_DT, r.DATA_STAT,
                       b.BUS_TYPE_CD, b.RES_BUS_AMT,
                       res.RES_ID, res.DRIVER_ID, u.USER_NM as DRIVER_NM
                FROM TB_AUCTION_REQ r
                INNER JOIN TB_AUCTION_REQ_BUS b ON r.REQ_ID = b.REQ_ID
                INNER JOIN TB_BUS_RESERVATION res ON b.REQ_ID = res.REQ_ID AND b.REQ_BUS_SEQ = res.REQ_BUS_SEQ
                LEFT JOIN TB_USER u ON res.DRIVER_ID = u.CUST_ID
                WHERE r.TRAVELER_ID = ? AND res.DATA_STAT = 'CONFIRM'
                ORDER BY r.START_DT ASC
            `;
            const [rows] = await pool.execute(query, [custId]);
            for (let row of rows) {
                if (row.DRIVER_NM && row.DRIVER_NM.includes(':')) {
                    try { row.DRIVER_NM = decrypt(row.DRIVER_NM); } catch (e) {}
                }
            }
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
}

module.exports = createAuctionTripRouter;
