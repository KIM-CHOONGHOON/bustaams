/**
 * crypto.js - AES-256-GCM 양방향 암호화 유틸리티
 *
 * [대상 컬럼] ARCHITECTURE.md 기준: TB_USER.RESIDENT_NO_ENC(주민등록번호)만 DB 암호화 저장.
 * [저장 포맷] "iv(hex):authTag(hex):cipherText(hex)" 단일 문자열
 * [키 출처]   .env ENCRYPTION_KEY (32 bytes hex = 64자)
 *
 * 레거시: 과거 USER_NM·HP_NO 등에 동일 포맷으로 저장된 행은 plainOrLegacyDecrypt()로 평문 복원 시도.
 */

require('dotenv').config();
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

if (!process.env.ENCRYPTION_KEY || KEY.length !== 32) {
    throw new Error('[FATAL] ENCRYPTION_KEY가 .env에 설정되지 않았거나 32바이트가 아닙니다. 서버를 시작할 수 없습니다.');
}

/**
 * 평문을 AES-256-GCM으로 암호화하여 DB 저장 가능한 문자열로 반환
 * @param {string} plainText - 암호화할 원본 텍스트
 * @returns {string} "iv:authTag:cipherText" 형태의 hex 문자열
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
 * DB에서 읽어온 암호화 문자열을 원본 텍스트로 복호화
 * @param {string} encryptedText - "iv:authTag:cipherText" 형태의 hex 문자열
 * @returns {string} 복호화된 원본 텍스트
 */
function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    const [ivHex, authTagHex, cipherHex] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(Buffer.from(cipherHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

/** TB_USER.RESIDENT_NO_ENC 전용 (동작은 encrypt와 동일) */
function encryptResidentNo(plain) {
    return encrypt(plain);
}

function decryptResidentNo(enc) {
    return decrypt(enc);
}

/**
 * 평문이면 그대로, AES-GCM 저장 포맷이면 복호화 (레거시 암호화 행 호환)
 * @param {string|null|undefined} val
 */
function plainOrLegacyDecrypt(val) {
    if (val == null || val === '') return '';
    const s = String(val);
    if (!s.includes(':')) return s;
    const parts = s.split(':');
    if (parts.length < 3) return s;
    const [ivHex] = parts;
    if (!/^[0-9a-f]+$/i.test(ivHex) || ivHex.length !== 24) return s;
    try {
        return decrypt(s);
    } catch (_) {
        return s;
    }
}

module.exports = {
    encrypt,
    decrypt,
    encryptResidentNo,
    decryptResidentNo,
    plainOrLegacyDecrypt,
};
