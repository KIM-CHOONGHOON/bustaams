require('dotenv').config({ path: './busTaams_server/.env' });
const { pool, bucketName } = require('./busTaams_server/db');

async function migrateFileMaster() {
    console.log('>>> [Migration] Standardizing TB_FILE_MASTER GCS_PATH for USER_PROFILE...');
    
    try {
        // 1. 대상 데이터 조회 (USER_PROFILE 카테고리 중 상대 경로로 저장된 것)
        const [rows] = await pool.execute(
            "SELECT FILE_ID, GCS_PATH FROM TB_FILE_MASTER WHERE FILE_CATEGORY = 'USER_PROFILE' AND GCS_PATH NOT LIKE 'http%'"
        );
        
        console.log(`>>> Found ${rows.length} records to update.`);
        
        if (rows.length === 0) {
            console.log('>>> No records need updating. Done.');
            process.exit(0);
        }

        let updateCount = 0;
        for (const row of rows) {
            const fullUrl = `https://storage.googleapis.com/${bucketName}/${row.GCS_PATH}`;
            
            await pool.execute(
                "UPDATE TB_FILE_MASTER SET GCS_PATH = ?, MOD_DT = NOW() WHERE FILE_ID = ?",
                [fullUrl, row.FILE_ID]
            );
            updateCount++;
            
            if (updateCount % 10 === 0) {
                console.log(`>>> Progress: ${updateCount}/${rows.length}...`);
            }
        }

        console.log(`✅ Successfully updated ${updateCount} records in TB_FILE_MASTER.`);
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrateFileMaster();
