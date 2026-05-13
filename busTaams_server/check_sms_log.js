const pool = require('./db');

async function checkSmsLogTable() {
    try {
        const [rows] = await pool.execute("SHOW TABLES LIKE 'TB_SMS_LOG'");
        if (rows.length > 0) {
            console.log('✅ TB_SMS_LOG 테이블이 이미 존재합니다.');
            const [columns] = await pool.execute("DESCRIBE TB_SMS_LOG");
            console.table(columns);
        } else {
            console.log('❌ TB_SMS_LOG 테이블이 존재하지 않습니다. 생성이 필요합니다.');
        }
    } catch (error) {
        console.error('❌ 테이블 확인 중 오류 발생:', error);
    } finally {
        process.exit();
    }
}

checkSmsLogTable();
