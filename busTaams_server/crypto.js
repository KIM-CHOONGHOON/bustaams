const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

if (!process.env.ENCRYPTION_KEY || KEY.length !== 32) {
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
