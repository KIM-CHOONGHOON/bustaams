# BATCH 환경 설정 및 프로그램 개발 방법

이 문서는 busTaams 배치 프로그램을 새로 개발할 때 필요한 환경 설정, 프로그램 작성 규칙, 로컬 실행 방법, 운영 배치 실행 방법을 정리한다.

현재 저장소에는 별도 배치 프레임워크나 스케줄러 설정 파일이 없으므로, 배치는 `busTaams_server`의 Node.js 환경과 공통 유틸리티를 재사용하는 방식으로 작성한다.

## 1. 기본 원칙

- 배치 코드는 서버와 같은 Node.js 런타임에서 실행한다.
- DB 연결, 환경 변수, 암복호화, GCS 접근은 `busTaams_server`의 기존 설정을 재사용한다.
- 운영 DB 스키마를 배치 코드에서 변경하지 않는다. 필요한 컬럼 존재 여부는 조회로 확인하고, 없으면 기능을 제한하거나 명확한 오류를 남긴다.
- `.env`, Firebase Admin 키, GCP 서비스 계정 키 등 비밀 파일은 절대 커밋하지 않는다.
- 배치는 재실행 가능하게 작성한다. 같은 작업이 중복 실행되어도 데이터가 깨지지 않도록 처리 기준일, 상태값, 고유 키 등을 명확히 둔다.

## 2. 권장 디렉터리 구조

배치 코드는 서버 하위에 별도 디렉터리를 두는 것을 권장한다.

```text
busTaams_server/
  batch/
    jobs/
      sampleJob.js
    lib/
      batchLogger.js
      batchRunner.js
```

예시 역할:

- `batch/jobs/*.js`: 실제 업무 배치 단위
- `batch/lib/batchRunner.js`: 공통 실행 래퍼, 에러 처리, 종료 코드 처리
- `batch/lib/batchLogger.js`: 로그 포맷 통일

## 3. 환경 변수 설정 순서

### 3.1 서버 환경 파일 준비

`busTaams_server/.env.example`을 기준으로 `busTaams_server/.env`를 준비한다.

```bash
cd busTaams_server
cp .env.example .env
```

`.env`는 `.gitignore` 대상이며 커밋하지 않는다.

### 3.2 필수 DB 환경 변수

배치가 DB를 조회하거나 갱신한다면 아래 값이 필요하다.

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bustaams
DB_LOG_CONN=0
```

운영에서는 로컬 값이 아닌 운영 접속 정보를 사용한다. 현재 CAFE24 DB 연결 정보 기준은 아래와 같다.

```env
DB_HOST=1.234.65.153
DB_PORT=3306
DB_USER=bustaams
DB_PASSWORD=********
DB_NAME=bustaams_db
DB_LOG_CONN=0
```

`DB_PASSWORD` 실제 값은 문서에 평문으로 남기지 말고 `bustaams_batch/.env`, 운영 환경 변수, 또는 시크릿 저장소에만 설정한다.

### 3.3 암복호화 키

`TB_USER` 등 암호화된 개인정보 필드를 읽거나 쓰는 배치는 서버와 같은 `ENCRYPTION_KEY`를 사용해야 한다.

```env
ENCRYPTION_KEY=64자리_hex_문자열
```

기존 데이터는 같은 키로만 복호화할 수 있으므로, 배치용으로 별도 키를 만들면 안 된다.

### 3.4 Google Cloud Storage 환경 변수

GCS 파일을 읽거나 쓰는 배치는 아래 값을 맞춘다.

```env
GCS_BUCKET_NAME=bustaams-secure-data
```

서비스 계정 인증은 셸 환경 변수로 지정한다.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/절대경로/service-account.json
```

`firebase-admin-key.json`, `*-service-account*.json`, `*-credentials*.json` 파일은 `.gitignore` 대상이며 커밋하지 않는다.

### 3.5 Firebase Admin

Firebase Admin이 필요한 배치라면 다음 값을 사용한다.

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-admin-key.json
```

경로는 `busTaams_server` 기준 상대 경로다.

### 3.6 외부 API 연동 환경 변수

운수종사 자격 진위, 운전면허 진위 등 외부 API를 배치에서 호출한다면 기존 서버 환경 변수를 재사용한다.

```env
TS_QUAL_VERIFY_ENABLED=false
PUBLIC_DATA_SERVICE_KEY=
TS_QUAL_SERVICE_KEY=
TS_QUAL_VERIFY_URL=
KOTSA_QUAL_API_KEY=
KOTSA_QUAL_VERIFY_URL=https://api.kotsa.or.kr/api/qualification/verify
KOROAD_LICENSE_VERIFY_ENABLED=false
KOROAD_LICENSE_VERIFY_URL=
KOROAD_LICENSE_API_KEY=
```

외부 API 키는 운영 Secret Manager 또는 서버 환경 변수 주입 방식을 우선 사용한다.

## 4. 배치 프로그램 작성 순서

### 4.1 환경 로드

배치 진입점의 첫 줄에서 `loadEnv.js`를 불러온다.

```js
require('../../loadEnv');
```

`loadEnv.js`는 실행 위치와 무관하게 `busTaams_server/.env`를 읽는다.

### 4.2 DB 연결

서버와 같은 `db.js`의 `pool`을 사용한다.

```js
const { pool } = require('../../db');
```

트랜잭션이 필요한 작업은 `pool.getConnection()`으로 커넥션을 얻고 `beginTransaction`, `commit`, `rollback`, `release` 흐름을 명확히 작성한다.

### 4.3 실행 함수 작성

배치 본문은 `async function main()` 형태로 작성한다.

```js
require('../../loadEnv');

const { pool } = require('../../db');

async function main() {
    const startedAt = new Date();
    console.log('[sampleJob] start', startedAt.toISOString());

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // TODO: 배치 업무 로직 작성
        // 예: 처리 대상 SELECT, 상태 검증, 필요한 UPDATE/INSERT 수행

        await connection.commit();
        console.log('[sampleJob] success');
    } catch (error) {
        await connection.rollback();
        console.error('[sampleJob] failed:', error);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
    }
}

main().catch(async (error) => {
    console.error('[sampleJob] fatal:', error);
    try {
        await pool.end();
    } catch (_) {
        // ignore
    }
    process.exit(1);
});
```

### 4.4 처리 대상 선정

배치는 반드시 처리 범위를 제한한다.

- 처리 기준일 또는 기준 시간
- 처리 상태값
- 최대 처리 건수
- 재처리 가능 여부
- 이미 처리된 데이터 제외 조건

예시:

```js
const limit = Number(process.env.BATCH_LIMIT || 100);
const [rows] = await connection.execute(
    `SELECT REQ_ID, DATA_STAT
       FROM TB_AUCTION_REQ
      WHERE DATA_STAT = ?
      ORDER BY REG_DT ASC
      LIMIT ?`,
    ['READY', limit]
);
```

### 4.5 컬럼 존재 여부 확인

운영 스키마와 개발 스키마가 다를 수 있으므로, 선택 컬럼은 `INFORMATION_SCHEMA` 조회로 존재 여부를 확인한다.

```js
async function tableColumnExists(connection, tableName, columnName) {
    const [rows] = await connection.execute(
        `SELECT 1
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
          LIMIT 1`,
        [tableName, columnName]
    );
    return rows.length > 0;
}
```

스키마 변경은 배치 코드에서 하지 않는다.

### 4.6 로그 작성

로그는 운영자가 원인을 추적할 수 있도록 최소한 다음을 남긴다.

- 배치명
- 시작/종료 시각
- 처리 대상 수
- 성공/실패 수
- 실패한 식별자
- 에러 메시지

예시:

```js
console.log('[settlementBatch] targetCount=', rows.length);
console.error('[settlementBatch] failed item=', itemId, error.message);
```

## 5. 로컬 실행 방법

### 5.1 의존성 설치

```bash
cd busTaams_server
npm install
```

### 5.2 환경 변수 확인

```bash
cd busTaams_server
node -e "require('./loadEnv'); console.log(process.env.DB_NAME, process.env.GCS_BUCKET_NAME)"
```

비밀값 전체를 출력하지 않는다.

### 5.3 배치 직접 실행

예시 배치 파일이 `busTaams_server/batch/jobs/sampleJob.js` 라면 다음처럼 실행한다.

```bash
cd busTaams_server
node batch/jobs/sampleJob.js
```

성공 시 종료 코드 `0`, 실패 시 종료 코드 `1`이 되도록 작성한다.

### 5.4 실행 옵션 전달

단순 옵션은 환경 변수로 전달한다.

```bash
cd busTaams_server
BATCH_LIMIT=50 BATCH_DRY_RUN=true node batch/jobs/sampleJob.js
```

권장 옵션:

- `BATCH_LIMIT`: 1회 최대 처리 건수
- `BATCH_DRY_RUN`: 실제 갱신 없이 대상과 결과만 로그로 확인
- `BATCH_TARGET_DATE`: 특정 기준일 처리
- `BATCH_LOCK_KEY`: 중복 실행 방지용 키

## 6. 운영 실행 방법

### 6.1 Linux cron

서버에서 직접 실행하는 방식이다.

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json

*/10 * * * * cd /app/bus-taams/busTaams_server && /usr/local/bin/node batch/jobs/sampleJob.js >> /var/log/bustaams/sampleJob.log 2>&1
```

주의:

- cron은 로그인 셸 환경을 그대로 물려받지 않는다.
- 필요한 환경 변수는 crontab에 명시하거나 실행 래퍼 스크립트에서 export 한다.
- 로그 파일 회전 정책을 별도로 둔다.

### 6.2 실행 래퍼 스크립트

운영에서는 직접 crontab에 긴 명령을 넣기보다 래퍼 스크립트를 두는 방식이 관리하기 쉽다.

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /app/bus-taams/busTaams_server
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json

node batch/jobs/sampleJob.js
```

스크립트 파일은 실행 권한을 부여한다.

```bash
chmod +x /app/bus-taams/busTaams_server/batch/run-sample-job.sh
```

### 6.3 Cloud Scheduler 또는 Kubernetes CronJob

GCP 기반 운영에서는 다음 중 하나를 선택한다.

- Cloud Scheduler가 Cloud Run Job 또는 HTTP 엔드포인트를 호출
- Kubernetes CronJob으로 컨테이너 실행
- VM cron으로 Node 스크립트 실행

권장 기준:

- 단순 주기 작업: VM cron 또는 Cloud Scheduler
- 컨테이너 배포 표준이 있으면: Kubernetes CronJob 또는 Cloud Run Job
- 외부에서 트리거해야 하면: 인증된 HTTP 엔드포인트

## 7. 중복 실행 방지

운영 배치는 같은 시간에 두 번 실행될 수 있다. 다음 중 하나를 선택한다.

### 7.1 DB 기반 잠금

MySQL의 named lock을 사용할 수 있다.

```js
async function acquireLock(connection, lockName, timeoutSec = 0) {
    const [rows] = await connection.execute('SELECT GET_LOCK(?, ?) AS locked', [lockName, timeoutSec]);
    return rows[0]?.locked === 1;
}

async function releaseLock(connection, lockName) {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
}
```

주의:

- 락은 같은 DB 커넥션 생명주기에 묶인다.
- 작업이 길면 연결 끊김과 타임아웃을 고려한다.

### 7.2 상태 기반 멱등 처리

처리 대상에 상태값이 있다면 다음 순서로 처리한다.

1. 처리 대상 조회
2. 처리 중 상태로 변경
3. 실제 업무 처리
4. 완료 또는 실패 상태로 변경

단, 이때도 상태 전이 조건을 명확히 둬야 한다.

## 8. 트랜잭션 기준

짧은 단위 작업은 한 트랜잭션으로 묶는다.

```js
const connection = await pool.getConnection();
try {
    await connection.beginTransaction();
    // 업무 처리
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

대량 배치는 전체를 하나의 트랜잭션으로 묶지 않는다.

- 100건씩 끊어서 처리
- 건별 실패가 전체 실패로 번지지 않게 설계
- 실패 건은 식별자와 에러 메시지를 로그로 남김

## 9. GCS 파일 처리 기준

GCS 접근은 기존 서버와 같은 라이브러리를 사용한다.

```js
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'bustaams-secure-data';
const bucket = storage.bucket(bucketName);
```

파일 DB 컬럼에 전체 URL을 저장하는 기능과 객체 키만 저장하는 기능이 혼재할 수 있으므로, 읽을 때는 URL에서 객체 키를 복원하는 유틸리티를 두는 것이 안전하다.

```js
function normalizeGcsObjectPath(pathRaw) {
    const raw = String(pathRaw || '').trim();
    const match = /^https?:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/i.exec(raw);
    return match ? decodeURIComponent(match[1]) : raw.replace(/^\/+/, '');
}
```

## 10. 검증 및 배포 체크리스트

개발 완료 후 다음을 확인한다.

- `.env` 없이도 명확한 오류를 내는가
- DB 연결 실패 로그가 충분한가
- 운영 스키마 변경 시도를 하지 않는가
- 같은 배치를 두 번 실행해도 데이터가 깨지지 않는가
- `BATCH_DRY_RUN=true`로 대상 확인이 가능한가
- 실패 시 종료 코드가 `1`인가
- 성공 시 `pool.end()`로 DB 연결을 닫는가
- GCS 인증 파일 경로가 운영에 주입되는가
- 로그 파일 위치와 보관 정책이 정해졌는가

문법 확인 예시:

```bash
cd busTaams_server
node --check batch/jobs/sampleJob.js
```

DDL 금지 검사는 로컬에서 다음 명령으로 확인한다.

```bash
bash scripts/ci/check-bustaams-no-ddl.sh
```

## 11. 배치 작업 온라인 관리 프로그램

운영 배치는 실패했을 때 서버 로그만 보고 조치하기 어렵다. 따라서 관리자 화면에서 배치 실행 이력을 조회하고, 실패 건을 재실행할 수 있는 온라인 관리 프로그램이 필요하다.

### 11.1 필요한 기능

- 배치 작업 목록 조회: 배치 ID, 배치명, 설명, 실행 주기, 사용 여부
- 배치 실행 이력 조회: 시작 시각, 종료 시각, 실행 상태, 처리 건수, 성공 건수, 실패 건수
- 오류 상세 조회: 오류 코드, 오류 메시지, 실패한 대상 식별자, stack trace 또는 상세 로그
- 재실행 요청: 실패한 배치 또는 특정 실행 회차를 기준으로 재실행 요청
- 재실행 가능 여부 표시: 자동 재실행 가능, 수동 확인 필요, 재실행 불가
- 중복 실행 방지: 이미 실행 중인 배치는 재실행 버튼 비활성화
- dry-run 실행: 실제 갱신 없이 대상 건수와 예상 처리 결과 확인
- 운영자 메모: 장애 조치 내용, 재처리 사유, 확인자 기록

### 11.2 재실행 정책

재실행 버튼은 모든 실패 배치에 무조건 열면 안 된다. 배치별로 재실행 가능 여부를 정의한다.

- `RETRYABLE`: 같은 기준으로 재실행 가능
- `MANUAL_CHECK_REQUIRED`: 운영자가 원인 확인 후 재실행 가능
- `NOT_RETRYABLE`: 데이터 중복, 외부 전송 중복 위험 때문에 재실행 불가

외부 전송이 있는 배치(예: 국세청 세금계산서 전송, 카드 결제)는 같은 요청이 중복 전송되지 않도록 외부기관 요청 키, 승인 번호, 전송 상태를 반드시 확인해야 한다.

### 11.3 온라인 재실행 흐름

1. 관리자가 배치 Dashboard에서 실패 실행 건을 선택한다.
2. 화면은 배치명, 기준일, 처리 대상, 오류 메시지, 재실행 가능 여부를 표시한다.
3. 관리자가 재실행 사유를 입력한다.
4. 서버는 해당 배치가 실행 중인지 확인한다.
5. 서버는 재실행 요청 이력을 남긴다.
6. 배치 실행기는 요청 상태를 읽거나, 관리자 API가 별도 실행 명령을 전달한다.
7. 재실행 결과를 기존 실행 건과 연결해 기록한다.

### 11.4 배치 관리를 위한 주요 등록 온라인 거래 (API/화면 기능)

배치 작업을 효율적으로 관리하기 위해 관리자 화면(온라인 환경)에서 제공해야 하는 주요 등록 온라인 거래(API 및 화면 기능)는 다음과 같습니다.

1. **배치 작업 등록/수정 거래 (Master Management)**
   - **설명**: 새로운 배치 작업을 시스템에 등록하거나 기존 배치 설정을 수정합니다.
   - **주요 기능**: 배치 ID, 배치명, 실행 파일 경로, 재실행 정책, 최대 시도 횟수 등의 정보를 `TB_BATCH_JOB_MST` 테이블에 등록/갱신합니다.
   - **온라인 트랜잭션**: `POST /api/admin/batch/jobs`, `PUT /api/admin/batch/jobs/:id`

2. **배치 스케줄 등록/변경 거래 (Schedule Management)**
   - **설명**: 등록된 배치 작업이 주기적으로 자동 실행될 수 있도록 스케줄 기준을 설정합니다.
   - **주요 기능**: 실행 시간, 수행 월/일/요일 및 기준일 계산 규칙, 휴일 처리 방식을 설정하고 `TB_BATCH_SCHED` 테이블에 등록합니다.
   - **온라인 트랜잭션**: `POST /api/admin/batch/schedules`, `PUT /api/admin/batch/schedules/:id`

3. **수동 배치 실행/계획 추가 거래 (On-Demand Execution)**
   - **설명**: 정기 스케줄 외에 특정 시점에 특정 처리 기준일의 배치를 수동으로 실행하고 싶을 때 사용합니다.
   - **주요 기능**: 수행일자(`JOB_DT`)와 회차(`JOB_ROUND`)를 입력하여 당일 수행 계획(`TB_BATCH_PLAN`)에 `MANUAL` 유형으로 `READY` 상태 계획을 수동 추가합니다.
   - **온라인 트랜잭션**: `POST /api/admin/batch/plans`

4. **실패 배치 재실행 요청 거래 (Retry Request)**
   - **설명**: 배치가 비정상 종료(FAILED)되었을 때, 이를 안전하게 다시 실행할 수 있도록 요청을 등록합니다.
   - **주요 기능**: 실패한 원본 실행 ID(`ORIG_EXEC_ID`)와 재실행 사유를 입력하여 `TB_BATCH_RETRY_REQ` 테이블에 `REQUESTED` 상태로 등록합니다.
   - **온라인 트랜잭션**: `POST /api/admin/batch/retries`

5. **재실행 요청 승인 및 실행 거래 (Retry Approval & Execution)**
   - **설명**: 등록된 재실행 요청을 검토하고 승인하여 배치를 즉시 또는 다음 배치 실행 사이클에 구동되도록 지시합니다.
   - **주요 기능**: `TB_BATCH_RETRY_REQ`의 상태를 `APPROVED`로 변경하고, 신규 실행 계획/이력을 생성하여 배치 프로그램이 연동될 수 있도록 기동 API를 호출합니다.
   - **온라인 트랜잭션**: `POST /api/admin/batch/retries/:id/approve`

6. **배치 실행 잠금 강제 해제 거래 (Force Unlock)**
   - **설명**: 서버 비정상 종료 등으로 인해 배치 락이 해제되지 않고 남아있는 경우, 이를 강제로 삭제하여 배치가 다시 실행될 수 있도록 조치합니다.
   - **주요 기능**: `TB_BATCH_LOCK` 테이블에서 특정 배치 잠금키(`LOCK_KEY`)를 강제 삭제합니다.
   - **온라인 트랜잭션**: `DELETE /api/admin/batch/locks/:key`

## 12. 배치 실행 정보 관리 테이블

배치 작업의 정상 종료, 오류 종료, 재실행 여부를 관리하려면 실행 정보를 저장하는 테이블이 필요하다. 이 저장소에서는 운영 DB에 대한 DDL을 배치 코드에 넣지 않으므로, 테이블 생성은 DBA 또는 승인된 마이그레이션 절차에서 별도로 처리한다.

배치 관리 테이블은 크게 다음 영역으로 나눈다.
- **배치 작업 등록**: 어떤 배치를 언제, 어떤 실행 조건으로 수행할지 관리
- **배치 수행 계획/대상일**: 일·월·년·수시 배치가 특정 수행일자와 회차로 실행될 수 있게 관리
- **배치 수행 결과**: 실제 실행된 결과, 실패 사유, 재실행 관계, 처리 건수를 관리
- **배치 처리 상세**: 업무 키 단위 처리 결과 관리 (외부 전송, 결제, 세금계산서 등 추적용)
- **배치 락/실행 중 상태**: 중복 실행 방지용 실행 잠금 관리
- **배치 재실행 요청**: 실패 실행 건에 대한 재실행 요청과 승인 상태 관리
- **배치 알림 이력**: 실패, 지연, 성공 요약 알림 기록

### 12.1 테이블 설계 및 생성 쿼리 (DDL)

모든 배치 관리 테이블 설계 시, 운영자가 조회 및 대조하기 쉽도록 **UUID 형식의 컬럼을 절대 사용하지 않으며**, 자동 증가값(`AUTO_INCREMENT`), 날짜 기반 번호, 또는 업무 코드 기반 식별자를 기본 키로 사용한다. 또한, 모든 테이블과 컬럼에는 역할을 쉽게 추적할 수 있도록 `COMMENT`를 명확히 작성한다.

#### 1) 배치 작업 마스터 테이블 (`TB_BATCH_JOB_MST`)
배치 작업 자체의 정의 및 재실행 가능 여부 등의 정책을 관리한다.

```sql
CREATE TABLE TB_BATCH_JOB_MST (
    BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
    BATCH_JOB_NM VARCHAR(100) NOT NULL COMMENT '배치작업명',
    JOB_DESC VARCHAR(500) COMMENT '작업설명',
    EXEC_FILE_PATH VARCHAR(200) NOT NULL COMMENT '실행파일경로',
    EXEC_CYCLE VARCHAR(10) NOT NULL COMMENT '실행주기(DAILY,MONTHLY,YEARLY,ON_DEMAND)',
    USE_YN CHAR(1) DEFAULT 'Y' NOT NULL COMMENT '사용여부(Y,N)',
    RETRY_POLICY VARCHAR(30) DEFAULT 'RETRYABLE' NOT NULL COMMENT '재실행가능정책(RETRYABLE,MANUAL_CHECK_REQUIRED,NOT_RETRYABLE)',
    MAX_RETRY_CNT INT DEFAULT 3 NOT NULL COMMENT '최대재시도횟수',
    REG_USR_ID VARCHAR(10) DEFAULT 'SYSTEM' NOT NULL COMMENT '등록자ID (TB_USER.CUST_ID)',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '등록일시',
    MOD_USR_ID VARCHAR(10) COMMENT '수정자ID (TB_USER.CUST_ID)',
    MOD_DT DATETIME COMMENT '수정일시',
    PRIMARY KEY (BATCH_JOB_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치작업마스터';
```

#### 2) 배치 스케줄 등록 테이블 (`TB_BATCH_SCHED`)
배치 실행기가 매일 읽어서 당일 실행해야 할 작업을 판단하는 스케줄 기준을 관리한다.

```sql
CREATE TABLE TB_BATCH_SCHED (
    SCHED_ID INT AUTO_INCREMENT NOT NULL COMMENT '스케줄ID',
    BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
    EXEC_TIME TIME NOT NULL COMMENT '수행시간',
    EXEC_MONTH VARCHAR(2) DEFAULT '*' NOT NULL COMMENT '수행월(1~12 또는 *)',
    EXEC_DAY VARCHAR(2) DEFAULT '*' NOT NULL COMMENT '수행일(1~31 또는 *)',
    EXEC_DOW VARCHAR(7) DEFAULT '*' NOT NULL COMMENT '수행요일(1:일~7:토 또는 *)',
    CALC_RULE VARCHAR(10) DEFAULT 'T' NOT NULL COMMENT '기준일계산규칙(T:당일,T-1:전일,M-1:전월)',
    HOLIDAY_RULE VARCHAR(20) DEFAULT 'RUN' NOT NULL COMMENT '휴일처리방식(RUN:휴일실행,PREV_BIZ:전영업일,NEXT_BIZ:다음영업일)',
    USE_YN CHAR(1) DEFAULT 'Y' NOT NULL COMMENT '사용여부(Y,N)',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '등록일시',
    PRIMARY KEY (SCHED_ID),
    FOREIGN KEY (BATCH_JOB_ID) REFERENCES TB_BATCH_JOB_MST (BATCH_JOB_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치스케줄등록';
```

#### 3) 배치 수행 계획 테이블 (`TB_BATCH_PLAN`)
특정 수행일자 및 회차별로 자동 생성된 실행 예정 목록 또는 수동 추가 목록을 관리한다.

```sql
CREATE TABLE TB_BATCH_PLAN (
    PLAN_ID BIGINT AUTO_INCREMENT NOT NULL COMMENT '수행계획ID',
    BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
    JOB_DT DATE NOT NULL COMMENT '수행일자',
    JOB_ROUND INT DEFAULT 1 NOT NULL COMMENT '수행회차',
    PLAN_STAT VARCHAR(10) DEFAULT 'READY' NOT NULL COMMENT '계획상태(READY,RUNNING,SUCCESS,FAILED)',
    PLAN_TYPE VARCHAR(10) DEFAULT 'AUTO' NOT NULL COMMENT '계획유형(AUTO,MANUAL)',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '등록일시',
    PRIMARY KEY (PLAN_ID),
    UNIQUE KEY UQ_BATCH_PLAN (BATCH_JOB_ID, JOB_DT, JOB_ROUND),
    FOREIGN KEY (BATCH_JOB_ID) REFERENCES TB_BATCH_JOB_MST (BATCH_JOB_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치수행계획';
```

#### 4) 배치 실행 결과/이력 테이블 (`TB_BATCH_HIST`)
배치가 실제 실행된 결과 상태와 시작/종료 시각, 처리 건수를 기록한다.

```sql
CREATE TABLE TB_BATCH_HIST (
    EXEC_ID BIGINT AUTO_INCREMENT NOT NULL COMMENT '배치실행ID',
    BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
    JOB_DT DATE NOT NULL COMMENT '수행일자',
    JOB_ROUND INT DEFAULT 1 NOT NULL COMMENT '수행회차',
    EXEC_STAT VARCHAR(10) DEFAULT 'READY' NOT NULL COMMENT '실행상태(READY,RUNNING,SUCCESS,FAILED,CANCELED)',
    START_DT DATETIME COMMENT '시작시각',
    END_DT DATETIME COMMENT '종료시각',
    TARGET_CNT INT DEFAULT 0 NOT NULL COMMENT '전체대상건수',
    SUCC_CNT INT DEFAULT 0 NOT NULL COMMENT '성공건수',
    FAIL_CNT INT DEFAULT 0 NOT NULL COMMENT '실패건수',
    DRY_RUN_YN CHAR(1) DEFAULT 'N' NOT NULL COMMENT 'dry-run여부(Y,N)',
    ERR_CD VARCHAR(50) COMMENT '오류코드',
    ERR_MSG VARCHAR(1000) COMMENT '오류메시지',
    ORIG_EXEC_ID BIGINT COMMENT '재실행원본실행ID',
    REQ_USR_ID VARCHAR(10) COMMENT '요청자ID (TB_USER.CUST_ID)',
    REQ_REASON VARCHAR(500) COMMENT '요청사유',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '등록일시',
    PRIMARY KEY (EXEC_ID),
    UNIQUE KEY UQ_BATCH_HIST (BATCH_JOB_ID, JOB_DT, JOB_ROUND),
    FOREIGN KEY (BATCH_JOB_ID) REFERENCES TB_BATCH_JOB_MST (BATCH_JOB_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치실행결과이력';
```

#### 5) 배치 처리 상세 테이블 (`TB_BATCH_DTL`)
외부 전송이나 카드 결제, 세금계산서 발행과 같이 건별 성공/실패 추적 및 재시도가 중요한 배치의 세부 내역을 기록한다.

```sql
CREATE TABLE TB_BATCH_DTL (
    DTL_ID BIGINT AUTO_INCREMENT NOT NULL COMMENT '상세ID',
    EXEC_ID BIGINT NOT NULL COMMENT '배치실행ID',
    TARGET_KEY VARCHAR(50) NOT NULL COMMENT '대상업무키',
    TARGET_TABLE VARCHAR(50) NOT NULL COMMENT '대상테이블명',
    BEFORE_STAT VARCHAR(20) COMMENT '처리전상태',
    AFTER_STAT VARCHAR(20) COMMENT '처리후상태',
    WORK_STAT VARCHAR(10) NOT NULL COMMENT '처리상태(SUCCESS,FAILED)',
    ERR_MSG VARCHAR(1000) COMMENT '오류메시지',
    EXT_REQ_ID VARCHAR(100) COMMENT '외부기관요청ID',
    EXT_RES_CD VARCHAR(20) COMMENT '외부기관응답코드',
    EXT_RES_MSG VARCHAR(500) COMMENT '외부기관응답메시지',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '등록일시',
    PRIMARY KEY (DTL_ID),
    FOREIGN KEY (EXEC_ID) REFERENCES TB_BATCH_HIST (EXEC_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치처리상세';
```

#### 6) 배치 재실행 요청 테이블 (`TB_BATCH_RETRY_REQ`)
운영자가 실패한 실행 건에 대해 재실행을 요청하고 이를 승인/이행한 기록을 관리한다.

```sql
CREATE TABLE TB_BATCH_RETRY_REQ (
    RETRY_REQ_ID BIGINT AUTO_INCREMENT NOT NULL COMMENT '재실행요청ID',
    ORIG_EXEC_ID BIGINT NOT NULL COMMENT '원본실행ID',
    NEW_EXEC_ID BIGINT COMMENT '신규실행ID',
    REQ_USR_ID VARCHAR(10) NOT NULL COMMENT '요청자ID (TB_USER.CUST_ID)',
    REQ_REASON VARCHAR(500) NOT NULL COMMENT '요청사유',
    APPR_USR_ID VARCHAR(10) COMMENT '승인자ID (TB_USER.CUST_ID)',
    APPR_STAT VARCHAR(10) DEFAULT 'REQUESTED' NOT NULL COMMENT '승인상태(REQUESTED,APPROVED,REJECTED)',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '요청일시',
    APPR_DT DATETIME COMMENT '승인일시',
    PRIMARY KEY (RETRY_REQ_ID),
    FOREIGN KEY (ORIG_EXEC_ID) REFERENCES TB_BATCH_HIST (EXEC_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치재실행요청';
```

#### 7) 배치 락/실행 중 상태 테이블 (`TB_BATCH_LOCK`)
동일한 배치 작업이 동시에 여러 번 실행되지 않도록 물리적 락을 설정하고 실행 중인 상태를 관리한다.

```sql
CREATE TABLE TB_BATCH_LOCK (
    LOCK_KEY VARCHAR(100) NOT NULL COMMENT '잠금키',
    BATCH_JOB_ID VARCHAR(20) NOT NULL COMMENT '배치작업ID',
    PROCESS_ID VARCHAR(50) NOT NULL COMMENT '프로세스ID/서버식별자',
    ACQUIRED_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '획득일시',
    EXPIRED_DT DATETIME NOT NULL COMMENT '만료일시',
    PRIMARY KEY (LOCK_KEY),
    FOREIGN KEY (BATCH_JOB_ID) REFERENCES TB_BATCH_JOB_MST (BATCH_JOB_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치실행잠금';
```

#### 8) 배치 알림 이력 테이블 (`TB_BATCH_NOTI_HIST`)
배치 작업의 실패, 처리 지연, 성공 요약 등에 대한 관리자 알림(Email, Slack, SMS 등) 발송 이력을 관리한다.

```sql
CREATE TABLE TB_BATCH_NOTI_HIST (
    NOTI_ID BIGINT AUTO_INCREMENT NOT NULL COMMENT '알림이력ID',
    EXEC_ID BIGINT NOT NULL COMMENT '배치실행ID',
    NOTI_TYPE VARCHAR(10) NOT NULL COMMENT '알림유형(EMAIL,SLACK,SMS,PUSH)',
    NOTI_STAT VARCHAR(10) DEFAULT 'SUCCESS' NOT NULL COMMENT '발송상태(SUCCESS,FAILED)',
    NOTI_MSG VARCHAR(1000) NOT NULL COMMENT '알림내용',
    ERR_MSG VARCHAR(1000) COMMENT '발송오류메시지',
    REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '발송일시',
    PRIMARY KEY (NOTI_ID),
    FOREIGN KEY (EXEC_ID) REFERENCES TB_BATCH_HIST (EXEC_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배치알림이력';
```

### 12.2 테이블 관리 및 매일 스케줄 판정 흐름

- **테이블 관리 포인트**:
  - 작업 마스터는 배치 정의를 관리하고, 삭제 대신 `USE_YN` 변경으로 사용을 제한한다.
  - 스케줄 등록은 주기 조건(일/월/년 등)과 휴일 정책을 바탕으로 실행 대상 여부를 판별한다.
  - 실행 이력과 상세 이력은 `EXEC_ID`를 기반으로 묶여 조회되며, 운영자는 배치 Dashboard에서 실패 건을 손쉽게 대조할 수 있다.
  - 배치 재실행 이력은 `ORIG_EXEC_ID`와 `RETRY_REQ_ID`를 역추적하여 장애 대응 히스토리를 모니터링할 수 있게 돕는다.
- **매일 스케줄 판정 흐름**:
  1. 스케줄 판정 시스템이 매일 활성화된 배치 작업 마스터(`TB_BATCH_JOB_MST`) 및 스케줄 규칙(`TB_BATCH_SCHED`)을 읽는다.
  2. 오늘 날짜 및 요일 조건, 휴일 규칙에 부합하는 배치 작업을 추출한다.
  3. 수행일자(`JOB_DT`)와 회차(`JOB_ROUND`)를 산출하고, 이미 중복된 계획이 존재하는지 확인한다.
  4. 당일 수행 계획(`TB_BATCH_PLAN`)에 `READY` 상태로 일괄 생성한다.
  5. 정해진 주기에 도달하면 배치 락(`TB_BATCH_LOCK`)을 시도하여 획득 성공 시 `TB_BATCH_HIST`를 `RUNNING` 상태로 등록하고 배치 업무 코드를 기동한다.

### 12.3 배치 관리 테이블 생성 순서 및 TB_USER 연결 관계

#### 1) 배치 관리 테이블 생성 순서 (Table Creation Order)
테이블 생성 시, 외래키(FOREIGN KEY) 참조 무결성 제약조건으로 인한 에러를 방지하기 위해 반드시 다음 순서로 테이블을 생성해야 합니다.

1. **`TB_USER`** (기존 운영 회원 테이블, 배치 테이블 생성 전에 먼저 생성 및 존재해야 함)
2. **`TB_BATCH_JOB_MST`** (배치 작업 마스터 테이블 - 다른 배치 테이블들의 참조 대상)
3. **1단계 의존 테이블** (`TB_BATCH_JOB_MST`를 외래키로 참조하는 테이블들)
   - **`TB_BATCH_SCHED`** (배치 스케줄 등록)
   - **`TB_BATCH_PLAN`** (배치 수행 계획)
   - **`TB_BATCH_HIST`** (배치 실행 결과/이력)
   - **`TB_BATCH_LOCK`** (배치 실행 잠금)
4. **2단계 의존 테이블** (`TB_BATCH_HIST`를 외래키로 참조하는 테이블들)
   - **`TB_BATCH_DTL`** (배치 처리 상세)
   - **`TB_BATCH_RETRY_REQ`** (배치 재실행 요청)
   - **`TB_BATCH_NOTI_HIST`** (배치 알림 이력)

#### 2) TB_USER 테이블과의 연결 관계 및 외래키 제약조건 고려사항
배치 관리 테이블 설계에서 사용자 ID를 다루는 컬럼들과 `TB_USER` 테이블의 관계는 다음과 같습니다.

- **연결 대상 컬럼**:
  - `TB_BATCH_JOB_MST.REG_USR_ID`, `TB_BATCH_JOB_MST.MOD_USR_ID`
  - `TB_BATCH_HIST.REQ_USR_ID`
  - `TB_BATCH_RETRY_REQ.REQ_USR_ID`, `TB_BATCH_RETRY_REQ.APPR_USR_ID`
- **데이터 타입 일치**:
  - `TB_USER` 테이블의 기본 키는 **`CUST_ID VARCHAR(10)`** 입니다.
  - 따라서, 위의 모든 사용자 ID 컬럼의 데이터 타입을 기존 `VARCHAR(20)`에서 **`VARCHAR(10)`**으로 수정하여 타입 정합성을 보장합니다.
- **물리적 외래키(FOREIGN KEY) 제약조건 추가 시 예외 처리**:
  - `TB_BATCH_JOB_MST.REG_USR_ID` 컬럼은 스케줄러 등에 의해 자동으로 등록되는 경우를 위해 `DEFAULT 'SYSTEM'` 값을 갖습니다.
  - 만약 해당 컬럼에 물리적 외래키 제약조건(`REFERENCES TB_USER(CUST_ID)`)을 지정하려면, **`TB_USER` 테이블에 `CUST_ID = 'SYSTEM'`인 가상 사용자(시스템 계정)가 반드시 사전에 등록되어 있어야 합니다.**
  - 사전 등록이 불가능하거나 불필요한 경우, 물리적 외래키 제약조건을 생략하고 논리적(Logical) 외래키 연결 관계로만 유지하여 운영하는 방안을 권장합니다.

## 13. 우선 개발 대상 배치 프로그램

초기 배치 대상은 아래 업무를 우선 후보로 둔다. 각 배치는 실제 구현 전에 기준일, 대상 조건, 중복 처리 기준, 재실행 정책을 먼저 확정해야 한다.

### 13.1 여행 종료 후 DONE 처리 배치

목적:

- 배치 작업일 기준으로 여행 종료일이 지난 예약/견적 정보를 정리한다.
- 현재 상태가 `CONFIRM` 또는 `DONE` 처리 대상인 데이터를 읽어 관련 테이블의 상태를 `DONE`으로 맞춘다.

대상 테이블:

- `TB_AUCTION_REQ`
- `TB_AUCTION_REQ_BUS`
- `TB_RESERVATION_BUS`

주의:

- 저장소 코드에는 `TB_BUS_RESERVATION` 명칭도 사용되고 있으므로 실제 운영 테이블명이 `TB_RESERVATION_BUS`인지 `TB_BUS_RESERVATION`인지 구현 전 확인이 필요하다.
- `DONE`으로 바꿀 수 있는 상태 전이 조건을 명확히 해야 한다.
- 이미 취소, 환불, 분쟁, 제한 상태인 건은 제외 조건을 둔다.
- 기준일은 서버 시간과 DB 시간대가 다르지 않도록 한국 시간 기준으로 정의한다.

권장 재실행 정책:

- 상태 전이 조건이 멱등하게 작성되면 `RETRYABLE` 가능
- 외부 정산, 알림 발송이 함께 붙으면 상세 재검토 필요

### 13.2 영업 회원 수당 계산 및 수당 이력 생성/갱신 배치

목적:

- 영업 회원의 기준 기간별 수당을 계산한다.
- 계산 결과를 수당 이력으로 생성하거나, 재계산 조건에 따라 갱신한다.

필요한 기준:

- 수당 산정 기준 기간
- 영업 회원 식별 기준
- 수당률 또는 수당 정책
- 정산 대상 거래 상태
- 취소/환불/정정 건 반영 방식
- 이미 확정된 수당의 재계산 가능 여부

권장 재실행 정책:

- 확정 전 계산은 `RETRYABLE`
- 확정 후 재계산은 운영자 승인 필요

### 13.3 영업 회원 세금계산서 일괄 작성/전송 배치

목적:

- 매월 15일 전월 기준 정보를 추출해 영업 회원 세금계산서를 일괄 작성하고 전송한다.
- 국세청 자동 등록, 취소, 정정이 가능하도록 상태와 외부 응답을 관리한다.

실행 주기:

- 매월 15일
- 기준 데이터: 전월 1일 00:00:00부터 전월 말일 23:59:59까지

필요 기능:

- 전월 수당/정산 데이터 추출
- 세금계산서 작성 대상 검증
- 국세청 또는 연동 기관 전송
- 전송 성공/실패 응답 저장
- 취소 요청
- 정정 발행
- 중복 전송 방지

주의:

- 세금계산서 전송은 외부기관 중복 등록 위험이 있으므로 재실행은 기본적으로 `MANUAL_CHECK_REQUIRED`로 둔다.
- 외부기관 승인 번호, 요청 ID, 원본 세금계산서 식별자를 반드시 저장해야 한다.
- 실패 후 재실행 시 이미 성공한 건은 제외해야 한다.

### 13.4 월 정기 버스 기사 회원 카드 배치

목적:

- 월 정기 버스 기사 회원의 회비 또는 구독 결제를 카드 배치로 처리한다.
- 카드 결제 오류가 발생한 경우 오류 코드에 따라 기사 회원에게 PUSH 메시지를 전송한다.

필요한 기준:

- 정기 결제 대상 회원
- 회원 등급 또는 요금 정책
- 결제 기준 월
- 카드 등록 상태
- 이전 결제 성공/실패 이력
- 재시도 가능 횟수

주의:

- 카드 결제는 중복 승인 방지가 핵심이다.
- 결제 요청 키를 월/회원/상품 기준으로 유일하게 관리해야 한다.
- 실패 건 재시도는 카드사 응답 코드에 따라 가능 여부를 나눠야 한다.
- PUSH 메시지는 결제 실패 사유와 사용자 조치 방법을 안내해야 하며, 같은 오류에 대해 중복 발송되지 않도록 발송 이력을 관리해야 한다.
- 카드사 오류 코드, 내부 결제 오류 코드, 알림 문구, 재시도 가능 여부를 매핑하는 기준 정보가 필요하다.

권장 재실행 정책:

- 네트워크 오류, 일시 장애는 제한된 횟수 안에서 `RETRYABLE`
- 승인 성공 후 응답 저장 실패는 별도 대사 배치 또는 수동 확인 필요

### 13.5 월 회비 카드 결제 오류 PUSH 발송 배치

목적:

- 매월 버스 기사 월 회비 카드 결제 실패 건을 읽어 오류 코드별 PUSH 메시지를 전송한다.
- 기사 회원이 카드 변경, 잔액 확인, 재결제 요청 등 필요한 조치를 할 수 있게 안내한다.

실행 시점:

- 월 정기 카드 결제 배치 직후 실행
- 또는 결제 실패 건이 생성된 뒤 일정 시간 간격으로 재시도
- 운영자가 배치 Dashboard에서 특정 기준월 또는 특정 기사 회원 기준으로 수시 실행 가능

대상 조건:

- 월 회비 카드 결제 결과가 실패인 건
- PUSH 발송 대상 오류 코드에 해당하는 건
- 동일 결제 실패 건에 대해 아직 PUSH가 발송되지 않았거나 재발송 조건을 만족하는 건
- 회원의 앱 PUSH 수신 토큰이 유효한 건

오류 코드별 메시지 예시:

- 한도 초과: 카드 한도 확인 또는 다른 카드 등록 안내
- 잔액 부족: 결제 계좌 잔액 확인 안내
- 유효기간 만료: 카드 재등록 안내
- 카드 정지/분실: 카드사 확인 및 다른 카드 등록 안내
- 일시 장애/네트워크 오류: 잠시 후 자동 재시도 예정 안내
- 인증 실패/승인 거절: 카드사 문의 또는 결제수단 변경 안내

필요한 관리 정보:

- 결제 실패 원본 식별자
- 기사 회원 ID
- 기준월
- 카드사 오류 코드
- 내부 오류 코드
- PUSH 템플릿 코드
- PUSH 발송 상태
- 발송 시각
- 발송 실패 사유
- 재발송 가능 여부

관리 포인트:

- PUSH 발송 자체도 배치 처리 결과와 상세 이력에 남겨야 한다.
- 결제 실패 1건에 대해 동일한 템플릿이 반복 발송되지 않도록 중복 방지 키를 둔다.
- PUSH 토큰이 없거나 만료된 회원은 발송 실패로만 기록하고 결제 상태를 변경하지 않는다.
- 카드 결제 재시도와 PUSH 발송은 분리한다. PUSH 성공이 결제 성공을 의미하지 않는다.
- 민감한 카드 정보는 PUSH 메시지에 포함하지 않는다.

## 14. 관리자 배치 Dashboard 연동

관리자 Dashboard에서 배치 관리 화면으로 분기할 수 있도록 `배치 Dashboard` 버튼이 필요하다.

### 14.1 진입 버튼

관리자 Dashboard에 다음 버튼을 추가하는 것을 권장한다.

- 버튼명: `배치 Dashboard`
- 노출 대상: 관리자 권한 사용자
- 이동 대상: 배치 작업 목록/실행 이력 화면

### 14.2 배치 Dashboard 화면 구성

기본 화면:

- 오늘 실행 예정 배치
- 현재 실행 중인 배치
- 최근 실패 배치
- 최근 성공 배치
- 재실행 요청 대기 건

상세 화면:

- 배치 작업 마스터 정보
- 실행 이력 목록
- 실행 상세 로그
- 처리 대상 건별 결과
- 재실행 요청 버튼
- dry-run 실행 버튼
- 운영자 메모 입력

### 14.3 권한 및 감사 로그

배치 재실행, 취소, dry-run 실행은 운영 영향이 있으므로 감사 로그가 필요하다.

기록 항목:

- 관리자 사용자 ID
- 실행한 액션
- 대상 배치 작업 ID
- 대상 실행 ID
- 요청 시각
- 요청 IP
- 요청 사유

## 15. 배치 파일 예시

아래는 실제 업무 로직을 넣기 전 기본 골격이다.

```js
'use strict';

require('../../loadEnv');

const { pool } = require('../../db');

const BATCH_NAME = 'sampleJob';

async function run() {
    const startedAt = new Date();
    const dryRun = String(process.env.BATCH_DRY_RUN || '').toLowerCase() === 'true';
    const limit = Number(process.env.BATCH_LIMIT || 100);

    console.log(`[${BATCH_NAME}] start`, {
        startedAt: startedAt.toISOString(),
        dryRun,
        limit,
    });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT 1 AS ok LIMIT ?`,
            [limit]
        );

        console.log(`[${BATCH_NAME}] targetCount=${rows.length}`);

        if (dryRun) {
            await connection.rollback();
            console.log(`[${BATCH_NAME}] dry-run rollback`);
            return;
        }

        // TODO: 실제 배치 처리

        await connection.commit();
        console.log(`[${BATCH_NAME}] success`);
    } catch (error) {
        await connection.rollback();
        console.error(`[${BATCH_NAME}] failed`, error);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
        console.log(`[${BATCH_NAME}] end`);
    }
}

run().catch(async (error) => {
    console.error(`[${BATCH_NAME}] fatal`, error);
    try {
        await pool.end();
    } catch (_) {
        // ignore
    }
    process.exit(1);
});
```

## 16. 권장 개발 순서 요약

1. 배치 요구사항과 처리 주기를 정의한다.
2. 입력 데이터, 처리 대상, 완료 조건, 재실행 조건을 정한다.
3. `busTaams_server/batch/jobs`에 배치 파일을 만든다.
4. 첫 줄에서 `require('../../loadEnv')`를 호출한다.
5. `db.js`의 `pool`을 사용해 DB에 연결한다.
6. `BATCH_DRY_RUN`과 `BATCH_LIMIT`를 먼저 지원한다.
7. 로컬에서 `node --check`와 dry-run을 실행한다.
8. 운영 스케줄러에 등록한다.
9. 로그와 실패 알림을 확인한다.
10. 운영 실행 후 처리 건수와 DB 결과를 검증한다.
