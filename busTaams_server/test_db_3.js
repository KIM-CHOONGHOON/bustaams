const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function test() {
    const pool = mysql.createPool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
    const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as USER_UUID_STR, TB_USER.* FROM TB_USER');
    
    const userId = "oasis1";
    const user = rows.find(row => { try { return decrypt(row.USER_ID_ENC) === userId; } catch (e) { return false; } });
    if (!user) return console.log("Not found oasis1");

    // the hash is $2a$10$... let's just force bypass bcrypt to see what happens after!
    const decryptedUserName = user.USER_NM ? decrypt(user.USER_NM) : '';
    const decryptedPhoneNo = user.HP_NO ? decrypt(user.HP_NO) : '';

    const payload = {
        message: '로그인 성공',
        user: {
            userId: userId,
            userUuid: user.USER_UUID_STR || '',
            email: userId,
            userName: decryptedUserName,
            phoneNo: decryptedPhoneNo,
            phoneNumber: decryptedPhoneNo,
            userType: user.USER_TYPE
        }
    };
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
}
test().catch(e => { console.error("ERR:", e); process.exit(1); });
