const mysql = require('mysql2/promise');

const dbConfig = {
  host: '1.234.65.153',
  port: 3306,
  user: 'bustaams',
  password: 'Bus7878!',
  database: 'bustaams_db'
};

async function test() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const query = `
        SELECT 
            r.RES_ID as resId,
            r.REQ_ID as reqId,
            r.DRIVER_ID as driverId,
            d.USER_NM as driverName,
            d.USER_ID as driverUserId,
            req.TRIP_TITLE as tripTitle,
            t.USER_NM as travelerName,
            r.DRIVER_BIDDING_PRICE as biddingPrice,
            r.RES_FEE_TOTAL_AMT as feeTotalAmt,
            r.DATA_STAT as dataStat,
            DATE_FORMAT(r.CONFIRM_DT, '%Y-%m-%d %H:%i') as confirmDt,
            DATE_FORMAT(r.REG_DT, '%Y-%m-%d %H:%i') as regDt,
            req.START_ADDR as startAddr,
            req.END_ADDR as endAddr,
            dd.FEE_POLICY as feePolicy
        FROM TB_BUS_RESERVATION r
        INNER JOIN TB_USER d ON r.DRIVER_ID = d.CUST_ID AND d.USER_TYPE = 'DRIVER'
        LEFT JOIN TB_DRIVER_DETAIL dd ON d.CUST_ID = dd.CUST_ID
        INNER JOIN TB_AUCTION_REQ req ON r.REQ_ID = req.REQ_ID
        LEFT JOIN TB_USER t ON req.TRAVELER_ID = t.CUST_ID
        WHERE TRIM(d.RECOM_CODE) = TRIM(?)
        ORDER BY r.CONFIRM_DT DESC
    `;
    const [rows] = await connection.execute(query, ['admin']);
    console.log('Query successful, found rows:', rows.length);
  } catch (err) {
    console.error('Query failed with error:', err);
  } finally {
    await connection.end();
  }
}

test();
