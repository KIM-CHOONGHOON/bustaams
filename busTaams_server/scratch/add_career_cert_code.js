const { pool } = require('../db');

async function addCommonCode() {
    try {
        console.log('Adding CAREER_CERT to TB_COMMON_CODE...');
        const checkSql = "SELECT * FROM TB_COMMON_CODE WHERE GRP_CD = 'DOC_TYPE' AND DTL_CD = 'CAREER_CERT'";
        const [rows] = await pool.execute(checkSql);
        
        if (rows.length === 0) {
            const insertSql = `
                INSERT INTO TB_COMMON_CODE (GRP_CD, DTL_CD, CD_NM_KO, CD_NM_EN, USE_YN, DISP_ORD, CD_DESC, REG_ID)
                VALUES ('DOC_TYPE', 'CAREER_CERT', '운전경력증명서', 'Driver Career Certificate', 'Y', 7, '운전경력증명서(필수서류)', 'system')
            `;
            await pool.execute(insertSql);
            console.log('Successfully added CAREER_CERT to TB_COMMON_CODE.');
        } else {
            console.log('CAREER_CERT already exists in TB_COMMON_CODE.');
        }
    } catch (error) {
        console.error('Error adding common code:', error.message);
    } finally {
        process.exit();
    }
}

addCommonCode();
