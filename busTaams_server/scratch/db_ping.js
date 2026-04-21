const { pool } = require('../db');
console.log('--- DB Connection Ping Test ---');

async function testConnection() {
  try {
    console.log('Trying to get connection...');
    const connection = await pool.getConnection();
    console.log('✅ Connection obtained!');
    
    console.log('Executing simple query...');
    const [rows] = await connection.execute('SELECT 1 as val');
    console.log('✅ Query success! Result:', rows[0].val);
    
    connection.release();
    console.log('✅ Connection released.');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB CONNECTION FAILED!');
    console.error(err);
    process.exit(1);
  }
}

testConnection();
