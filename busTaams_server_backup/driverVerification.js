/**
 * 운전면허·운수종사자 자격 진위 연동
 *
 * 운수종사 자격:
 * - KOTSA `KOTSA_QUAL_API_KEY` 설정 시 POST JSON (api.kotsa.or.kr 등) 우선
 * - 미설정 시 공공데이터포털 GET (`PUBLIC_DATA_SERVICE_KEY` 또는 `TS_QUAL_SERVICE_KEY` + `TS_QUAL_VERIFY_URL`)
 */

require('./loadEnv');

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
 * 포털에서 복사한 일반(Encoding) 인증키는 `%2F` 등이 포함될 수 있습니다.
 * `URLSearchParams`가 값을 다시 인코딩하므로, 한 번 디코딩해 두면 이중 인코딩으로 게이트웨이 500이 나는 경우를 줄일 수 있습니다.
 */
function normalizedPublicDataServiceKeyForUrl() {
    let s = String(getPublicDataServiceKey() || '').trim();
    if (!s) return '';
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
        try {
            s = decodeURIComponent(s);
        } catch {
            /* keep 원본 */
        }
    }
    return s.trim();
}

/** 운수종사 자격(GET) 전용. 비우면 `PUBLIC_DATA_SERVICE_KEY` / `DATA_GO_KR_SERVICE_KEY` */
function getTsQualServiceKeyRaw() {
    return String(
        process.env.TS_QUAL_SERVICE_KEY ||
            process.env.PUBLIC_DATA_SERVICE_KEY ||
            process.env.DATA_GO_KR_SERVICE_KEY ||
            ''
    ).trim();
}

/**
 * `TS_QUAL_SKIP_SERVICE_KEY_DECODE=true`면 .env 값을 디코딩하지 않음.
 * 그 외에는 `%xx`가 있으면 한 번 decodeURIComponent 후 URLSearchParams에 넣음(이중 인코딩 방지).
 */
function normalizedTsQualServiceKeyCandidate(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (isEnvFlagTrue('TS_QUAL_SKIP_SERVICE_KEY_DECODE')) {
        return s;
    }
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
        try {
            s = decodeURIComponent(s);
        } catch {
            /* keep */
        }
    }
    return s.trim();
}

function tsQualServiceKeyAttempts() {
    const keyRaw = getTsQualServiceKeyRaw();
    if (!keyRaw) return [];
    const norm = normalizedTsQualServiceKeyCandidate(keyRaw);
    if (norm === keyRaw) {
        return [{ key: norm, label: 'serviceKey' }];
    }
    return [
        { key: norm, label: 'serviceKey(decoded_once)' },
        { key: keyRaw, label: 'serviceKey(env_raw)' },
    ];
}

/**
 * TS_QUAL_VERIFY_URL: 포털 베이스만 넣은 경우(…/lcnsCheckService) 오퍼레이션 경로 /lcnsCheck 보정.
 * apis.data.go.kr 는 https 권장(http 는 https 로 통일).
 */
function normalizeTsQualVerifyUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    let u;
    try {
        u = new URL(s);
    } catch {
        return s;
    }
    if (u.hostname === 'apis.data.go.kr' && u.protocol === 'http:') {
        u.protocol = 'https:';
    }
    const path = u.pathname.replace(/\/+$/, '');
    if (/\/lcnsCheckService$/i.test(path)) {
        u.pathname = `${path}/lcnsCheck`;
    }
    const out = u.toString();
    return out.replace(/\/+$/, '');
}

function tsQualHttpErrorMessage(status, responseText) {
    const preview = String(responseText || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 220);
    if (status === 500 && /unexpected\s*errors/i.test(preview)) {
        return (
            `운수종사자 자격 API HTTP ${status}. ` +
            '공공데이터 게이트웨이에서 "Unexpected errors"는 인증키 오류·해당 API 미승인·엔드포인트 불일치 등에서 흔합니다. ' +
            'data.go.kr에서 B553881 `lcnsCheckService`(운수종사 자격 진위) 등 활용 승인과 `PUBLIC_DATA_SERVICE_KEY`를 확인하세요. ' +
            'KOTSA 자체 API 키가 있다면 `KOTSA_QUAL_API_KEY`로 POST(`api.kotsa.or.kr/.../verify`) 경로를 사용할 수 있습니다.'
        );
    }
    if (status === 401 && /unauthorized/i.test(preview)) {
        return (
            `운수종사자 자격 API HTTP ${status}. ` +
            '게이트웨이가 인증을 거부했습니다. (1) data.go.kr 마이페이지에서 **B553881·lcnsCheck**(또는 사용 중인 동일 서비스) **활용 신청이 승인**됐는지, 인증키를 **최근에 재발급**하지 않았는지 확인하세요. ' +
            '승인 직후에는 반영 지연이 있을 수 있습니다. ' +
            '(2) 일반 인증키는 포털의 **인코딩** / **디코딩** 값 중 Swagger 예시와 같은 종류를 `.env`에 넣어야 합니다. `TS_QUAL_SKIP_SERVICE_KEY_DECODE=true`로 디코딩을 끄거나, `TS_QUAL_SERVICE_KEY=`로 이 API 전용 키만 따로 둘 수 있습니다. ' +
            '(3) `KOTSA_QUAL_API_KEY`가 있으면 공공데이터 대신 KOTSA POST 진위를 씁니다.'
        );
    }
    if (preview) {
        return `운수종사자 자격 API HTTP ${status}. 응답 일부: ${preview}`;
    }
    return `운수종사자 자격 API HTTP ${status}`;
}

function getKotsaQualApiKey() {
    return String(process.env.KOTSA_QUAL_API_KEY || process.env.KOTSA_QUAL_VERIFY_API_KEY || '').trim();
}

function kotsaWorkersQualConfigured() {
    return getKotsaQualApiKey().length > 0;
}

/** KOTSA 명세: residentNo = YYMMDD-XXXXXXX (하이픈 포함 14자리 형태) */
function normalizeKotsaResidentNo(rrn) {
    // 한글 주석: 하이픈이나 공백 등 숫자가 아닌 모든 문자를 제거하고 숫자 13자리 형태를 보장합니다.
    const s = String(rrn || '').replace(/[^0-9]/g, '');
    if (s.length !== 13) return '';
    return `${s.slice(0, 6)}-${s.slice(6)}`;
}

/** 서버가 DB만으로 조립한 뒷자리(성별+000000) — 실제 진위에는 불가 */
function isKotsaSyntheticResidentNo(rrn) {
    const norm = normalizeKotsaResidentNo(rrn);
    if (!norm) return true;
    const back = norm.split('-')[1] || '';
    return /^[1-4]000000$/.test(back);
}

/**
 * 한국교통안전공단(KOTSA) 운송종사자 자격 진위 — POST JSON
 * Body: licenseNo, residentNo, workerName / Header: x-api-key (명칭은 KOTSA_QUAL_API_HEADER 로 덮어쓰기 가능)
 */
async function verifyKotsaWorkerQualification({ workerName, residentNo, licenseNo }) {
    const apiKey = getKotsaQualApiKey();
    const url = (
        process.env.KOTSA_QUAL_VERIFY_URL || 'https://api.kotsa.or.kr/api/qualification/verify'
    ).trim();
    if (!apiKey) {
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_CONFIG',
            message: 'KOTSA_QUAL_API_KEY(또는 KOTSA_QUAL_VERIFY_API_KEY)가 설정되지 않았습니다.',
        };
    }
    const residentNorm = normalizeKotsaResidentNo(residentNo);
    if (!residentNorm) {
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_RRN',
            message: '주민등록번호는 앞 6자리, 하이픈, 뒤 7자리 숫자(YYMMDD-XXXXXXX) 형식이어야 합니다.',
        };
    }
    if (isKotsaSyntheticResidentNo(residentNorm)) {
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_RRN_REAL',
            message:
                'KOTSA 자격 진위는 실제 주민등록번호 뒤 7자리가 필요합니다. 주민번호를 입력한 뒤 다시 시도해 주세요.',
        };
    }

    const headerName = String(process.env.KOTSA_QUAL_API_HEADER || 'x-api-key').trim() || 'x-api-key';
    const payload = {
        licenseNo: String(licenseNo || '').trim(),
        residentNo: residentNorm,
        workerName: String(workerName || '').trim(),
    };

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                [headerName]: apiKey,
            },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_NET',
            message: `KOTSA 자격 API 호출 실패: ${e.message}`,
        };
    }

    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        console.error('[KOTSA_QUAL] 비JSON 응답:', text.slice(0, 800));
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_PARSE',
            message: 'KOTSA 자격 API 응답이 JSON이 아닙니다.',
            detail: text.slice(0, 400),
        };
    }

    if (!res.ok) {
        console.error('[KOTSA_QUAL] HTTP', res.status, body);
        return {
            ok: false,
            skipped: false,
            code: 'KOTSA_HTTP',
            message: body.resultMsg || body.message || `KOTSA 자격 API HTTP ${res.status}`,
            detail: body,
        };
    }

    if (body.isValid === false) {
        return {
            ok: false,
            skipped: false,
            code: body.resultCode || 'KOTSA_INVALID',
            message: body.resultMsg || '운수종사자 자격 진위 결과가 유효하지 않습니다.',
            detail: body,
        };
    }
    if (body.isValid === true) {
        return { ok: true, skipped: false, source: 'KOTSA', detail: body };
    }
    const rc = body.resultCode;
    if (rc === '00' || rc === '0' || rc === 0) {
        return { ok: true, skipped: false, source: 'KOTSA', detail: body };
    }
    return {
        ok: false,
        skipped: false,
        code: rc || 'KOTSA_FAIL',
        message: body.resultMsg || body.message || '운수종사자 자격 진위 확인에 실패했습니다.',
        detail: body,
    };
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
 * 공공데이터 JSON — header는 00인데 body.items 가 빈 경우(불일치·무자료)가 잦음.
 * `items` 키가 없으면 API별 스키마라 추가 판단하지 않음.
 */
function extractTsQualItemsRows(body) {
    if (!body || body._xml || body._parseError) return undefined;
    const b = body.response?.body ?? body.body;
    if (!b || typeof b !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(b, 'items')) return undefined;
    const items = b.items;
    if (items == null) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === 'object' && items.item != null) {
        const it = items.item;
        return Array.isArray(it) ? it : [it];
    }
    return [items];
}

/** header 성공 이후 본문으로 “실질 무응답” 여부만 보조 판단 (명세에 items 없으면 스킵) */
function tsQualNoRowsAfterOkHeader(body) {
    if (isEnvFlagTrue('TS_QUAL_IGNORE_EMPTY_ITEMS')) return null;
    const rows = extractTsQualItemsRows(body);
    if (rows === undefined) return null;
    if (rows.length === 0) {
        return {
            code: 'TS_QUAL_NO_DATA',
            message:
                '자격 진위 조회 결과가 없습니다. 성명·생년월일(주민번호)·자격번호를 등록 정보와 동일하게 입력했는지 확인해 주세요.',
        };
    }
    return null;
}

/**
 * 공공데이터포털 운수종사 자격 진위 — 한국교통안전공단 B553881 lcnsCheckService/lcnsCheck 등
 *
 * 필수 env (TS_QUAL_VERIFY_ENABLED=true 일 때):
 * - PUBLIC_DATA_SERVICE_KEY 또는 DATA_GO_KR_SERVICE_KEY (또는 운수종사 API만 `TS_QUAL_SERVICE_KEY`)
 * - TS_QUAL_VERIFY_URL : Swagger 기준 전체 URL(쿼리 제외). 예:
 *   https://apis.data.go.kr/B553881/lcnsCheckService/lcnsCheck
 *   베이스만(http(s)://…/lcnsCheckService) 넣으면 코드에서 `/lcnsCheck`를 덧붙입니다.
 *
 * 선택 env:
 * - TS_QUAL_SERVICE_KEY — 운수종사 자격 GET만 다른 키를 쓸 때
 * - TS_QUAL_SKIP_SERVICE_KEY_DECODE=true — `.env` 인증키를 decodeURIComponent 하지 않음
 * - TS_QUAL_PARAM_NAME (기본 flnm)
 * - TS_QUAL_PARAM_BIRTH (기본 brdt)
 * - TS_QUAL_PARAM_CERT (기본 qlfcLcnsNo)
 * - TS_QUAL_IGNORE_EMPTY_ITEMS=true — JSON에 body.items 가 있는데 빈 배열이어도 실패 처리하지 않음(보조 검사 생략).
 */
async function verifyDataGoKrTsWorkerQualification({ driverName, birthYmd, qualCertNo }) {
    const attempts = tsQualServiceKeyAttempts();
    const baseUrl = normalizeTsQualVerifyUrl(process.env.TS_QUAL_VERIFY_URL || '');
    if (!attempts.length || !baseUrl) {
        return {
            ok: false,
            skipped: false,
            code: 'TS_QUAL_CONFIG',
            message:
                'TS_QUAL_VERIFY_URL 또는 공공데이터 인증키(`PUBLIC_DATA_SERVICE_KEY`, `TS_QUAL_SERVICE_KEY` 등)가 설정되지 않았습니다.'
        };
    }

    try {
        new URL(baseUrl);
    } catch {
        return { ok: false, code: 'TS_QUAL_URL', message: 'TS_QUAL_VERIFY_URL 형식이 올바르지 않습니다.' };
    }

    const pName = process.env.TS_QUAL_PARAM_NAME || 'flnm';
    const pBirth = process.env.TS_QUAL_PARAM_BIRTH || 'brdt';
    const pCert = process.env.TS_QUAL_PARAM_CERT || 'qlfcLcnsNo';
    const pageNo = String(process.env.TS_QUAL_PAGE_NO || '').trim();
    const numOfRows = String(process.env.TS_QUAL_NUM_OF_ROWS || '').trim();

    for (let i = 0; i < attempts.length; i++) {
        const { key, label } = attempts[i];
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
        if (pageNo && !url.searchParams.has('pageNo')) {
            url.searchParams.set('pageNo', pageNo);
        }
        if (numOfRows && !url.searchParams.has('numOfRows')) {
            url.searchParams.set('numOfRows', numOfRows);
        }

        let res;
        try {
            res = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    Accept: 'application/json, application/xml, text/xml',
                    'User-Agent':
                        String(process.env.DATA_GO_KR_USER_AGENT || '').trim() ||
                        'BusTaams/1.0 (driverVerification)'
                }
            });
        } catch (e) {
            return { ok: false, code: 'TS_QUAL_NET', message: `운수종사자 자격 API 호출 실패: ${e.message}` };
        }

        const text = await res.text();
        const body = parsePublicDataBody(text);

        if (res.ok) {
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

            const noData = !body._xml && tsQualNoRowsAfterOkHeader(body);
            if (noData) {
                return {
                    ok: false,
                    code: noData.code,
                    message: noData.message,
                    detail: body
                };
            }

            return { ok: true, skipped: false, source: 'TS_QUAL', detail: body };
        }

        if (res.status === 401 && i < attempts.length - 1) {
            console.warn(`[TS_QUAL_API] HTTP 401 (${label}), serviceKey 표현을 바꿔 재시도합니다.`);
            continue;
        }

        const safeUrl = url
            .toString()
            .replace(/([?&]serviceKey=)[^&]*/gi, '$1***');
        console.error(
            '[TS_QUAL_API] HTTP 오류',
            res.status,
            res.statusText || '',
            '\n  serviceKey 시도:',
            label,
            '\n  요청 URL(serviceKey 마스킹):',
            safeUrl
        );
        console.error('[TS_QUAL_API] 응답 본문 앞부분:', text.slice(0, 1200));
        return {
            ok: false,
            code: 'TS_QUAL_HTTP',
            message: tsQualHttpErrorMessage(res.status, text),
            detail: body
        };
    }

    return {
        ok: false,
        skipped: false,
        code: 'TS_QUAL_HTTP',
        message: '운수종사자 자격 API 요청에 실패했습니다.'
    };
}

/**
 * 운수종사 자격 진위: KOTSA_QUAL_API_KEY 있으면 POST(KOTSA) 우선, 주민번호가 KOTSA 조건을 못 맞추면
 * 공공데이터 URL·키가 있을 때만 GET(B553881 lcnsCheck 등)로 대체.
 */
async function verifyTsWorkerQualification({ driverName, birthYmd, qualCertNo, rrn }) {
    const kotsaOn = kotsaWorkersQualConfigured();
    const rrnNorm = normalizeKotsaResidentNo(rrn);
    const canKotsa = kotsaOn && rrnNorm && !isKotsaSyntheticResidentNo(rrn);

    if (canKotsa) {
        return verifyKotsaWorkerQualification({
            workerName: driverName,
            residentNo: rrn,
            licenseNo: qualCertNo,
        });
    }

    if (kotsaOn && !canKotsa) {
        const key = getTsQualServiceKeyRaw();
        const baseUrl = normalizeTsQualVerifyUrl(process.env.TS_QUAL_VERIFY_URL || '');
        if (key && baseUrl) {
            return verifyDataGoKrTsWorkerQualification({ driverName, birthYmd, qualCertNo });
        }
        return verifyKotsaWorkerQualification({
            workerName: driverName,
            residentNo: rrn,
            licenseNo: qualCertNo,
        });
    }

    return verifyDataGoKrTsWorkerQualification({ driverName, birthYmd, qualCertNo });
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
    const dbQual =
        existingRow.QUAL_CERT_NO !== undefined && existingRow.QUAL_CERT_NO !== null
            ? existingRow.QUAL_CERT_NO
            : existingRow.qual_cert_no;
    return (
        normQualCertForCompare(dbQual) === normQualCertForCompare(incoming.qualCertNo)
    );
}

/**
 * 프로필 저장 API용: 플래그에 따라 TS·면허 검증 (미설정 시 skipped)
 * existingRow: TB_DRIVER_DETAIL의 면허·자격 컬럼 SELECT 결과(수정 시). 최초 등록 시 null.
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

    // 한글 주석: 하이픈 포함 여부에 구애받지 않도록 숫자만 추출하여 앞자리 6자리와 뒷자리 첫 번째 자리를 유도합니다.
    const cleanDigits = String(rrn || '').replace(/[^0-9]/g, '');
    const rrnFront = cleanDigits.slice(0, 6);
    const backFirst = cleanDigits.slice(6, 7);
    const birthYmd =
        rrnFront.length === 6 && backFirst
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
    /** 자격번호 미입력이거나 DB와 동일(하이픈·공백 무시)이면 TS 자격 진위 호출 안 함 */
    const skipTsEmpty = !normQualCertForCompare(qualCertNo);
    const skipTsUnchanged =
        !skipTsEmpty && existingRow && isQualCertUnchanged(existingRow, { qualCertNo });
    const skipTs = skipTsEmpty || skipTsUnchanged;
    const qualSkipReason = skipTsEmpty
        ? 'empty_qual_no_verify'
        : skipTsUnchanged
          ? 'unchanged_from_db'
          : 'disabled_or_first';

    const out = {
        license: { skipped: true, reason: skipKoroad ? 'unchanged_from_db' : 'disabled_or_first' },
        qual: { skipped: true, reason: qualSkipReason }
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
            qualCertNo,
            rrn,
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
            skipTsEmpty
                ? '[driverVerification] TS 자격 진위 생략: 자격번호 미입력'
                : '[driverVerification] TS 자격 진위 생략: 저장 요청 자격번호가 DB와 동일(하이픈·공백 무시)으로 판단'
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
