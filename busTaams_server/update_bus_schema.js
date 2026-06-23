const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function updateSchema() {
    try {
        console.log('--- Updating TB_DRIVER_BUS schema ---');
        // Add missing columns to TB_DRIVER_BUS
        const alterBusSql = [
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS PROD_YEAR CHAR(4) AFTER MANUFACTURE_YEAR',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS SERVICE_TYPE VARCHAR(30) AFTER BUS_GRADE',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS FUEL_TYPE VARCHAR(20) AFTER SERVICE_TYPE',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS FUEL_EFFICIENCY DECIMAL(5,2) AFTER FUEL_TYPE',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS INSUR_TYPE ENUM("NONE", "BASIC", "COMPREHENSIVE") DEFAULT "NONE" AFTER HAS_MONITOR',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS INSUR_EXP_DT DATE AFTER INSUR_TYPE',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS INSPECT_EXP_DT DATE AFTER INSUR_EXP_DT',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS BUS_IMAGES_JSON TEXT AFTER INSPECT_EXP_DT',
            // Amenities expansion
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_MIC ENUM("Y", "N") DEFAULT "N" AFTER HAS_MONITOR',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_KITCHEN ENUM("Y", "N") DEFAULT "N" AFTER HAS_MIC',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_WATER_DROP ENUM("Y", "N") DEFAULT "N" AFTER HAS_KITCHEN',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_CURTAINS ENUM("Y", "N") DEFAULT "N" AFTER HAS_WATER_DROP',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_AIR_PURIFIER ENUM("Y", "N") DEFAULT "N" AFTER HAS_CURTAINS',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_CAR_SEAT ENUM("Y", "N") DEFAULT "N" AFTER HAS_AIR_PURIFIER',
            'ALTER TABLE TB_DRIVER_BUS ADD COLUMN IF NOT EXISTS HAS_AEBS ENUM("Y", "N") DEFAULT "N" AFTER HAS_CAR_SEAT'
        ];

        for (const sql of alterBusSql) {
            try {
                await pool.query(sql);
                console.log(`Success: ${sql.substring(0, 50)}...`);
            } catch (e) {
                console.warn(`Skipped or Failed: ${sql.substring(0, 50)}... Error: ${e.message}`);
            }
        }

        console.log('--- Updating TB_DRIVER_DOCS ENUM ---');
        // Modify ENUM to include more document types
        await pool.query(`ALTER TABLE TB_DRIVER_DOCS MODIFY COLUMN DOC_TYPE ENUM('LICENSE', 'QUALIFICATION', 'APTITUDE', 'BIZ_REG', 'TRANSPORT_PERMIT', 'INSURANCE') NOT NULL`);
        console.log('✅ TB_DRIVER_DOCS ENUM UPDATED SUCCESSFULLY');

        console.log('✅ ALL SCHEMA UPDATES COMPLETED');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during schema update:', err);
        process.exit(1);
    }
}

updateSchema();
