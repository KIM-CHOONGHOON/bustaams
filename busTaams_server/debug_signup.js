const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function debugSignup() {
    console.log('--- SIGNUP DEBUG START ---');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = 'final_debug@example.com';
        const password = 'Password1!';
        const userName = 'DebugUser';
        const phoneNo = '01011119999';
        const userType = 'CUSTOMER';
        const agreedTerms = [1, 2, 3];

        const [maxIdRows] = await connection.execute('SELECT MAX(USER_ID) as maxId FROM TB_USER');
        const nextVal = (parseInt(maxIdRows[0].maxId || 0, 10)) + 1;
        const newUserId = String(nextVal).padStart(10, '0');
        console.log('newUserId:', newUserId);

        const [maxFileRows] = await connection.execute('SELECT MAX(FILE_ID) as maxId FROM TB_FILE_MASTER');
        const nextFileVal = (parseInt(maxFileRows[0].maxId || 0, 10)) + 1;
        const newFileId = String(nextFileVal).padStart(10, '0');
        console.log('newFileId:', newFileId);

        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Inserting into TB_USER...');
        const userQuery = `
            INSERT INTO TB_USER (
                USER_ID, EMAIL, PASSWORD, USER_NM, HP_NO, SNS_TYPE, 
                SMS_AUTH_YN, USER_TYPE, JOIN_DT, USER_STAT
            ) VALUES (?, ?, ?, ?, ?, 'NONE', 'Y', 'TRAVELER', NOW(), 'ACTIVE')
        `;
        await connection.execute(userQuery, [newUserId, userId, hashedPassword, userName, phoneNo]);

        console.log('Inserting into TB_FILE_MASTER...');
        const fileQuery = `
            INSERT INTO TB_FILE_MASTER (
                FILE_ID, FILE_CATEGORY, GCS_BUCKET_NM, GCS_PATH, 
                ORG_FILE_NM, FILE_EXT, FILE_SIZE, REG_DT, REG_ID
            ) VALUES (?, 'SIGNATURE', 'bucket', 'path', 'sig.png', 'png', 100, NOW(), ?)
        `;
        await connection.execute(fileQuery, [newFileId, newUserId]);

        console.log('Inserting into TB_USER_TERMS_HIST...');
        const histQuery = `
            INSERT INTO TB_USER_TERMS_HIST (
                USER_ID, TERMS_HIST_SEQ, TERMS_TYPE, TERMS_VER, AGREE_YN, SIGN_FILE_ID, AGREE_DT
            ) VALUES (?, ?, ?, 'v1.0', 'Y', ?, NOW())
        `;
        const termsMapping = { 1: 'SERVICE', 2: 'PRIVACY', 3: 'MARKETING' };
        let seq = 1;
        for (const tid of agreedTerms) {
            console.log(`  - Term ${tid}: ${termsMapping[tid]}`);
            await connection.execute(histQuery, [newUserId, seq++, termsMapping[tid], newFileId]);
        }

        await connection.commit();
        console.log('--- SUCCESS ---');
    } catch (error) {
        await connection.rollback();
        console.error('--- FAILED ---');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.release();
        await pool.end();
    }
}

debugSignup();
