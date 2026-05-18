/**
 * 주민등록번호 유효성 검사 (KRRN - Korean Resident Registration Number)
 * @param {string} rrn - 주민등록번호 (형식: YYMMDD-GXXXXXX 또는 YYMMDDGXXXXXX)
 * @returns {boolean} 유효 여부
 */
export const validateRRN = (rrn) => {
    if (!rrn) return false;
    
    // 특수문자 제거
    const cleanRRN = rrn.replace(/[^0-9]/g, '');
    
    if (cleanRRN.length !== 13) return false;
    
    const digits = cleanRRN.split('').map(Number);
    
    // 1. 생년월일 유효성 체크 (기본)
    const yearPrefix = ['1', '2', '5', '6'].includes(cleanRRN[6]) ? '19' : '20';
    const year = parseInt(yearPrefix + cleanRRN.substring(0, 2), 10);
    const month = parseInt(cleanRRN.substring(2, 4), 10);
    const day = parseInt(cleanRRN.substring(4, 6), 10);
    
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
        return false;
    }
    
    // 2. 가중치 체크섬 알고리즘
    // 가중치: 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * weights[i];
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    
    return checkDigit === digits[12];
};
