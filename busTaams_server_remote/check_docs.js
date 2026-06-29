const { pool } = require('./db');
async function check() {
  const [rows] = await pool.execute('SELECT * FROM TB_DRIVER_DOCS LIMIT 5');
  console.dir(rows, { depth: null });
  process.exit();
}
check();
