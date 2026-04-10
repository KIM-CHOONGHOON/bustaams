const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBids() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const reqUuid = '898b653d-c9e2-41c0-94b8-c39e229c76ac';
        const [rows] = await pool.execute(`
            SELECT 
                BIN_TO_UUID(r.RES_UUID) AS bidUuid, 
                u.USER_NM AS driverNm,
                bus.MANUFACTURE_YEAR AS manufactureYear,
                bus.BUS_MODEL AS modelNm,
                bus.TOTAL_SEATS AS totalSeats,
                bus.HAS_REFRIGERATOR AS hasRefrigerator,
                bus.HAS_WIFI AS hasWifi,
                bus.HAS_USB_PORT AS hasUsbPort,
                bus.HAS_MONITOR AS hasMonitor
            FROM TB_BUS_RESERVATION r 
            LEFT JOIN TB_USER u ON r.DRIVER_UUID = u.USER_UUID
            LEFT JOIN TB_DRIVER_BUS bus ON r.DRIVER_UUID = bus.USER_UUID
            WHERE r.REQ_UUID = UUID_TO_BIN(?) 
              AND r.RES_STAT = 'REQ' 
              AND r.BID_SEQ = (
                  SELECT MAX(r2.BID_SEQ) 
                  FROM TB_BUS_RESERVATION r2 
                  WHERE r2.REQ_UUID = r.REQ_UUID 
                    AND r2.DRIVER_UUID = r.DRIVER_UUID
              )
        `, [reqUuid]);
        
        console.log('Detailed Bids for reqUuid:', reqUuid);
        console.table(rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkBids();
