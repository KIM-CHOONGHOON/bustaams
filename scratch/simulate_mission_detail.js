
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/LG/AI자동화/project_bustaams/busTaams_server/.env' });

async function simulateApi() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const id = '0000000003';
        const custId = '0000000002'; // Driver ID

        const [rows] = await pool.execute(`
            SELECT 
                b.RES_ID as id,
                r.REQ_ID,
                r.TRIP_TITLE as title,
                r.START_ADDR as startAddrMaster,
                r.END_ADDR as endAddrMaster,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_NODE' LIMIT 1) as startAddrVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_NODE' LIMIT 1) as endAddrVia,
                DATE_FORMAT(r.START_DT, '%Y.%m.%d %H:%i') as startDate,
                DATE_FORMAT(r.END_DT, '%Y.%m.%d %H:%i') as endDate,
                b.DRIVER_BIDDING_PRICE as price,
                b.DATA_STAT,
                rb.RES_BUS_AMT as targetPrice,
                COALESCE(cm.CODE_NM, rb.BUS_TYPE_CD, '차종 미정') as busTypeNm,
                db.MODEL_NM as model,
                db.VEHICLE_NO as busNumber,
                db.VEHICLE_PHOTOS_JSON as vehiclePhotos,
                u.USER_NM as customerName,
                u.HP_NO as customerPhone,
                u.EMAIL as customerEmail,
                u.USER_IMAGE as customerImage,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'START_WAY') as startVia,
                (SELECT VIA_ADDR FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'ROUND_TRIP' LIMIT 1) as roundTrip,
                (SELECT GROUP_CONCAT(VIA_ADDR ORDER BY VIA_SEQ ASC) FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = r.REQ_ID AND VIA_TYPE = 'END_WAY') as endVia
            FROM TB_BUS_RESERVATION b
            JOIN TB_AUCTION_REQ r ON b.REQ_ID = r.REQ_ID
            LEFT JOIN TB_AUCTION_REQ_BUS rb ON b.REQ_ID = rb.REQ_ID AND b.REQ_BUS_SEQ = rb.REQ_BUS_SEQ
            LEFT JOIN TB_CODE_MASTER cm ON cm.CODE_GRP_ID = 'BUS_TYPE' AND cm.CODE_ID = rb.BUS_TYPE_CD
            LEFT JOIN TB_USER u ON r.TRAVELER_ID = u.CUST_ID
            LEFT JOIN TB_BUS_DRIVER_VEHICLE db ON b.BUS_ID = db.BUS_ID
            WHERE (b.RES_ID = ? OR b.REQ_ID = ?) AND b.DRIVER_ID = ?
            ORDER BY b.REG_DT DESC
            LIMIT 1
        `, [id, id, custId]);

        if (rows.length === 0) {
            console.log('No record found');
            return;
        }

        const row = rows[0];
        const startAddr = row.startAddrVia || row.startAddrMaster || '';
        const endAddr = row.endAddrVia || row.endAddrMaster || '';

        const totalPrice = row.price || 0;
        const breakdown = {
            base: Math.floor(totalPrice * 0.85),
            lodging: Math.floor(totalPrice * 0.08),
            tolls: Math.floor(totalPrice * 0.04),
            fuel: totalPrice - Math.floor(totalPrice * 0.85) - Math.floor(totalPrice * 0.08) - Math.floor(totalPrice * 0.04)
        };

        const data = {
            ...row,
            startAddr,
            endAddr,
            breakdown,
            waypoints: [
                { type: 'START', addr: startAddr, time: row.startDate || '출발' },
                ...(row.startVia ? row.startVia.split(',').map(v => ({ type: 'START_WAY', addr: v, time: '경유' })) : []),
                ...(row.roundTrip ? [{ type: 'ROUND', addr: row.roundTrip, time: '목적지' }] : []),
                ...(row.endVia ? row.endVia.split(',').map(v => ({ type: 'END_WAY', addr: v, time: '경유' })) : []),
                { type: 'END', addr: endAddr, time: row.endDate || '도착지' }
            ]
        };

        console.log('API Result:', JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

simulateApi();
