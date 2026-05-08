const { pool } = require('../db');

async function updateDocTypeEnum() {
    try {
        console.log('Updating TB_DRIVER_DOCS.DOC_TYPE ENUM...');
        const alterSql = `
            ALTER TABLE TB_DRIVER_DOCS 
            MODIFY COLUMN DOC_TYPE ENUM(
                'LICENSE','QUALIFICATION','APTITUDE','BIZ_REG','TRANSPORT_PERMIT','INSURANCE',
                'DRIVER_PHOTO','VEHICLE_PHOTO','TERMS_OF_USE','PRIVACY_CONSENT',
                'MARKETING_CONSENT','DRIVER_CONTRACT','TRAVELER_CONTRACT','PARTNER_CONTRACT',
                'TERMS_INTEGRATED','CAREER_CERT'
            ) NOT NULL
        `;
        await pool.execute(alterSql);
        console.log('Successfully updated DOC_TYPE ENUM to include CAREER_CERT.');
    } catch (error) {
        console.error('Error updating ENUM:', error.message);
    } finally {
        process.exit();
    }
}

updateDocTypeEnum();
