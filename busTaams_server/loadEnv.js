'use strict';
/**
 * `process.cwd()`와 무관하게 `busTaams_server/.env`를 읽는다.
 * - `dotenv.config({ path })`만 쓰면 환경에 따라 0개 주입되는 경우가 있어,
 *   파일을 직접 읽은 뒤 `dotenv.parse`로 `process.env`에 반영한다.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');

try {
    if (!fs.existsSync(envPath)) {
        console.error('[loadEnv] .env 파일이 없습니다:', envPath);
    } else {
        let raw = fs.readFileSync(envPath, 'utf8');
        if (raw.charCodeAt(0) === 0xfeff) {
            raw = raw.slice(1);
        }
        const parsed = dotenv.parse(raw);
        const keys = Object.keys(parsed);
        for (let i = 0; i < keys.length; i += 1) {
            const k = keys[i];
            if (process.env[k] !== undefined) continue;
            process.env[k] = parsed[k];
        }
        if (keys.length === 0 && raw.trim().length > 0) {
            console.error(
                '[loadEnv] .env에 파싱된 키가 없습니다(BOM·인코딩·형식 확인):',
                envPath
            );
        }
    }
} catch (e) {
    console.error('[loadEnv] .env 읽기 실패:', envPath, e.message);
}
