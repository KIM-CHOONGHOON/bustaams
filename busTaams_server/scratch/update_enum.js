const { pool } = require('../db');

async function updateEnum() {
    try {
        console.log('Expanding TERMS_TYPE enum values...');
        const sql = `
            ALTER TABLE TB_USER_TERMS_HIST 
            MODIFY COLUMN TERMS_TYPE ENUM(
                'SERVICE', 
                'TRAVELER_SERVICE', 
                'DRIVER_SERVICE', 
                'PRIVACY', 
                'MARKETING', 
                'PARTNER_CONTRACT'
            ) NOT NULL COMMENT '약관 종류'
        `;
        await pool.execute(sql);
        console.log('✅ ENUM VALUES UPDATED SUCCESSFULLY.');
    } catch (err) {
        console.error('❌ FAILED TO UPDATE ENUM:', err);
    } finally {
        process.exit();
    }
}

updateEnum();
