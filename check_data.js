const mysql = require('mysql2/promise');

const dbConfig = {
  host: '1.234.65.153',
  port: 3306,
  user: 'bustaams',
  password: 'Bus7878!',
  database: 'bustaams_db'
};

async function check() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [driverRows] = await connection.execute('SELECT CUST_ID, USER_NM, USER_IMAGE, PROFILE_FILE_ID FROM TB_USER WHERE CUST_ID = ?', ['0000000002']);
    console.log('--- TB_USER (Driver 0000000002) ---');
    console.log(JSON.stringify(driverRows, null, 2));

    const [vehicleRows] = await connection.execute('SELECT * FROM TB_BUS_DRIVER_VEHICLE LIMIT 5');
    console.log('--- TB_BUS_DRIVER_VEHICLE (LIMIT 5) ---');
    console.log(JSON.stringify(vehicleRows, null, 2));

    const [fileRows] = await connection.execute('SELECT * FROM TB_FILE_MASTER WHERE FILE_ID = ?', [driverRows[0]?.PROFILE_FILE_ID || '']);
    console.log('--- TB_FILE_MASTER for Profile ---');
    console.log(JSON.stringify(fileRows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
