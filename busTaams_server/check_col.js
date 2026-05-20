const { pool } = require('./db');

async function fixCollations() {
    try {
        console.log('--- Database Collation Fix Started ---');
        
        const tables = ['TB_CHAT_LOG', 'TB_CHAT_LOG_HIST', 'TB_CHAT_LOG_PART'];
        
        for (const table of tables) {
            console.log(`Fixing collation for ${table}...`);
            await pool.execute(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
            console.log(`✅ ${table} fixed!`);
        }

        console.log('\n[Verifying Table Collations]');
        const [tableRows] = await pool.execute(`
            SELECT TABLE_NAME, TABLE_COLLATION 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ('TB_CHAT_LOG', 'TB_CHAT_LOG_HIST', 'TB_CHAT_LOG_PART')
        `);
        console.table(tableRows);

        console.log('\n🚀 All collations have been standardized to utf8mb4_0900_ai_ci!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

fixCollations();
