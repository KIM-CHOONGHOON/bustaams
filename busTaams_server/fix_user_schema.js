const { pool } = require('./db');

async function fixSchema() {
    try {
        console.log('Checking TB_USER structure...');
        const [columns] = await pool.execute('DESCRIBE TB_USER');
        const columnNames = columns.map(c => c.Field);
        console.log('Current columns:', columnNames);

        if (!columnNames.includes('USER_IMAGE')) {
            console.log('Adding USER_IMAGE column...');
            await pool.execute('ALTER TABLE TB_USER ADD COLUMN USER_IMAGE VARCHAR(255) NULL AFTER USER_STAT');
        }

        if (!columnNames.includes('EMAIL')) {
            console.log('Adding EMAIL column...');
            await pool.execute('ALTER TABLE TB_USER ADD COLUMN EMAIL VARCHAR(255) NULL AFTER USER_ID');
        }
        
        if (!columnNames.includes('USER_ID')) {
             // USER_ID_ENC가 있고 USER_ID가 없다면, USER_ID를 추가하거나 변경 검토
             // 현재 appAuth.js는 USER_ID를 직접 사용하므로 추가함
             console.log('Adding USER_ID column...');
             await pool.execute('ALTER TABLE TB_USER ADD COLUMN USER_ID VARCHAR(50) NULL AFTER USER_UUID');
        }

        console.log('Schema update completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err);
        process.exit(1);
    }
}

fixSchema();
