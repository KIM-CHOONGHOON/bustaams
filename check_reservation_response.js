const mysql = require('mysql2/promise');

const dbConfig = {
  host: '1.234.65.153',
  port: 3306,
  user: 'bustaams',
  password: 'Bus7878!',
  database: 'bustaams_db'
};

async function simulate() {
  const pool = await mysql.createConnection(dbConfig);
  try {
    const reqId = '0000000001';
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
            TRAVELER_ID as ownerId,
            CASE 
                WHEN DATA_STAT = 'AUCTION' THEN '견적대기중..'
                WHEN DATA_STAT = 'BIDDING' THEN '승인대기중...'
                WHEN DATA_STAT = 'CONFIRM' THEN '예약 확정...'
                WHEN DATA_STAT = 'DONE' THEN '운행 종료...'
                WHEN DATA_STAT = 'TRAVELER_CANCEL' THEN '전체 취소'
                WHEN DATA_STAT = 'DRIVER_CANCEL' THEN '기사 취소'
                WHEN DATA_STAT = 'BUS_CHANGE' THEN '변경 요청'
                WHEN DATA_STAT = 'BUS_CANCEL' THEN '대수 취소'
                ELSE '상태확인필요'
            END as statusText
        FROM TB_AUCTION_REQ 
        WHERE REQ_ID = ?
    `, [reqId]);

    const reservation = rows[0];

    const [viaRows] = await pool.execute(`
        SELECT VIA_ADDR as addr, VIA_TYPE as type, VIA_SEQ as ord
        FROM TB_AUCTION_REQ_VIA
        WHERE REQ_ID = ?
        ORDER BY VIA_SEQ ASC
    `, [reqId]);

    let fullRoute = viaRows.map((v, idx) => {
        let title = '경유지';
        let type = 'VIA';
        switch (v.type) {
            case 'START_NODE': title = '출발지'; type = 'START'; break;
            case 'START_WAY': title = '출발경유지'; type = 'VIA'; break;
            case 'ROUND_TRIP': title = '목적지'; type = 'DEST'; break;
            case 'END_WAY': title = '도착경유지'; type = 'VIA'; break;
            case 'END_NODE': title = '도착지'; type = 'END'; break;
        }
        let time = null;
        if (idx === 0) time = reservation.start_date;
        if (idx === viaRows.length - 1) time = reservation.end_date;
        return { type, addr: v.addr, title, time };
    });
    reservation.route = fullRoute;

    const [busRows] = await pool.execute(`
        SELECT 
            rb.REQ_BUS_SEQ as reqBusUuid,
            rb.BUS_TYPE_CD as busType,
            res.RES_ID as resId,
            rb.DATA_STAT as status,
            rb.RES_BUS_AMT as price,
            (SELECT COUNT(*) FROM TB_BUS_RESERVATION b 
             WHERE b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ AND b.DATA_STAT = 'BIDDING') as bidCount,
            res.DRIVER_ID as driverId,
            u_driver.USER_NM as driverName,
            u_driver.HP_NO as driverHp,
            u_driver.USER_IMAGE as driverAvatar,
            dv.VEHICLE_NO as busNo,
            dv.MODEL_NM as busModel,
            dv.VEHICLE_PHOTOS_JSON as busPhotos,
            dv.AMENITIES as amenities,
            res.DRIVER_BIDDING_PRICE as confirmedPrice,
            res.DATA_STAT as resStatus
        FROM TB_AUCTION_REQ_BUS rb
        LEFT JOIN TB_BUS_RESERVATION res ON rb.REQ_ID = res.REQ_ID AND rb.REQ_BUS_SEQ = res.REQ_BUS_SEQ AND res.DATA_STAT = 'CONFIRM'
        LEFT JOIN TB_USER u_driver ON res.DRIVER_ID = u_driver.CUST_ID
        LEFT JOIN TB_BUS_DRIVER_VEHICLE dv ON res.BUS_ID = dv.BUS_ID
        WHERE rb.REQ_ID = ?
    `, [reqId]);

    for (let bus of busRows) {
        if (bus.driverAvatar && !bus.driverAvatar.startsWith('http') && !bus.driverAvatar.startsWith('/')) {
            bus.driverAvatar = `/api/common/display-image?path=${encodeURIComponent(bus.driverAvatar)}`;
        }
        if (bus.busPhotos) {
            try {
                let photoIds = (typeof bus.busPhotos === 'string') ? JSON.parse(bus.busPhotos) : bus.busPhotos;
                if (Array.isArray(photoIds) && photoIds.length > 0) {
                    const [fileRows] = await pool.execute(
                        'SELECT GCS_PATH FROM TB_FILE_MASTER WHERE FILE_ID IN (?)',
                        [photoIds]
                    );
                    const paths = fileRows.map(f => {
                        if (f.GCS_PATH && f.GCS_PATH.startsWith('http')) return f.GCS_PATH;
                        return `/api/common/display-image?path=${encodeURIComponent(f.GCS_PATH)}`;
                    });
                    bus.busPhotos = paths;
                    bus.busImage = paths[0];
                } else {
                    bus.busPhotos = [];
                    bus.busImage = null;
                }
            } catch (e) {
                bus.busPhotos = [];
                bus.busImage = null;
            }
        } else {
            bus.busPhotos = [];
            bus.busImage = null;
        }
    }

    reservation.requestedBuses = busRows;
    console.log('--- API 응답 데이터 ---');
    console.log(JSON.stringify(reservation, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

simulate();
