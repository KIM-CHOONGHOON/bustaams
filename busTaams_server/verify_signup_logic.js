const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('./crypto');
require('dotenv').config();

async function simulate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
    });

    const testUser = {
        userId: 'verify_script_user_' + Date.now(),
        password: 'password123',
        userName: '스크립트테스트',
        phoneNo: '01011112222',
        userType: 'TRAVELER'
    };

    console.log('1. Starting Simulation for:', testUser.userId);

    try {
        const encryptedId = encrypt(testUser.userId);
        const encryptedName = encrypt(testUser.userName);
        const encryptedPhone = encrypt(testUser.phoneNo);
        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        // INSERT into TB_USER
        console.log('2. Inserting into TB_USER...');
        const userQuery = `
            INSERT INTO TB_USER (
                USER_UUID, USER_ID_ENC, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT
            ) VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, 'NONE', 'Y', ?, NOW(), 'ACTIVE')
        `;
        await pool.execute(userQuery, [
            encryptedId, hashedPassword, encryptedName, encryptedPhone, testUser.userType
        ]);
        console.log('✅ TB_USER Insert Success');

        // Verify Lookup Logic (Scan and Decrypt)
        console.log('3. Verifying lookup logic (Scan and Decrypt)...');
        const [rows] = await pool.execute('SELECT * FROM TB_USER');
        const found = rows.find(row => {
            try { return decrypt(row.USER_ID_ENC) === testUser.userId; } catch (e) { return false; }
        });

        if (found) {
            console.log('✅ User Found and Decrypted Successfully!');
            console.log('   - UUID (Hex):', found.USER_UUID.toString('hex'));
            console.log('   - Decrypted ID:', decrypt(found.USER_ID_ENC));
            console.log('   - Decrypted Name:', decrypt(found.USER_NM));
            console.log('   - Decrypted Phone:', decrypt(found.HP_NO));
            console.log('   - User Type:', found.USER_TYPE);
            console.log('   - SMS Auth:', found.SMS_AUTH_YN);
        } else {
            console.error('❌ User NOT found via decryption scan!');
        }

    } catch (error) {
        console.error('❌ Simulation Failed:', error);
    } finally {
        await pool.end();
    }
}

simulate();
