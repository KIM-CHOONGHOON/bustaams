/**
 * crypto.js - AES-256-GCM 양방향 암호화 유틸리티
 *
 * [대상 컬럼] ARCHITECTURE.md 기준: TB_USER.RESIDENT_NO_ENC(주민등록번호)만 DB 암호화 저장.
 *             평문은 주민번호 **숫자 13자리 연속**(화면 입력 앞 6 + 뒤 7) 권장. 과거 `XXXXXX-Y`(뒤 1자) 저장분은 호환 복호 분기에서 처리.
 * [저장 포맷] "iv(hex):authTag(hex):cipherText(hex)" 단일 문자열
 * [키 출처]   .env ENCRYPTION_KEY (32 bytes hex = 64자)
 *
 * 레거시: 과거 USER_NM·HP_NO 등에 동일 포맷으로 저장된 행은 plainOrLegacyDecrypt()로 평문 복원 시도.
 */

require('./loadEnv');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const encRaw = process.env.ENCRYPTION_KEY;

if (!encRaw || typeof encRaw !== 'string' || String(encRaw).trim() === '') {
    throw new Error(
        '[FATAL] ENCRYPTION_KEY가 비어 있습니다. busTaams_server/.env에 64자리 hex(32바이트)를 설정하세요.'
    );
}

const KEY = Buffer.from(String(encRaw).trim(), 'hex');

if (KEY.length !== 32) {
    throw new Error('[FATAL] ENCRYPTION_KEY가 .env에 설정되지 않았거나 32바이트가 아닙니다. 서버를 시작할 수 없습니다.');
}

/**
 * 데이터 암호화 (AES-256-GCM)
 * 결과 포맷: {iv}:{authTag}:{encryptedData}
 */
function encrypt(plainText) {
    if (plainText === null || plainText === undefined) return plainText;
    const iv = crypto.randomBytes(12); // GCM 권장 12바이트 IV
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * 데이터 복호화 (AES-256-GCM)
 */
function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    const [ivHex, authTagHex, cipherHex] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(Buffer.from(cipherHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

/** TB_USER.RESIDENT_NO_ENC 전용 (동작은 encrypt와 동일) */
function encryptResidentNo(plainText) {
    return encrypt(plainText);
}

/** TB_USER.RESIDENT_NO_ENC 전용 (동작은 decrypt와 동일) */
function decryptResidentNo(encryptedText) {
    return decrypt(encryptedText);
}

/**
 * 평문이면 그대로, 암호화된 포맷(: 포함)이면 복호화하여 반환
 * (기존 데이터 호환용)
 */
function plainOrLegacyDecrypt(text) {
    if (!text) return text;
    if (text.includes(':')) {
        try {
            return decrypt(text);
        } catch (e) {
            return text;
        }
    }
    return text;
}

module.exports = {
    encrypt,
    decrypt,
    encryptResidentNo,
    decryptResidentNo,
    plainOrLegacyDecrypt,
};
