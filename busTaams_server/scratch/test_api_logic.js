const mysql = require('mysql2/promise');

async function testApiLogic(idParam, custId) {
    const pool = await mysql.createPool({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        console.log(`Testing logic for ID: ${idParam}, custId: ${custId}`);
        
        let reqId = idParam;
        
        // Logic from lines 802-819
        const [reqCheck] = await pool.execute(
            'SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ? AND TRAVELER_ID = ?', 
            [idParam, custId]
        );
        
        if (reqCheck.length > 0) {
            reqId = idParam;
            console.log(`Found matching REQ_ID: ${idParam}`);
        } else {
            const [resCheck] = await pool.execute(
                'SELECT REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ? AND TRAVELER_ID = ?', 
                [idParam, custId]
            );
            if (resCheck.length > 0) {
                reqId = resCheck[0].REQ_ID;
                console.log(`Resolved REQ_ID ${reqId} from RES_ID ${idParam}`);
            } else {
                reqId = idParam; 
                console.log(`Fallback to idParam: ${reqId}`);
            }
        }

        // [A] 마스터 정보 조회
        const [rows] = await pool.execute(`
            SELECT 
                REQ_ID as reqUuid,
                TRIP_TITLE as tripName,
                START_ADDR as from_addr,
                END_ADDR as to_addr,
                DATE_FORMAT(START_DT, '%Y-%m-%d %H:%i') as start_date,
                DATE_FORMAT(END_DT, '%Y-%m-%d %H:%i') as end_date,
                REQ_AMT as total_price,
                DATA_STAT as status,
                PASSENGER_CNT as passengerCount,
                TRAVELER_ID as ownerId
            FROM TB_AUCTION_REQ 
            WHERE REQ_ID = ?
        `, [reqId]);

        if (rows.length === 0) {
            console.log('Reservation NOT FOUND');
            return;
        }

        const reservation = rows[0];

        // [B] 경유지 정보 조회
        const [viaRows] = await pool.execute(`
            SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
            FROM TB_AUCTION_REQ_VIA
            WHERE REQ_ID = ?
            ORDER BY VIA_SEQ ASC
        `, [reqId]);

        console.log(`viaRows count: ${viaRows.length}`);
        console.log('viaRows details:', JSON.stringify(viaRows, null, 2));

        const fullRoute = [];
        fullRoute.push({ type: 'START', addr: reservation.from_addr, title: '출발지', time: reservation.start_date });
        
        viaRows.forEach(v => {
            let title = '경유지';
            let type = 'WAY';

            switch(v.type) {
                case 'START_WAY': title = '출발 경유지'; break;
                case 'ROUND_TRIP': title = '목적지'; type = 'WAY'; break;
                case 'END_WAY': title = '도착 경유지'; break;
                case 'START_NODE': title = '출발지(상세)'; break;
                case 'END_NODE': title = '도착지(상세)'; break;
                case 'WAY': title = '경유지'; break;
                default: title = v.type || '경유지';
            }
            fullRoute.push({ type: type, addr: v.addr, title: title });
        });
        
        fullRoute.push({ type: 'END', addr: reservation.to_addr, title: '도착지', time: reservation.end_date });
        
        console.log('Full Route:', JSON.stringify(fullRoute, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

// Test with RES_ID '0000000005' and traveler '0000000001'
testApiLogic('0000000005', '0000000001');
