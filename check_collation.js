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
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('TB_USER', 'TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_BUS_RESERVATION', 'TB_FILE_MASTER')
    `, [process.env.DB_NAME]);

    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch(e) {
    console.error('DB Error:', e);
  }
}
check();
