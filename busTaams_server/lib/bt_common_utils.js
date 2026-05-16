/**
 * BusTaams 공통 유틸리티 함수 모음
 * bt_common_utils.js
 */

/**
 * 가변 길이 0-패딩 숫자 ID 생성기
 * @param {number|string} currentMax 순자값 또는 문자열
 * @param {number} length 패딩 길이 (기본 10)
 * @returns {string} 패딩된 다음 ID
 */
function generateNextNumericId(currentMax, length = 10) {
    const nextVal = (parseInt(currentMax || 0, 10)) + 1;
    return String(nextVal).padStart(length, '0');
}

/**
 * 날짜 객체 또는 문자열을 YYYY-MM-DD 형식으로 변환
 */
function formatDateYmd(v) {
    if (v == null || v === undefined || v === '') return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * 프론트엔드에서 전송된 Base64 DataURL을 파싱하여 버퍼와 확장자 반환
 */
function parseDataUrlPayload(dataUrl, fileNameHint = 'file') {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) return null;
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    let ext = 'bin';
    if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpeg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    const safe = String(fileNameHint || 'file').replace(/[^a-zA-Z0-9._-가-힣]/g, '_');
    return { buffer: buf, ext, mime, orgName: safe };
}

/**
 * TB_FILE_MASTER.FILE_EXT 저장용 — 소문자·무점, jpg/jpeg → jpeg 통일
 */
function normalizeFileExtForMaster(ext) {
    let e = String(ext ?? '')
        .replace(/^\./, '')
        .replace(/[^\w]/g, '')
        .toLowerCase()
        .trim();
    if (!e) return '';
    if (e === 'jpg' || e === 'jpeg') return 'jpeg';
    return e.slice(0, 15);
}

/** 파일명 본문에서 `.{ext}`(및 jpg/jpeg 동등) 반복 접미사 제거 → ORG_FILE_NM 은 확장자 미포함 */
function stripExtensionLayersFromBase(base, fileExt) {
    let b = String(base ?? '').trim();
    const canon = normalizeFileExtForMaster(fileExt);
    const variants = !canon ? [] : canon === 'jpeg' ? ['jpeg', 'jpg'] : [canon];
    if (!b || variants.length === 0) return b.replace(/\.+$/, '').trim() || 'file';
    for (let guard = 0; guard < 24; guard += 1) {
        let hit = false;
        const lb = b.toLowerCase();
        for (const v of variants) {
            const suf = `.${v.toLowerCase()}`;
            if (lb.endsWith(suf)) {
                b = b.slice(0, -suf.length);
                hit = true;
                break;
            }
        }
        if (!hit) break;
    }
    return b.replace(/\.+$/, '').trim() || 'file';
}

/**
 * 업로드 힌트 + parseDataUrlPayload 결과 → TB_FILE_MASTER 용 ORG_FILE_NM(확장자 제외)·FILE_EXT
 */
function orgFileNmAndExt(fileNameHint, parsed) {
    const p = parsed && typeof parsed === 'object' ? parsed : {};
    const mimeHintExt = normalizeFileExtForMaster(p.ext || '');
    const hintRaw = String(fileNameHint || p.orgName || 'file').trim();
    const leaf = hintRaw.replace(/\\/g, '/').split('/').pop() || 'file';
    const idx = leaf.lastIndexOf('.');
    let base = leaf;
    let ext = mimeHintExt;
    if (idx > 0) {
        base = leaf.slice(0, idx);
        ext = normalizeFileExtForMaster(leaf.slice(idx + 1)) || ext;
    }
    if (!ext) ext = mimeHintExt;
    if (!ext) ext = 'bin';

    base = stripExtensionLayersFromBase(base, ext);

    const orgFileNm = base.replace(/[^a-zA-Z0-9._-가-힣]/g, '_').replace(/\.+$/, '') || 'file';
    let fileExt = ext;
    if ((!fileExt || fileExt === 'bin') && mimeHintExt) fileExt = mimeHintExt;
    if (!fileExt || fileExt === 'bin') fileExt = 'bin';
    fileExt = normalizeFileExtForMaster(fileExt) || 'bin';
    return { orgFileNm, fileExt };
}

/** 표시·다운로드 파일명 — ORG_FILE_NM 에 이미 동일 확장자가 있으면 중복 부착 안 함 */
function joinOrgFileDisplayName(orgFileNm, fileExt) {
    const nm = String(orgFileNm ?? '').trim() || 'file';
    const rawExt = String(fileExt ?? '').replace(/^\./, '').trim();
    if (!rawExt) return nm;
    const ext = rawExt.toLowerCase();
    const suffix = `.${ext}`;
    if (nm.toLowerCase().endsWith(suffix)) return nm;
    return `${nm}.${ext}`;
}

/** Firebase 서비스 계정이 있으면 true */
function firebaseAdminConfigured(admin) {
    return !!(admin && admin.apps && admin.apps.length > 0);
}

/** 휴대전화 인증 검증 (Firebase ID 토큰 또는 SMS 인증 성공 저장소 확인) */
async function verifyFirebasePhoneIdTokenIfRequired(admin, smsVerifiedPhoneStore, idToken, options = {}) {
    if (!firebaseAdminConfigured(admin)) {
        return { ok: true };
    }
    const { smsVerifiedPhone } = options;
    if (idToken && typeof idToken === 'string') {
        try {
            await admin.auth().verifyIdToken(idToken);
            return { ok: true };
        } catch (e) {
            console.error('Firebase ID token verification failed:', e.message);
            return { ok: false, error: '휴대전화 인증이 유효하지 않습니다. 다시 인증해 주세요.' };
        }
    }
    if (smsVerifiedPhone && smsVerifiedPhoneStore.has(smsVerifiedPhone)) {
        const entry = smsVerifiedPhoneStore.get(smsVerifiedPhone);
        if (entry && Date.now() <= entry.expiresAt) {
            return { ok: true };
        }
        smsVerifiedPhoneStore.delete(smsVerifiedPhone);
    }
    return { ok: false, error: '휴대전화 인증을 완료해 주세요.' };
}

/**
 * 알림톡/SMS 발송 및 이력 저장 유틸리티
 */
async function sendAlimTalkAndLog(pool, { reqId, receiverId, receiverPhone, content, category }) {
    try {
        const aligoService = require('../services/bt_comm_handler');
        await aligoService.sendSms({
            reqId,
            receiverId,
            receiver: receiverPhone.replace(/-/g, ''),
            message: content,
            category: category || 'ETC'
        });
    } catch (err) {
        console.error('AlimTalk(Aligo) Send or Log Error:', err);
    }
}

/**
 * 주소를 시/도 단위로 자르는 헬퍼 함수
 */
function trimAddress(addr) {
    if (!addr || typeof addr !== 'string') return '';
    return addr.trim().split(/\s+/).slice(0, 2).join(' ');
}

module.exports = {
    generateNextNumericId,
    formatDateYmd,
    parseDataUrlPayload,
    normalizeFileExtForMaster,
    stripExtensionLayersFromBase,
    orgFileNmAndExt,
    joinOrgFileDisplayName,
    sendAlimTalkAndLog,
    firebaseAdminConfigured,
    verifyFirebasePhoneIdTokenIfRequired,
    trimAddress
};
