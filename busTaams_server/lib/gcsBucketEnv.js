'use strict';

/** env 미설정 시 TB_FILE_MASTER 등 `GCS_BUCKET_NM` 폴백(공백 없음) */
const GCS_BUCKET_NM_FALLBACK = 'https://storage.googleapis.com/bustaams-secure-data';

/** `@google-cloud/storage` 폴백 버킷 ID (항상 버킷 이름만) */
const GCS_BUCKET_ID_FALLBACK = 'bustaams-secure-data';

/**
 * `GCS_BUCKET_NM` 에 버킷명만 있거나 `https://storage.googleapis.com/<bucket>` / `gs://<bucket>` 도 허용
 * @param {string|null|undefined} spec
 * @returns {string}
 */
function normalizeGcsBucketIdFromSpec(spec) {
    const raw = String(spec ?? '').trim();
    if (!raw) return '';
    const https = /^https?:\/\/storage\.googleapis\.com\/([^/?#]+)\/?/i.exec(raw);
    if (https) return https[1].trim();
    const gs = /^gs:\/\/([^/?#]+)\/?/i.exec(raw);
    if (gs) return gs[1].trim();
    return raw;
}

/** TB_FILE_MASTER 등에 기록하는 `GCS_BUCKET_NM` 후보 */
function gcsBucketNmFromEnv() {
    const v = process.env.GCS_BUCKET_NAME;
    return v != null && String(v).trim() !== '' ? String(v).trim() : GCS_BUCKET_NM_FALLBACK;
}

/** Storage SDK `bucket()` 인자용 버킷 ID */
function gcsBucketIdForSdk(spec = gcsBucketNmFromEnv()) {
    return normalizeGcsBucketIdFromSpec(spec) || GCS_BUCKET_ID_FALLBACK;
}

module.exports = {
    GCS_BUCKET_NM_FALLBACK,
    GCS_BUCKET_ID_FALLBACK,
    normalizeGcsBucketIdFromSpec,
    gcsBucketNmFromEnv,
    gcsBucketIdForSdk,
};
