const mysql = require('mysql2/promise');
require('dotenv').config({path: './busTaams_server/.env'});

async function check() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3307
    });

    const [rows] = await db.execute(`
      SELECT USER_ID, CUST_ID, USER_NM, USER_TYPE, USER_STAT, REG_DT 
      FROM TB_USER 
      WHERE USER_TYPE = 'CUSTOMER' 
      ORDER BY REG_DT DESC 
      LIMIT 3
    `);

    console.log('최근 고객 정보:', JSON.stringify(rows, null, 2));
    await db.end();
  } catch(e) {
    console.error('DB Error:', e);
  }
}
check();
