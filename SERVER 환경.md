# SERVER 환경 (busTaams_server / `server.js`)

본 문서는 **`busTaams_server/server.js`** 가 담당하는 역할, **`BusTaams 테이블.md`**·**`busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md`**(BUSTAAMS DDL)와의 정합 상태, **`TB_USER.CUST_ID` / `USER_ID` 도입**, 로그인·대시보드 파라미터, **`server.js` 수정 순서**, 그리고 **운영 스키마에 맞춘 VARCHAR 등 식별자·채번 정리** 작업을 위한 **우선순위**를 정리합니다.  
상위 원칙·암호화·ID 256자 상한은 **`ARCHITECTURE.md`** 를 참고합니다.

**스키마·문서 정책 (2026-04-23 반영)**  
- **`TB_DRIVER_INFO`**: 프로젝트에서 **사용하지 않으며**, **DB에서 물리 테이블이 삭제된 상태**이다. 본 문서 및 구현에서 **해당 테이블을 전제로 한 설명은 제거**하였다.  
- **UUID**: 버스탐스 **운영에 반영된 전체 테이블 스키마에는 UUID 형식으로 쓰는 컬럼이 없다.** 따라서 본 문서에 있던 **UUID(BINARY UUID 등)로 바꾼다·도입한다·마이그레이션한다**는 내용은 **전부 삭제**하였다. 애플리케이션 코드(`server.js`, `routes/*.js`)에 **`UUID_TO_BIN` / `BIN_TO_UUID` / `randomUUID()` 등이 남아 있으면**, 그것은 **과거 레거시**이며 목표는 **운영 DDL과 동일한 VARCHAR·채번 규칙에 맞추어 제거·수정**하는 것이다(**UUID 형식으로 통일한다는 목표는 없음**).

---

## 1. `server.js`에 어떤 내용이 있는가

| 구역 | 역할 |
|------|------|
| 초기화 | `express`, `cors`, `dotenv`, MySQL `pool`, GCS, Firebase Admin, `bcrypt`, `crypto` |
| 공통 헬퍼 | `generateNextNumericId` (최대값+1 후 `padStart`), `normalizeVarcharId` (`lib/idConstants.js`), `driverSessionFromQuery`, 스키마 오류 판별 등 |
| `ensure*Table` / 마이그레이션성 SQL | `TB_USER`, `TB_FILE_MASTER`, `TB_USER_DEVICE_TOKEN`, `TB_COMMON_CODE`, 차량·입찰·예약·채팅 등 — **신규 DDL과 레거시 DDL이 한 파일에 공존할 수 있음** |
| 인증·회원 | 로그인, 회원가입, 아이디/전화 중복, SMS/Firebase 연동 등 |
| 기사·프로필 | `profile-setup`, 프로필 사진/자격증, `TB_DRIVER_DOCS` 등 (**`TB_DRIVER_INFO`는 미사용·스키마 삭제됨**) |
| 입찰·예약·일정 | `auction/request`, 대시보드, 스케줄, `TB_AUCTION_REQ` / `TB_BUS_RESERVATION` 관련 쿼리 |
| 버스·파일 | `TB_BUS_DRIVER_VEHICLE` 등록/수정, GCS 업로드, 파일 메타 |
| 채팅 | `TB_CHAT_LOG` INSERT/SELECT (**운영 스키마는 VARCHAR 식별자**; 코드에 예전 패턴이 있으면 운영 DDL에 맞게 정리) |

즉, **백엔드 단일 진입점**이면서 DB 스키마 변경 시 **여기서 분기·보완**이 누적된 상태입니다.  
**`routes/*.js`** 에도 동일 패턴이 있으므로, 실제 개편 시 **`server.js`만** 보면 안 됩니다.

---

## 2. `TB_USER` 변경: `CUST_ID`·`USER_ID` 정책

### 2-1. `CUST_ID` (신규)

| 항목 | 내용 |
|------|------|
| **컬럼** | `CUST_ID` — `VARCHAR(10)` NOT NULL (권장: **PK** 또는 최소 **UK**; 타 도메인 FK의 기준 키) |
| **채번** | 신규 회원마다 **앞자리 `0` 패딩** 후 순번. 예: `0000000001`, `0000000002` … 1씩 증가 (`padStart(10,'0')` 등과 동일 개념). |
| **역할** | 버스탐스 **내부 회원 식별·JOIN 허브**. 예약·입찰·SMS·리뷰·채팅 등 **컬럼명은 테이블마다 다르지만 저장 값은 모두 이 `CUST_ID`와 동일**한 값을 둔다. |

### 2-2. 타 테이블 컬럼과의 JOIN (이름 ≠ 같아도 값은 `CUST_ID`)

| 테이블 | 컬럼명 | 의미(저장 값) |
|--------|--------|----------------|
| `TB_AUCTION_REQ` | `TRAVELER_ID` | 여행자 **`TB_USER.CUST_ID`** |
| `TB_BUS_RESERVATION` | `TRAVELER_ID`, `DRIVER_ID` | 여행자·기사 각각 **`CUST_ID`** (DDL 주석에 `TB_USER.USER_ID`로 적혀 있어도 **목표 값은 `CUST_ID`**) |
| `TB_DRIVER_DOCS` | `APPROVER_ID` | 승인자 식별 — **추후 확정** (본사 계정 `CUST_ID` 여부 등) |
| `TB_SMS_LOG` | `SENDER_ID`, `RECEIVER_ID` | 발송 주체·수신자 **`CUST_ID`** (`SENDER_ID`는 시스템 발송이면 NULL 가능) |
| `TB_TRIP_REVIEW` | `WRITER_ID`, `DRIVER_ID` | 여행자·버스기사 **`CUST_ID`** |

### 2-3. `USER_ID` (로그인·SNS 정합)

| 항목 | 내용 |
|------|------|
| **형식** | `VARCHAR(256)` (기존 DDL `255`에서 **256 상한**으로 통일하는 것을 권장; 마이그레이션 시 컬럼 길이 확장) |
| **의미** | 일반 가입 시 사용자가 입력한 **로그인 ID**, 또는 **카카오·네이버 연동 시 전달받은 식별자를 조합**해 만든 값. |
| **용도** | 간편 로그인 시 **카카오/네이버에 되돌려 보내 정합성 검증**하는 키로 사용. |
| **와 `CUST_ID`의 관계** | 과거에는 `USER_ID`만으로 세션·조인을 묶는 코드가 많았으나, **`CUST_ID` 도입 후에는 비즈니스 FK·목록·알림 수신자는 `CUST_ID` 중심**으로 옮기고, `USER_ID`는 **인증·중복 검사·SNS 매핑**에 집중한다. |

### 2-4. 프로젝트 전체 영향

- **조회·INSERT·UPDATE**: `TB_USER` 조인 시 **`CUST_ID` 기준**으로 통일할 것.  
- **레거시 코드**: 애플리케이션에 남은 **잘못된 식별자·과거 쿼리 패턴**은 **`CUST_ID`·`USER_ID(256)` 정책 및 운영 DDL**에 맞추어 단계적으로 정리한다 (`ARCHITECTURE.md`, 본 문서 §7 참고).

---

## 3. 버스탐스 로그인·MainDashBoard 분기·세션 파라미터

### 3-1. 사용자 구분별 분기

로그인 성공 시 **`TB_USER.USER_TYPE`(및 운영 정책상 관리자 플래그)** 로 아래처럼 **각 MainDashBoard**로 분기한다.

| 구분 | 화면(예시) | 비고 |
|------|------------|------|
| 여행자 | 소비자 Main / 대시보드 | `USER_TYPE = 'TRAVELER'` |
| 영업회원 | Partner / 영업 대시보드 | `USER_TYPE = 'PARTNER'` |
| 버스기사 | `DriverDashboard` | `USER_TYPE = 'DRIVER'` |
| 관리자 | 관리자 콘솔 | `USER_TYPE = 'ADMIN'` (`BusTaams 테이블.md` 의 `TB_USER.USER_TYPE` ENUM) 또는 **별도 롤 테이블** |

### 3-2. 분기 시 **필수 파라미터** 원칙

- **이름·타입·길이**는 **DB 컬럼과 동일**하게 정의한다 (`VARCHAR(10)` `CUST_ID`, `VARCHAR(256)` `USER_ID`, 암호화 필드는 API에서는 마스킹·별도 DTO).  
- **목적**: 로그인 직후 **기사정보·버스·예약·응찰** 등록/수정 화면에서 **불필요한 재조회를 줄이기 위해** 세션(또는 클라이언트 상태)에 **`CUST_ID`, 성명, 휴대전화, SMS/PUSH 수신 여부** 등을 실어 보낸다.  
- **보안**: `PASSWORD`, `RESIDENT_NO_ENC` 등 **민감 필드는 세션에 장기 보관하지 않는다** (`ARCHITECTURE.md` 클라이언트 보관 정책 준수).

### 3-3. 권장 페이로드 예시 (실제 키명은 프론트·API 계약에 맞출 것)

| 파라미터 | 타입·길이 | 출처 컬럼(예) |
|----------|-----------|----------------|
| `custId` | `varchar(10)` | `TB_USER.CUST_ID` |
| `userId` | `varchar(256)` | `TB_USER.USER_ID` |
| `userType` | enum 문자열 | `TB_USER.USER_TYPE` |
| `userNm` | 암호화 컬럼 복호화 값 | `USER_NM` |
| `hpNo` | 복호화 값 | `HP_NO` |
| `smsYn` / `pushYn` | `Y`/`N` | 약관·마케팅·기기알림 플래그 (`TB_USER_TERMS_HIST` 등과 정합) |

### 3-4. 로그인 → MainDashBoard **공통·확장** 파라미터 (DB 조인·문서 기준)

**현재 `server.js` 구현** (`POST /api/auth/login`·`/api/users/login`)은 응답 `user`에 `userId`, `email`, `userName`, `phoneNo`, `userType` 정도만 담는다. **`CUST_ID`·취소·구독 요약은 아직 없다.** 아래는 **`BusTaams 테이블.md` DDL**과 맞춘 **권장 페이로드**이며, 실제 키명은 API 계약·프론트 `camelCase`에 맞춘다.

**A. `TB_USER` — 대시보드에 넘기기 좋은 항목**

| 필드(예: JSON 키) | 출처 컬럼 | 비고 |
|-------------------|-----------|------|
| `custId` | `CUST_ID` | 내부·JOIN 기준(§2). **로그인 쿼리에 컬럼이 있으면** 반드시 포함 권장. |
| `userId` | `USER_ID` | 로그인·표시·SNS 정합(§2-3). |
| `userType` | `USER_TYPE` | MainDashBoard **분기** (§3-1). |
| `userNm` | `USER_NM` | **복호화 후** 전달(저장이 암호화인 경우). |
| `email` | `EMAIL` | |
| `hpNo` | `HP_NO` | 복호화 후. **PII** — 클라이언트 저장·로그는 `ARCHITECTURE.md` 준수. |
| `snsType` | `SNS_TYPE` | |
| `profileFileId` | `PROFILE_FILE_ID` | 썸네일 API 등과 연동 시. `PROFILE_IMG_PATH`는 경로 정책에 따라 **URL 한 방**으로만. |
| `smsAuthYn` | `SMS_AUTH_YN` | |
| `userStat` | `USER_STAT` | `BANNED`·`LEAVE` 등 **화면/행동 제한** 판단. |
| `joinDt` | `JOIN_DT` | 선택(표시용). |

**B. `TB_USER_CANCEL_MANAGE` — 조인 키: `CUST_ID` (권장·목표 DDL)**

- **1행 = 회원 1명(`CUST_ID`)**  마스터. PK는 **`(CUST_ID)`** (또는 DB 이행 전 `USER_ID` 열만 있으면, **`TB_USER`를 경유**해 `u.CUST_ID`로 대응한 뒤 **컬럼명을 `CUST_ID`로 정리**하는 것을 권장).
- 로그인 직후 조회(개념):

  ```text
  SELECT … FROM TB_USER_CANCEL_MANAGE m
  WHERE m.CUST_ID = ?   -- = 로그인에 성공한 TB_USER.CUST_ID
  LIMIT 1
  ```

- `USER_TYPE` 은 **행에 저장**되어 있으므로, `TB_USER.USER_TYPE` 과 **정합**이 맞는지(불일치 시 오류/보정) 정책을 둔다.

| API 필드(권장·camelCase) | 출처 컬럼 | 설명 |
|---------------------------|-----------|------|
| `cancelCnt` | `CANCEL_CNT` | |
| `cancelBusDriverCnt` | `CANCEL_BUS_DRIVER_CNT` | |
| `cancelTravelerAllCnt` | `CANCEL_TRAVELER_ALL_CNT` | |
| `cancelTravelerPartialBusCnt` | `CANCEL_TRAVELER_PARTIAL_BUS_CNT` | |
| `tradeRestrictYn` | `TRADE_RESTRICT_YN` | `Y`면 UI·응찰 힌트(최종 판정은 **서버**). |

- 응답에는 위 필드만 **객체 `cancelManage`** 로 묶는다(아래 **§3-4-1**).  
- **행이 없을 때:** `cancelManage: null` 이거나, API 계약에 따라 **“기본 0 + `tradeRestrictYn: 'N'`”** 한 객체(서버가 합성) 중 하나로 통일.

**C. `TB_SUBSCRIPTION` — 조인 키: `DRIVER_ID` = `TB_USER.CUST_ID` (기사만, 목표 DDL)**

- **의미:** “이번 달(또는 정산 기준월) **해당 기사**의 월 응찰/구독”.
- **목표:** `DRIVER_ID` `VARCHAR(10)` = **`TB_USER.CUST_ID`**, `FK` → `TB_USER(CUST_ID)` (`BusTaams 테이블.md`·운영이 이에 맞을 때).  
- 로그인 직후 조회(개념) — `USER_TYPE = 'DRIVER'` 일 때만:

  ```text
  SELECT … FROM TB_SUBSCRIPTION s
  WHERE s.DRIVER_ID = ?           -- = TB_USER.CUST_ID
    AND s.YYYYMM = ?              -- 당월: 예) 서버에서 format(now,'yyyyMM')
  LIMIT 1
  ```

- **여행자·파트너·관리자** 등: 구독 행이 없으므로 **`subscription: null`**.

| API 필드(권장) | 출처 컬럼 | 설명 |
|----------------|-----------|------|
| `yyyyMm` | `YYYYMM` | 조회에 사용한 월(클라가 “어느 달 데이터인지” 판단). |
| `feePolicy` | `FEE_POLICY` | `DRIVER_GENERAL` 등 |
| `basicCnt` | `BASIC_CNT` | |
| `useCnt` | `USE_CNT` | |
| `remainingCnt` | `REMAINING_CNT` | |

- 당월 행이 **없을 때(미등록/신규 기사):** `subscription: null` 또는 합성 기본(0) — **API 문서에 한 가지로 고정**.

---

#### 3-4-1. `cancelManage` / `subscription` **객체**로 쓰는 방법 (상세)

**왜 객체로 써서 좋은지**  
- `user` 최상위에 `cancelCnt`, `basicCnt` … 를 **전부 풀어** 넣으면, **이게 어디 테이블에서 온 것인지**·**기사/여행자에 공통인지**가 섞이고, 프론트 `MainDashBoard` props 가 비대해진다.  
- **`cancelManage`**, **`subscription`** 처럼 **의미 단위(도메인)** 별로 중첩하면, 타입을 나누기 쉽고 `subscription === null` 이면 “구독 없음(비기사 등)”을 일관되게 처리할 수 있다.

**1) `cancelManage` (항상 *같은 shape* 를 유지 권장)**

- **의미:** “`TB_USER_CANCEL_MANAGE` 한 행”을 JSON으로 **그대로 축소한 DTO** (민감·불필요 컬럼 제거).
- **형태(예, 필드는 §3-4B와 1:1):**

  ```json
  "cancelManage": {
    "cancelCnt": 0,
    "cancelBusDriverCnt": 0,
    "cancelTravelerAllCnt": 0,
    "cancelTravelerPartialBusCnt": 0,
    "tradeRestrictYn": "N"
  }
  ```

- **서버 쪽 처리 순서(개념):**  
  1. 로그인한 사용자의 `CUST_ID` 를 `TB_USER`에서 확정한다.  
  2. `SELECT … FROM TB_USER_CANCEL_MANAGE WHERE CUST_ID = ?`  
  3. `rows[0]` 이 있으면 위 필드만 매핑해 객체 생성. **없으면** `null` 또는 기본 객체(정책 선택).  
- **클라이언트 쪽:** `user.cancelManage?.tradeRestrictYn === 'Y'` 처럼 **옵셔널 체이닝** — `null`이면 “취소집계 없음(첫 가입 등)” UI.

**2) `subscription` (기사·당월만 객체, 나머지 `null`)**

- **의미:** “`TB_SUBSCRIPTION` 에서 ( `DRIVER_ID` = `CUST_ID` ) & ( `YYYYMM` = 당월 ) 인 **한 행**”.
- **형태(예):**

  ```json
  "subscription": {
    "yyyyMm": "202604",
    "feePolicy": "DRIVER_GENERAL",
    "basicCnt": 10,
    "useCnt": 2,
    "remainingCnt": 8
  }
  ```

- **서버 쪽:**  
  - `USER_TYPE !== 'DRIVER'` → `subscription: null` (쿼리 생략).  
  - `DRIVER` 이면 `DRIVER_ID = custId` AND `YYYYMM = f(오늘)` 조회, 없으면 `null` 또는 0 합성.  
- **클라이언트:** `user.subscription ? …응찰권… : …비기사·없음…`

**3) HTTP 응답 전체(예, 개념)**

```json
{
  "message": "로그인 성공",
  "user": {
    "custId": "0000000001",
    "userId": "login@example",
    "userType": "DRIVER",
    "userName": "홍길동",
    "hpNo": "010-…",
    "email": "…",
    "cancelManage": { "cancelCnt": 0, "cancelBusDriverCnt": 0, "cancelTravelerAllCnt": 0, "cancelTravelerPartialBusCnt": 0, "tradeRestrictYn": "N" },
    "subscription": { "yyyyMm": "202604", "feePolicy": "DRIVER_GENERAL", "basicCnt": 10, "useCnt": 0, "remainingCnt": 10 }
  }
}
```

(실제 키명·대소문자는 프론트와 계약. **비기사**의 예: `"subscription": null`, `cancelManage` 는 유형에 따라 `null` 허용.)

**4) 구현 팁**  
- **한 함수** `buildPostLoginUserDto({ userRow, cancelRow, subRow, userType })` 가 위 중첩 구조를 반환 — `lib/loginPayload.js` 등(§3-6).  
- `CUST_ID` 는 **조인·WHERE 의 유일 키**; `USER_ID` 는 로그인·표시용으로만.

### 3-5. 로그인·대시보드 **파라미터로 쓰지 않는** `TB_USER` (또는 API 응답에 넣지 않는) 컬럼

| 컬럼 | 이유 |
|------|------|
| `PASSWORD` | **절대 미포함** — 이미 `bcrypt` 검증에만 사용. |
| `RESIDENT_NO_ENC` | **미포함** — 주민번호 등 **초고위험 PII**; 복호화 값도 **클라이언트에 실어 보내지 않는다.** 기사 심사 UI는 **별도 API**로 제한. |
| `RECOM_CODE` | **제외 권장** — 영업·정산·추천인과 연동된 **내부/개인정보**에 가깝다. 필요 시 별도 권한 API. |
| `MOD_ID`, `MOD_DT` (및 `TB_USER` **감사** 목적) | **대시보드 공통 JSON에 제외** — 내부 감사·운영자 식별은 클라이언트에 불필요, 노출은 최소화. `JOIN_DT`는 **표시용**이면 OK. |
| (선택) `PROFILE_IMG_PATH` | **GCS 직접 URL 전체**를 굳이 길게 줄 필요는 없다. `PROFILE_FILE_ID` + 서명 URL API가 안전. |

`TB_USER` **나머지**(`EMAIL`, `SNS_TYPE`, `SMS_AUTH_YN` 등)는 3-4A와 같이 **업무·UI에 필요하면 포함**, 아니면 **첫 화면에서 재조회**해도 된다.

### 3-6. 공통 파라미터 **정의 위치** — `server.js`에 **문자열만** 나열? vs **모듈**

- **권장:** **응답 DTO(객체)를 만드는 함수**를 `busTaams_server/lib/`(예: `loginPayload.js`, `buildPostLoginUserDTO`) **한 곳**에 둔다. 로그인 핸들러(`server.js`)는 `SELECT`·조인·`build…()` 호출·`res.json`만 담당한다.  
- **이유:** 필드 누락·민감 컬럼 누출·`USER_TYPE`별 분기가 **한 파일에 반복**되지 않고, **테스트·스펙(`SERVER 환경.md` §3)** 과 맞추기 쉽다.  
- `server.js` **상단에** “허용 필드 화이트리스트” 상수(배열·Set)를 두는 것은 **가능**하지만, **로직이 길어지면** 위 모듈로 이전하는 편이 유지보수에 유리하다.  
- **문서**(`SERVER 환경.md` 본 절)는 **“무엇을 내보낼지”** 의 계약이고, **코드**는 **그 구현**이다. **정의(명세)는 문서, 구현(화이트리스트)은 `lib` + 로그인 라우트**가 일반적이다.

---

**준비도 요약 (2026-04-24):** `BusTaams 테이블.md`·본 문서로 **스키마·로그인 페이로드 정책**은 정리 가능하다. `server.js`는 로그인 시 **아직** §3-4 수준( `CUST_ID`·`cancelManage`·`subscription` )이 아니므로, **조인·DTO 도입** 작업이 남는다(§4-2 ②·③과 연동).

---

## 4. `server.js` 수정 **전**·**후**와 **권장 순서**

### 4-1. 수정 전에 확정할 것

1. **`TB_USER` 목표 DDL**: `CUST_ID` PK(또는 UK+별도 PK), `USER_ID` 256, 기존 데이터 **백업·채번 백필** 스크립트.  
2. **FK 전략**: 자식 테이블의 `TRAVELER_ID`/`DRIVER_ID` 등이 **`TB_USER.CUST_ID`를 참조**하도록 할지, 일단 애플리케이션만 맞출지.  
3. **운영 스키마**가 단일 기준임을 확인한다(아래 §6).

### 4-2. 권장 수정 순서 (`server.js` + `routes` 동시)

| 순서 | 작업 | 이유 |
|------|------|------|
| **①** | `ensureTbUserTable`(또는 동등)에서 **`CUST_ID`·`USER_ID(256)`** 반영, 신규 가입 시 `CUST_ID` 발급 | 모든 도메인의 기준점 |
| **②** | **로그인 응답**에 `custId` 포함, 세션·JWT 클레임 정리 | 대시보드 분기·파라미터 정책(§3) 적용 |
| **③** | `TB_AUCTION_REQ` / `TB_BUS_RESERVATION` / 채팅 등 **INSERT·SELECT** 를 `TRAVELER_ID`=`CUST_ID` 규칙으로 통일 | 입찰·예약 파이프 |
| **④** | `TB_FILE_MASTER`·`TB_DRIVER_*`·`TB_BUS_DRIVER_VEHICLE` **식별자 컬럼**을 BUSTAAMS·`CUST_ID` 와 맞춤 | 파일·차량·기사 서류 |
| **⑤** | `TB_CHAT_LOG` / 추후 `TB_CHAT_ROOM` — `SENDER_ID` 등 `varchar(10)` | `실시간채팅_버스기사 화면.md` 와 정합 |
| **⑥** | `TB_USER_DEVICE_TOKEN` 등 **FCM·기기 키**를 운영 컬럼 정의와 일치 | 조회 키 일원화 |
| **⑦** | 레거시 **`UUID_TO_BIN` 등 잘못된 패턴**·인라인 `CREATE` 블록 정리 | 운영 DDL과 불일치 코드 제거(§6) |

### 4-3. 수정 후 검증

- 회원가입·로그인·기사 프로필·입찰·예약·채팅·푸시 **각각 E2E** 또는 최소 통합 테스트.  
- **`BusTaams 테이블.md`** 의 DDL과 **`server.js` `ensure*Table`** 정의가 **운영·문서와 동일 스키마**를 가리키는지 diff.

---

## 5. 전체 테이블 Layout·DDL·REST 정합

| 범위 | 조치 |
|------|------|
| **DDL 단일 원본** | 루트 **`BusTaams 테이블.md`** 에 **전 테이블 `CREATE TABLE` 편철본**을 두고, `server.js` 의 `ensure*Table`·`migrations` 가 이와 맞도록 갱신한다. |
| **복사본** | `busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md` 는 동기화 시 참고용으로 유지하거나, 장기적으로 **`BusTaams 테이블.md` 한 곳**으로 통합한다. |
| **REST** | request/response의 `userId`/`driverId`/`travelerId` 등이 **문자열 길이·의미(`CUST_ID` vs 로그인 `USER_ID`)** 를 API 명세에 명시한다. |

---

## 6. 운영 스키마와 식별자 (UUID 비사용)

버스탐스 **운영에 반영된 전체 테이블**에는 **UUID 형식으로 데이터를 담는 컬럼이 없다**(문자열·숫자형·필요 시 `binary`가 아닌 VARCHAR 기반 식별자 등, **프로젝트가 사용하는 스키마 정의 기준**).  
`TB_USER_DEVICE_TOKEN` 등도 **운영 DB 정의를 따르며**, 문서·코드에 **UUID로 치환·통일한다**는 목표는 **두지 않는다**.

---

## 7. 수정 우선순위 (제안)

의존 관계와 사용자 영향을 기준으로 한 순서입니다. (**`TB_DRIVER_INFO`는 스키마에서 삭제되어 범위에서 제외.**)

| 순서 | 범위 | 이유 |
|------|------|------|
| **P0** | **`TB_USER` — `CUST_ID` 채번·PK/UK, `USER_ID` varchar(256), 로그인/회원가입/프로필** | `CUST_ID` 없이는 타 테이블 FK·세션 파라미터(§3) 정책을 일관되게 적용하기 어려움 |
| **P1** | **`TB_FILE_MASTER` + `FILE_ID` 채번** (`generateNextNumericId` 등, DDL 길이 20과 통일) | 차량·기사 서류·채팅 첨부가 공통 참조 — 먼저 고정하면 하위 수정이 단순해짐 |
| **P2** | **`TB_BUS_DRIVER_VEHICLE`** — 운영 DDL의 `USER_ID`/`BUS_ID`/`FILE_ID` varchar 모델과 쿼리 일치 | 예약·입찰에 `BUS_ID` 선행 |
| **P3** | **`TB_AUCTION_REQ` 계열** — `REQ_ID`/`VIA_ID`/`REQ_BUS_ID` 패딩 채번 | 예약·채팅이 `REQ_ID` 에 의존 |
| **P4** | **`TB_BUS_RESERVATION`** — `RES_ID`, `DATA_STAT` 등 운영 컬럼만 사용, 레거시 쿼리 패턴 제거 | 입찰·확정·운행 완료의 중심 |
| **P5** | **`TB_CHAT_LOG`** — `CHAT_LOG_ID` varchar(20) 채번, 문자열 FK 조인 | `insertTbChatLogMessage` 등 **routes** 동반 점검 |
| **P6** | **`TB_USER_DEVICE_TOKEN`** — 운영 컬럼 정의에 맞춰 FCM 조회 키·`ensure` 일치 | 기기 토큰 일원화 |

**선행 결정 (P3~P5 전 권장):**  
`TB_BUS_RESERVATION` 의 `TRAVELER_ID` / `DRIVER_ID` 는 **varchar(10)** 이고, 저장 값은 **`TB_USER.CUST_ID`** 와 동일(§2-2). 로그인용 **`USER_ID`(256)** 는 예약 행에 넣지 않는 것이 목표이다.

---

## 8. 관련 경로

| 항목 | 경로 |
|------|------|
| 서버 진입 (주) | `busTaams_server/server.js` |
| ID 상한 헬퍼 | `busTaams_server/lib/idConstants.js` |
| 암호화 | `busTaams_server/crypto.js` |
| 통합 DDL(목표 편철) | `BusTaams 테이블.md` |
| DDL 복사본 | `busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md` |
| 아키텍처·암호화·ID 규격 | `ARCHITECTURE.md` |

---

## 9. 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-04-09 | 초안: `server.js` 역할, BUSTAAMS 대비 BINARY/UUID 구간 표, 우선순위 P0~P7, 관련 경로 정리 |
| 2026-04-10 | `CUST_ID`·`USER_ID(256)` 정책, 타 테이블 JOIN 표, 로그인·MainDashBoard·세션 파라미터(§3), `server.js` 수정 순서(§4), DDL·REST 정합(§5), 절 번호 재정렬. 통합 DDL 경로 `BusTaams 테이블.md` 반영 |
| 2026-04-23 | **`TB_DRIVER_INFO` 미사용·DB 삭제 반영.** **운영 스키마에 UUID 형식 컬럼 없음** 명시. **UUID로 변경·도입·마이그레이션 관련 절(구 §6~8 BINARY/UUID 표·구간 목록) 전면 삭제** — 목표는 **VARCHAR·채번·운영 DDL 정합**만 유지. 우선순위 P0~P6 재정렬(`TB_DRIVER_INFO` 제거). 절 번호 §6~9로 정리. |
| 2026-04-24 | **§3-4~3-6** — 로그인→MainDashBoard 공통·확장 파라미터(`TB_USER`·`TB_USER_CANCEL_MANAGE`·`TB_SUBSCRIPTION`), **미포함(민감) 컬럼** 분류, **공통 DTO는 `lib` 권장**·현재 `server.js` 로그인 구현 갭 요약. |
| 2026-04-25 | **§3-4·§3-4-1** — `TB_USER_CANCEL_MANAGE` / `TB_SUBSCRIPTION` **조인 키 `CUST_ID` 기준** 명시, `cancelManage`·`subscription` **객체** 구조·쿼리·JSON 예시·null 규칙 상세. |

---

*이 문서는 구현 상태가 바뀔 때마다 표·우선순위를 갱신하는 것을 권장합니다.*
