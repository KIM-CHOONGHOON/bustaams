const { pool } = require('./db');

async function testDashboardAPI() {
    try {
        console.log('--- Testing Dashboard API Query ---');
        
        // 실제 존재하는 사용자 ID 하나를 가져옵니다.
        const [users] = await pool.execute('SELECT USER_ID FROM TB_USER LIMIT 1');
        if (users.length === 0) {
            console.log('No users found in TB_USER.');
            process.exit(0);
        }
        
        const testUserId = users[0].USER_ID;
        console.log(`Testing with UserID: ${testUserId}`);

        // 두 번째 (단순한 버전) 쿼리 테스트
        const [rows] = await pool.execute(
            `SELECT 
                u.USER_NM as userName,
                CASE WHEN f.GCS_PATH IS NOT NULL THEN CONCAT('/api/common/display-image?path=', f.GCS_PATH) ELSE NULL END as profileImage,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT IN ('AUCTION', 'BUS_CHANGE')) as countProgressing,
                (SELECT COUNT(*) FROM TB_AUCTION_REQ WHERE TRAVELER_ID = u.CUST_ID AND DATA_STAT = 'BIDDING') as countWaitingApproval
             FROM TB_USER u
             LEFT JOIN TB_FILE_MASTER f ON u.PROFILE_FILE_ID = f.FILE_ID
             WHERE u.USER_ID = ?`,
            [testUserId]
        );

        console.log('API Result:');
        console.log(JSON.stringify(rows[0], null, 2));

        console.log('\n✅ Dashboard query executed successfully without collation error!');
        process.exit(0);
    } catch (error) {
        console.error('❌ API Test failed:', error);
        process.exit(1);
    }
}

testDashboardAPI();
