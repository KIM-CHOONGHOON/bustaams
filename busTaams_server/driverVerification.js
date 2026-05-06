/**
 * 운전면허·운수종사자 자격 진위 연동 (공공데이터포털 / 도로교통공단 계열)
 *
 * 공공데이터포털(data.go.kr)에서 발급받은 일반 인증키와, 각 API 상세 명세(Swagger)에 나온
 * 호출 URL·쿼리 파라미터명을 .env 에 맞춰 넣어야 동작합니다.
 */

require('dotenv').config();

/** .env 값에 공백·CRLF가 붙어도 켜짐으로 인식 */
function isEnvFlagTrue(name) {
    const v = process.env[name];
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
}

function getPublicDataServiceKey() {
    return process.env.PUBLIC_DATA_SERVICE_KEY || process.env.DATA_GO_KR_SERVICE_KEY || '';
}

/**
 * 주민번호 앞 6자리 + 뒷자리 첫 번째 숫자로 생년월일 YYYYMMDD (내국인 규칙 단순화)
 */
function birthYmdFromRrn(rrnFront6, backFirstDigit) {
    const yy = parseInt(rrnFront6.slice(0, 2), 10);
    const mm = rrnFront6.slice(2, 4);
    const dd = rrnFront6.slice(4, 6);
    const g = parseInt(String(backFirstDigit).charAt(0), 10);
    let century = 1900;
    if ([3, 4, 7, 8].includes(g)) {
        century = 2000;
    }
    const year = century + yy;
    return `${year}${mm}${dd}`;
}

function parsePublicDataBody(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return { _parseError: true, raw: trimmed };
        }
    }
    const codeM = trimmed.match(/<resultCode>([^<]*)<\/resultCode>/i);
    const msgM = trimmed.match(/<resultMsg>([^<]*)<\/resultMsg>/i);
    return {
        _xml: true,
        resultCode: codeM ? codeM[1].trim() : null,
        resultMsg: msgM ? msgM[1].trim() : null,
        raw: trimmed.slice(0, 500)
    };
}

function isPublicDataSuccess(body) {
    if (body._xml) {
        return body.resultCode === '00' || body.resultCode === '0';
    }
    const h = body?.response?.header || body?.Header || body?.header;
    const code = h?.resultCode ?? h?.resultcode;
    if (code === '00' || code === '0' || code === 0) return true;
    if (body?.resultCode === '00') return true;
    return false;
}

/**
 * 한국교통안전공단 운수종사자 자격증 진위여부 (공공데이터포털 B552016 등)
 *
 * 필수 env (TS_QUAL_VERIFY_ENABLED=true 일 때):
 * - PUBLIC_DATA_SERVICE_KEY 또는 DATA_GO_KR_SERVICE_KEY
 * - TS_QUAL_VERIFY_URL : 명세의 요청 URL (예: https://apis.data.go.kr/B552016/.../getXxx)
 *
 * 선택 env (포털 명세와 다를 때 쿼리 파라미터명 오버라이드):
 * - TS_QUAL_PARAM_NAME (기본 flnm)
 * - TS_QUAL_PARAM_BIRTH (기본 brdt)
 * - TS_QUAL_PARAM_CERT (기본 qlfcLcnsNo)
 */
async function verifyTsWorkerQualification({ driverName, birthYmd, qualCertNo }) {
    const key = getPublicDataServiceKey();
    const baseUrl = (process.env.TS_QUAL_VERIFY_URL || '').trim();
    if (!key || !baseUrl) {
        return {
            ok: false,
            skipped: false,
            code: 'TS_QUAL_CONFIG',
            message: 'TS_QUAL_VERIFY_URL 또는 공공데이터 인증키가 설정되지 않았습니다.'
        };
    }

    const pName = process.env.TS_QUAL_PARAM_NAME || 'flnm';
    const pBirth = process.env.TS_QUAL_PARAM_BIRTH || 'brdt';
    const pCert = process.env.TS_QUAL_PARAM_CERT || 'qlfcLcnsNo';

    let url;
    try {
        url = new URL(baseUrl);
    } catch {
        return { ok: false, code: 'TS_QUAL_URL', message: 'TS_QUAL_VERIFY_URL 형식이 올바르지 않습니다.' };
    }

    url.searchParams.set('serviceKey', key);
    url.searchParams.set(pName, String(driverName || '').trim());
    url.searchParams.set(pBirth, String(birthYmd || '').replace(/[^0-9]/g, ''));
    url.searchParams.set(pCert, String(qualCertNo || '').trim());
    if (!url.searchParams.has('_type')) {
        url.searchParams.set('_type', 'json');
    }

    let res;
    try {
        res = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json, application/xml, text/xml' }
        });
    } catch (e) {
        return { ok: false, code: 'TS_QUAL_NET', message: `운수종사자 자격 API 호출 실패: ${e.message}` };
    }

    const text = await res.text();
    const body = parsePublicDataBody(text);
    if (!res.ok) {
        const safeUrl = url
            .toString()
            .replace(/([?&]serviceKey=)[^&]*/gi, '$1***');
        console.error(
            '[TS_QUAL_API] HTTP 오류',
            res.status,
            res.statusText || '',
            '\n  요청 URL(serviceKey 마스킹):',
            safeUrl
        );
        console.error('[TS_QUAL_API] 응답 본문 앞부분:', text.slice(0, 1200));
        return {
            ok: false,
            code: 'TS_QUAL_HTTP',
            message: `운수종사자 자격 API HTTP ${res.status}`,
            detail: body
        };
    }

    if (body._xml && !isPublicDataSuccess(body)) {
        return {
            ok: false,
            code: body.resultCode || 'TS_QUAL_FAIL',
            message: body.resultMsg || '운수종사자 자격 진위 응답이 실패입니다.',
            detail: body
        };
    }

    if (!body._xml && !isPublicDataSuccess(body)) {
        const h = body?.response?.header || body?.header;
        return {
            ok: false,
            code: h?.resultCode || 'TS_QUAL_FAIL',
            message: h?.resultMsg || '운수종사자 자격 진위 응답이 실패입니다.',
            detail: body
        };
    }

    return { ok: true, skipped: false, source: 'TS_QUAL', detail: body };
}

/**
 * 도로교통공단 운전면허정보 자동검증 등 B2B/전용 URL 연동용 (요청·응답은 기관 승인 스펙에 맞게 조정)
 *
 * KOROAD_LICENSE_VERIFY_ENABLED=true 이고 KOROAD_LICENSE_VERIFY_URL 이 있으면 POST(JSON)로 호출합니다.
 * 응답 JSON 에 success===true 또는 resultCode === '00' 이면 성공으로 봅니다.
 */
async function verifyKoroadDriverLicense({ driverName, birthYmd, licenseNo, licenseSerialNo }) {
    const url = (process.env.KOROAD_LICENSE_VERIFY_URL || '').trim();
    if (!url) {
        return {
            ok: false,
            skipped: false,
            code: 'KOROAD_CONFIG',
            message: 'KOROAD_LICENSE_VERIFY_URL 이 설정되지 않았습니다.'
        };
    }

    const payload = {
        name: driverName,
        birthYmd: String(birthYmd || '').replace(/[^0-9]/g, ''),
        licenseNo: String(licenseNo || '').trim(),
        licenseSerialNo: String(licenseSerialNo || '').trim()
    };

    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const extra = process.env.KOROAD_LICENSE_API_KEY;
    if (extra) {
        headers.Authorization = `Bearer ${extra}`;
    }

    let res;
    try {
        res = await fetch(url, {
            method: process.env.KOROAD_LICENSE_HTTP_METHOD || 'POST',
            headers,
            body: JSON.stringify(payload)
        });
    } catch (e) {
        return { ok: false, code: 'KOROAD_NET', message: `면허 검증 API 호출 실패: ${e.message}` };
    }

    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        return {
            ok: false,
            code: 'KOROAD_PARSE',
            message: '면허 검증 API 응답이 JSON이 아닙니다.',
            detail: text.slice(0, 300)
        };
    }

    if (!res.ok) {
        return { ok: false, code: 'KOROAD_HTTP', message: `면허 검증 API HTTP ${res.status}`, detail: body };
    }

    const success =
        body.success === true ||
        body.valid === true ||
        body.resultCode === '00' ||
        body?.data?.valid === true;

    if (!success) {
        return {
            ok: false,
            code: body.resultCode || body.code || 'KOROAD_FAIL',
            message: body.message || body.resultMsg || '운전면허 진위 확인에 실패했습니다.',
            detail: body
        };
    }

    return { ok: true, skipped: false, source: 'KOROAD', detail: body };
}

function normStr(v) {
    if (v == null || v === undefined) return '';
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
        return v.toString('utf8').trim();
    }
    return String(v).trim();
}

/** 자격번호 동일 여부만 판단할 때 — 하이픈·공백 차이는 같은 번호로 봄 */
function normQualCertForCompare(v) {
    return normStr(v).replace(/[\s\-]/g, '');
}

function normDateVal(v) {
    if (v == null || v === undefined || v === '') return '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        return v.toISOString().slice(0, 10);
    }
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * DB 행과 요청 본문 비교 — 운전면허 정보 블록이 모두 동일하면 면허 진위 검증 생략
 */
function isLicenseUnchanged(existingRow, incoming) {
    if (!existingRow) return false;
    return (
        normStr(existingRow.LICENSE_TYPE) === normStr(incoming.licenseType) &&
        normStr(existingRow.LICENSE_NO) === normStr(incoming.licenseNo) &&
        normStr(existingRow.LICENSE_SERIAL_NO) === normStr(incoming.licenseSerialNo || '') &&
        normDateVal(existingRow.LICENSE_ISSUE_DT) === normDateVal(incoming.licenseIssueDt) &&
        normDateVal(existingRow.LICENSE_EXPIRY_DT) === normDateVal(incoming.licenseExpiryDt)
    );
}

/**
 * 버스운전 자격번호만 비교 — 동일하면 TS 자격 진위 검증 생략
 */
function isQualCertUnchanged(existingRow, incoming) {
    if (!existingRow) return false;
    return (
        normQualCertForCompare(existingRow.QUAL_CERT_NO) ===
        normQualCertForCompare(incoming.qualCertNo)
    );
}

/**
 * 프로필 저장 API용: 플래그에 따라 TS·면허 검증 (미설정 시 skipped)
 * existingRow: TB_DRIVER_INFO SELECT 결과(수정 시). 최초 등록 시 null.
 */
async function runDriverVerificationsForProfileSetup({
    driverName,
    rrn,
    licenseNo,
    licenseSerialNo,
    qualCertNo,
    licenseType,
    licenseIssueDt,
    licenseExpiryDt,
    existingRow
}) {
    const koroadOn = isEnvFlagTrue('KOROAD_LICENSE_VERIFY_ENABLED');
    const tsOn = isEnvFlagTrue('TS_QUAL_VERIFY_ENABLED');

    const parts = String(rrn || '').trim().split('-');
    const rrnFront = parts[0];
    const backFirst = parts[1] ? parts[1].charAt(0) : '';
    const birthYmd =
        parts.length >= 2 && rrnFront && rrnFront.length === 6 && backFirst
            ? birthYmdFromRrn(rrnFront, backFirst)
            : '';

    const incomingLicense = {
        licenseType,
        licenseNo,
        licenseSerialNo,
        licenseIssueDt,
        licenseExpiryDt
    };
    const skipKoroad =
        existingRow &&
        isLicenseUnchanged(existingRow, incomingLicense);
    const skipTs =
        existingRow &&
        isQualCertUnchanged(existingRow, { qualCertNo });

    const out = {
        license: { skipped: true, reason: skipKoroad ? 'unchanged_from_db' : 'disabled_or_first' },
        qual: { skipped: true, reason: skipTs ? 'unchanged_from_db' : 'disabled_or_first' }
    };

    if (koroadOn && !skipKoroad) {
        if (!licenseNo || !String(licenseNo).trim()) {
            return {
                ok: false,
                message: '운전면허 진위 검증을 켠 상태에서는 면허번호가 필요합니다.'
            };
        }
        if (!driverName || !String(driverName).trim()) {
            return { ok: false, message: '운전면허 진위 검증을 켠 상태에서는 성명이 필요합니다.' };
        }
        if (!birthYmd) {
            return { ok: false, message: '생년월일 유도를 위한 주민번호 형식이 올바르지 않습니다.' };
        }
        out.license = await verifyKoroadDriverLicense({
            driverName,
            birthYmd,
            licenseNo,
            licenseSerialNo
        });
        if (!out.license.ok) {
            return {
                ok: false,
                message: out.license.message || '운전면허 진위 확인에 실패했습니다.',
                detail: out.license
            };
        }
    }

    if (tsOn && !skipTs) {
        if (!qualCertNo || !String(qualCertNo).trim()) {
            return {
                ok: false,
                message: '운수종사자 자격 진위 검증을 켠 상태에서는 자격번호가 필요합니다.'
            };
        }
        if (!driverName || !String(driverName).trim()) {
            return { ok: false, message: '운수종사자 자격 진위 검증을 켠 상태에서는 성명이 필요합니다.' };
        }
        if (!birthYmd) {
            return { ok: false, message: '생년월일 유도를 위한 주민번호 형식이 올바르지 않습니다.' };
        }
        out.qual = await verifyTsWorkerQualification({
            driverName,
            birthYmd,
            qualCertNo
        });
        if (!out.qual.ok) {
            return {
                ok: false,
                message: out.qual.message || '운수종사자 자격 진위 확인에 실패했습니다.',
                detail: out.qual
            };
        }
        console.log('[driverVerification] TS 운수종사자 자격 진위 API 호출 완료');
    } else if (tsOn && skipTs) {
        console.log(
            '[driverVerification] TS 자격 진위 생략: 저장 요청 자격번호가 DB와 동일(하이픈·공백 무시)으로 판단'
        );
    }

    out.qual.tsVerifyEnabled = tsOn;
    out.license.koroadVerifyEnabled = koroadOn;

    return { ok: true, results: out };
}

module.exports = {
    birthYmdFromRrn,
    verifyTsWorkerQualification,
    verifyKoroadDriverLicense,
    runDriverVerificationsForProfileSetup,
    isLicenseUnchanged,
    isQualCertUnchanged
};
