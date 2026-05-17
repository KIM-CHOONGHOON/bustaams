const pool = require('./db');
async function check() {
  const [rows] = await pool.execute('DESCRIBE TB_DRIVER_DOCS');
  console.table(rows);
  process.exit();
}
check();
