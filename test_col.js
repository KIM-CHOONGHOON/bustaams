const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'busTaams_server/.env' });
(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '1234',
            database: process.env.DB_NAME || 'bustaams_db'
        });
        const [rows] = await pool.execute('DESCRIBE TB_BUS_DRIVER_VEHICLE_FILE_HIST');
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
