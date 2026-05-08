const { pool } = require('../db');

async function checkAndInsertLicenseTypes() {
    try {
        console.log('Checking LICENSE_TYPE codes...');
        const [rows] = await pool.execute(
            "SELECT * FROM TB_COMMON_CODE WHERE GRP_CD = 'LICENSE_TYPE'"
        );

        if (rows.length === 0) {
            console.log('LICENSE_TYPE codes missing. Inserting default codes...');
            const insertSql = `
                INSERT INTO TB_COMMON_CODE (GRP_CD, DTL_CD, CD_NM_KO, CD_NM_EN, USE_YN, DISP_ORD)
                VALUES 
                ('LICENSE_TYPE', '1ST_LARGE', '제1종 대형', '1st Class Large', 'Y', 1),
                ('LICENSE_TYPE', '1ST_NORMAL', '제1종 보통', '1st Class Ordinary', 'Y', 2),
                ('LICENSE_TYPE', '2ND_NORMAL', '제2종 보통', '2nd Class Ordinary', 'Y', 3)
            `;
            await pool.execute(insertSql);
            console.log('Successfully inserted default LICENSE_TYPE codes.');
        } else {
            console.log('LICENSE_TYPE codes already exist:', rows.length, 'records.');
        }
    } catch (error) {
        console.error('Error checking/inserting codes:', error.message);
    } finally {
        process.exit();
    }
}

checkAndInsertLicenseTypes();
