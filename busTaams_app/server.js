/**
 * 실제 API 진입점은 `busTaams_server/server.js` 입니다.
 * 웹 디렉터리에서 `node server.js` 를 실행한 경우에도 동일하게 API 서버가 뜨도록
 * 해당 모듈을 같은 Node 프로세스에서 subprocess 로 기동합니다.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, '../busTaams_server');
const apiScript = path.join(apiDir, 'server.js');

const result = spawnSync(process.execPath, [apiScript], {
  cwd: apiDir,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
