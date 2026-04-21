const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function fixSchema() {
    try {
        console.log('--- Fixing TB_DRIVER_BUS columns (YN style) ---');
        const sqls = [
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS MIC_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS KITCHEN_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS WATER_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS CURTAIN_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS AIR_PURIFIER_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS CAR_SEAT_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS AEBS_YN ENUM("Y", "N") DEFAULT "N"',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS INSPECT_EXP_DT DATE',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS BUS_IMAGES_JSON TEXT',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS SERVICE_TYPE VARCHAR(30)',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS FUEL_TYPE VARCHAR(20)',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS FUEL_EFFICIENCY DECIMAL(5,2)',
            // Ensure original columns exist just in case
            'ALTER TABLE TB_DRIVER_BUS MODIFY COLUMN BUS_YEAR CHAR(4)',
            'ALTER TABLE TB_DRIVER_BUS MODIFY COLUMN PASS_LIMIT INT'
        ];

        for (const sql of sqls) {
            try {
                await pool.query(sql);
                console.log(`Success: ${sql}`);
            } catch (e) {
                console.warn(`Skipped/Error: ${sql} -> ${e.message}`);
            }
        }
        console.log('✅ DB SCHEMA REPAIR COMPLETED');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixSchema();
