# 운전기사 Main 대시보드 (DriverDashboard)

`busTaams_web`에서 로그인 유형이 **기사(DRIVER)** 일 때 표시되는 메인 대시보드 화면에 대한 정리 문서입니다.  
(파일명 `운전기사 MainDashBoard.md.md`는 존재하지 않으며, 본 파일이 단일 원본입니다.)

---

## 0. 전체 테이블 DDL 정본 — **`BusTaams 테이블.md`**

- **프로젝트에서 쓰는 전체(통합) 테이블 `CREATE`·설명**은 루트 [`BusTaams 테이블.md`](./BusTaams%20테이블.md) 에 편철되어 있다. **스키마·컬럼명·FK·길이를 수정·구현할 때는 이 문서(및 `§1`~`§3`)를 최우선**으로 읽는다.
- **동기화 SQL 묶음(export 성격):** [`busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md`](./busTaams_web/BUSTAAMS_테이블%20생성%20쿼리%20전체.md) — 위와 동일하도록 맞출 것(이중 원본). 서버 `server.js` `ensure*Table` 부트스트랩은 빈 DB용이며, 운영은 `SHOW CREATE TABLE` 우선( [`SERVER 환경.md`](./SERVER%20환경.md) ).

**본 대시보드·REST와 직접 맞닿는 테이블(문서 `§0`~`§3`·DDL 에서 확인):**  
`TB_USER`, `TB_AUCTION_REQ`, `TB_AUCTION_REQ_BUS`, `TB_BUS_RESERVATION`, `TB_BUS_DRIVER_VEHICLE` (+ 필요 시 `TB_FILE_MASTER`, 채팅 3분할 `TB_CHAT_LOG` 등).

**JSON/파라미터 네이밍(본 작업 기준):** API·세션 **객체 키**는 가능하면 **`BusTaams` 컬럼 id를 camelCase**로 맞춘다 (`CUST_ID`→`custId`, `REQ_ID`→`reqId`, `DATA_STAT`→`dataStat`/`reqStat` 등은 **엔드포인트별**로 문서/주석에 적시). **삭제·미사용:** 로그인 `user`에서 **`userName`**, **`phoneNo`**, **`tbUserId`** 는 **보내지 않는다**(구 `localStorage`는 `App.jsx` `normalizeUserSession`이 `userNm`/`hpNo`/`userId`로 흡수 후 키 제거).

---

### 식별자 정책 (USER / 기사)

- **`TB_USER` 내부 PK는 `CUST_ID` (`varchar(10)`)** 이다. 로그인·API 세션에 실리는 **문자열 키는 주로 `USER_ID` (`varchar(256)`)** 이고, `SERVER 환경.md`·`loginPayload.js` 방향은 **`DRIVER_ID`·`TRAVELER_ID` 등이 `CUST_ID`와 동일한 값**으로 수렴하는 것이다.  
  **현재 `DriverDashboard`·`/api/driver/*` 쿼리**는 `driverId` = **`TB_USER.USER_ID` 문자열** = `TB_BUS_RESERVATION.DRIVER_ID` 에 넣는 값으로 동작(코드: `server.js` `driverSessionFromQuery` → `normalizeDriverIdParam`) — `CUST_ID` 전면 전환 시 쿼리·응답 DTO를 함께 바꾼다.
- **UUID `BINARY(16)` 컬럼은 이 화면 경로에서 쓰지 않는다** (세션 `uuid`/`userUuid` 필드 **이름**만 레거시 동의어, 값은 위 문자열 ID). `UUID_TO_BIN` 분기는 다른 API에 남을 수 있음.

---

## A. 데이터 모델·DDL 참고 (ARCHITECTURE.md 및 위 정본)

### A.1 `ARCHITECTURE.md`

- **역할:** 프로젝트 구성, 스토리지, Design System, **데이터 암호화 정책**(`TB_USER` 암호화 대상 컬럼 요약) 등.
- **참고:** 일부 옛 문서는 `PHONE_NO`로 적혀 있으나, **DDL**은 전화 컬럼명 **`HP_NO`** ( [`BusTaams 테이블.md`](./BusTaams%20테이블.md) §1 `TB_USER` ).

### A.2 본 화면 관련 주요 컬럼(발췌 — **전문은 `BusTaams 테이블.md` DDL**)

| 테이블 | 식별·연결 | 비고 (DDL·정책) |
|--------|-----------|-----------------|
| `TB_USER` | `CUST_ID` `PK` `varchar(10)`; `USER_ID` `UK` `varchar(256)` | `USER_TYPE` `ENUM` … `'DRIVER'`, `ADMIN` 포함 (`BusTaams` §1) |
| `TB_AUCTION_REQ` | `REQ_ID` `varchar(10)` `PK` | `DATA_STAT` 입찰/확정 등; `TRAVELER_ID` → `TB_USER`(`CUST_ID`) FK(문서 DDL) |
| `TB_BUS_RESERVATION` | `RES_ID`·`REQ_ID`·`REQ_BUS_ID` `varchar(10)` | `DRIVER_ID` = 기사 키(정책상 `CUST_ID`; **현 API** 는 `USER_ID` 문자열을 넣는 흐름이 있을 수 있음 — 길이·운영 diff 시 [`BusTaams` §0-2] 참고) |
| `TB_BUS_DRIVER_VEHICLE` | `BUS_ID`, `USER_ID` (기사 키) | 차량·서류·`HAS_ADAS` 등 (`BusTaams` §3) |

---

## B. UUID 형식에서 문자열 ID로의 전환·채번

- **레거시(일부 쿼리/데이터):** `REQ_UUID`, `RES_UUID`, `DRIVER_UUID`(`BINARY(16)`) 등 + `RES_STAT` / `REQ_STAT` 명칭.
- **목표(ARCH / BUSTAAMS DDL):** `REQ_ID`, `RES_ID`, `REQ_BUS_ID`, `DRIVER_ID`, `TRAVELER_ID` 등 **`varchar(n)` 문자열 키** + 상태 컬럼 **`DATA_STAT`**.
- **채번 규칙:** 업무 규칙상 `varchar(n)` **순번형** ID는 해당 컬럼 길이 `n`에 맞춰 **왼쪽 0 채움** (`String(seq).padStart(n, '0')`).  
  **`TB_USER.USER_ID`**는 가입·로그인에서 결정되는 값으로, 위 순번 규칙의 **예외**일 수 있음(이메일 등 가변 길이).
- **서버:** `busTaams_server/server.js`·`routes/auctionList.js` 등에서 스키마 불일치 시 ARCH 분기로 폴백하는 패턴을 사용합니다.

---

## C. 로그인 후 본 화면으로 전달되는 파라미터 (TB_USER 정합)

### C.1 세션 객체 (`App.jsx` → `<DriverDashboard currentUser={user} />`)

`POST /api/auth/login` · `POST /api/users/login` 응답 `user`는 `buildPostLoginUserDto`(`lib/loginPayload.js`)로 **DDL 컬럼명과 1:1**인 JSON 키( camelCase )를 쓰고, `App.jsx` `normalizeUserSession`으로 구 세션·동의어를 정리한 뒤 `currentUser`로 전달됩니다.

| JSON 키 (응답) | `TB_USER` 컬럼 | Type·길이 (DDL) | 비고 |
|----------------|----------------|-----------------|------|
| `custId` | `CUST_ID` | `varchar(10)` | 0패딩 순번 |
| `userId` | `USER_ID` | `varchar(256)` | 로그인 UK |
| `userNm` | `USER_NM` | `varchar(255)` | |
| `hpNo` | `HP_NO` | `varchar(255)` | |
| `email` | `EMAIL` | `varchar(100)` | |
| `userType` | `USER_TYPE` | ENUM(…) | `DRIVER` 등 |
| `snsType` | `SNS_TYPE` | ENUM | |
| `profileFileId` | `PROFILE_FILE_ID` | `varchar(20)` | |
| `profileImgPath` | `PROFILE_IMG_PATH` | `varchar(512)` | |
| `smsAuthYn` | `SMS_AUTH_YN` | `'Y'`\|`'N'` | |
| `userStat` | `USER_STAT` | ENUM | |
| `joinDt` | `JOIN_DT` | `datetime` | |
| `cancelManage` / `subscription` / `mainDashboard` | (다른 테이블·가공) | — | [`SERVER 환경.md`](./SERVER%20환경.md) §3 |

**클라이언트 전용 동의어( `normalizeUserSession` 이 `userId`와 같은 문자열로 채움, DB 컬럼 아님 ):** `driverId`, `uuid`, `userUuid` — `GET` 쿼리 `driverId`·FCM 등에 사용.

**제거(서버·정규화 후 미전달):** `userName`·`phoneNo`·`tbUserId` (옛 `localStorage`는 마이그레이션 시 키 삭제)

구현: `lib/loginPayload.js` `buildPostLoginUserDto`, `App.jsx` `normalizeUserSession`, `server.js` 로그인 라우트.

### C.2 `DriverDashboard` 내부 식별자 (`driverSessionKey`)

- **함수:** `DriverDashboard.jsx`의 `driverSessionKey(currentUser)`
- **우선순위:** `driverId` → `userId` → `uuid` → `userUuid` → `USER_ID`
- **의미·길이:** 값은 **`TB_USER.USER_ID` (`VARCHAR(256)`)** 와 같아야 하며, 예약·집계의 `TB_BUS_RESERVATION.DRIVER_ID` 와 일치시키는 것이 [`BusTaams`](./BusTaams%20테이블.md) 정책이다.

### C.3 React props (DB 컬럼 아님)

| Prop ID | Type | 설명 |
|---------|------|------|
| `onProfileSetup` | `function` | 기사 정보 관리 |
| `onBusInfoSetup` | `function` | 버스 정보 관리 |
| `onQuotationList` | `function` | 여행자 견적 목록 |
| `onTravelerQuoteDetail` | `function` | `TB_AUCTION_REQ.REQ_ID` (`varchar(10)`) — 인자 `reqId`(권장; 구명 `reqUuid` 호환) |

---

## D. REST API 쿼리 파라미터 (본 화면 `useEffect` 기준)

**기준 URL:** `VITE_API_BASE_URL` 또는 `http://127.0.0.1:8080`

서버는 **`driverId`를 권장**하며, 레거시 호환으로 **`uuid`**, **`driverUuid`** 동일 의미를 허용합니다 (`busTaams_server/server.js`의 `driverSessionFromQuery`).

| API | 권장 쿼리 | 값 = 세션의 | DB 대응(의미) |
|-----|-----------|-------------|----------------|
| `GET /api/driver/dashboard` | `driverId` | `driverSessionKey(currentUser)` | `TB_BUS_RESERVATION.DRIVER_ID` 등 기사 키 |
| `GET /api/driver/schedule/today` | `driverId` | 동일 | 동일 |
| `GET /api/upcoming-trips` | `driverId` | 동일 | 동일 |
| `GET /api/auction-list` | `driverId` (또는 `driverUuid`) | 동일 | `routes/auctionList.js` |

**Type·Length:** 쿼리 문자열은 URL 인코딩된 텍스트이며, 값은 **`TB_USER.USER_ID`와 동일한 비즈니스 ID**로 **최대 256자**(`driverSessionFromQuery` → `normalizeVarcharId`).

#### D-2. Request / Response 요약 (본 화면 `useEffect`·모달)

**공통 Query (하나만 있으면 됨, 우선순위 순)**

| Query 키 | 설명 |
|----------|------|
| `driverId` | 권장. `encodeURIComponent` 후 전달. |
| `uuid` | 레거시 동의어(값은 `USER_ID` 문자열). |
| `driverUuid` | 동일(입찰 목록 `auction-list` 등). |

| 메서드·경로 | 200 응답 JSON (핵심 필드) | 비고 |
|-------------|--------------------------|------|
| `GET /api/driver/dashboard` | `year`, `month`, `currentMonthTotal`, `previousMonthTotal`, `diffFromPrevious`, `compareTone`(`gte_prev`\|`lt_prev`), `bidCount`, `bidAmountSum`, `confirmCount`, `confirmAmountSum`, `activeBids`(=`bidCount`) | `TB_BUS_RESERVATION`·`DRIVER_ID`·`DATA_STAT`=`DONE` 등 집계(주석: `server.js` 해당 GET). 테이블 없으면 0 JSON. |
| `GET /api/driver/schedule/today` | `total`, `items[]` — `reqId` (= `REQ_ID`), `reqUuid` 동일 값(호환), `tripTitle`, `startAddr`, `endAddr`, `startDt`, `busLabel`, `statusLabel` | `server.js` |
| `GET /api/upcoming-trips` | `reqId`/`reqUuid`, `tripTitle`, 주소, `startDt`/`endDt`, `passengerCnt`, `contractAmount`(`DRIVER_BIDDING_PRICE`), `resStat`(`res.DATA_STAT`), 차량 `serviceClass`·`modelNm`·`vehicleNo` | `UpcomingTripsModal` |
| `GET /api/auction-list` | `reqId`·`reqUuid`(동일, `REQ_ID`), `reqStat`(`r.DATA_STAT`), `myBidStat`(`res` 최신) 등 — [`busTaams_server/routes/auctionList.js`](./busTaams_server/routes/auctionList.js) | 프론트는 `reqId \|\| reqUuid` |

| 오류 | 본문 |
|------|------|
| 400 | `{ "error": "driverId·uuid·driverUuid 중 …" }` (식별자 없음) |
| 500 | `{ "error": "<message>" }` |

---

## D-1. 보안·암호화 취급 가이드 (TB_USER / 기사 흐름)

- **`PASSWORD`:** `bcrypt` **cost 10** 단방향만. 로그인·비밀번호 변경은 `bcrypt.compare` / `bcrypt.hash` 만 사용. 평문 비밀번호는 로그·응답에 남기지 않는다.
- **`RESIDENT_NO_ENC`:** `AES-256-GCM` (`busTaams_server/crypto.js`). **저장:** 기사 프로필 저장 시 `TB_USER`에 반영(기존 `TB_DRIVER_INFO.RRN_ENC`와 병행 저장될 수 있음 — DDL 제거 없음). **복호화:** 기사 프로필 조회·진위 검증 등 **필요 API에서만**; 일반 목록·채팅·로그에는 복호화 결과를 넣지 않는다.
- **`USER_NM`·`HP_NO`·`EMAIL`:** ARCHITECTURE 기준 **DB 추가 암호화 대상 아님**(평문 저장). 다만 과거 데이터가 AES 포맷이면 서버가 `plainOrLegacyDecrypt`로 표시 호환.
- **`ENCRYPTION_KEY`:** `.env` 64자 hex; 유출 시 주민번호 계열 복호화 가능 — 커밋 금지, 운영은 Secret Manager 권장.

---

## E. API 응답·필드 (컬럼 id와의 대응)

- **`REQ_ID` (`varchar(10)`)** → JSON **`reqId`**. **`reqUuid` 키는 하위 호환**으로만 유지(값 동일) — **신규 UI는 `reqId`만** 사용 권장.
- 마스터 입찰 상태: **`TB_AUCTION_REQ.DATA_STAT`** → JSON 보통 `reqStat`.
- 예약/입찰 행 상태: **`TB_BUS_RESERVATION.DATA_STAT`** → `upcoming-trips` 등에서 `resStat` 등(엔드포인트별 `server.js` alias 참고).

---

## F. DDL·운영 DB 정합 (코드로 테이블 변경하지 않음 — 검토용 설명)

아래는 **저장소 DDL과 실제 데이터 길이가 어긋날 수 있는 대표 케이스**입니다. **마이그레이션·컬럼 추가/변경은 본 작업에서 수행하지 않았습니다.** 반영 전까지 서버는 레거시/ARCH 분기로 동작합니다.

1. **`TB_BUS_RESERVATION.DRIVER_ID` 길이 vs `TB_USER.USER_ID` (최대 256)**  
   - 짧은 `varchar(10)` 등이면 긴 로그인 ID를 넣을 수 없을 수 있음.  
   - **검토:** `DRIVER_ID`를 `USER_ID`와 동일 규격으로 확장, 또는 별도 짧은 기사 번호 + FK.
2. **`ARCHITECTURE.md` 암호화 표의 `PHONE_NO` vs DDL `HP_NO`**  
   - **검토:** 문서 표기 통일(코드·DDL은 `HP_NO` 기준).
3. **`TB_USER`에 `USER_UUID` 컬럼이 없는 DB**  
   - UUID 세션만 있는 클라이언트는 `resolveDriverPkForReservation`이 실패할 수 있음.  
   - **권장:** 세션에 **`USER_ID`**(`driverId`)를 항상 싣기(현재 로그인 정규화로 대응).

---

## 1. 진입 조건

- **파일:** `busTaams_web/src/App.jsx`
- 홈(`currentView === 'home'`)이고, 로그인 사용자가 있으며 `user.userType === 'DRIVER'` 인 경우 렌더링됩니다.
- **주의:** `currentView === 'signup'`인 상태에서 헤더 로그인만 성공하면 메인 영역은 `SignupPage`만 보일 수 있습니다. 로그인 성공 시 `setCurrentView('home')`으로 전환합니다.
- `driverView` 상태: `'profileSetup'` → `DriverProfileSetup`, 그 외(기본 `'dashboard'`) → **`DriverDashboard`**

---

## 2. 구현 위치

| 항목 | 경로 |
|------|------|
| DDL·테이블 정본 | 루트 [`BusTaams 테이블.md`](./BusTaams%20테이블.md) (수정 시 최우선) |
| 메인 컴포넌트 | `busTaams_web/src/components/DriverDashboard/DriverDashboard.jsx` |
| 세션 정규화 | `busTaams_web/src/App.jsx` (`normalizeUserSession`) |
| 대시보드·일정·운행예정 API | `busTaams_server/server.js` (`GET /api/driver/dashboard`, `…/schedule/today`, `GET /api/upcoming-trips`) |
| 입찰 목록 API | `busTaams_server/routes/auctionList.js` (`GET /api/auction-list`) |
| 로그인 페이로드 DTO | `busTaams_server/lib/loginPayload.js` |

---

## 3. 화면 구성 요약

단일 파일 내에서 하위 UI를 함수 컴포넌트로 나누어 구성합니다. **좌측 사이드바는 사용하지 않습니다.** 로그아웃·계정은 앱 **전역 `Header`**에서 처리합니다.

### 3.1 상단 영역 — 전역 Header만 사용

과거 `TopAppBar`는 전역 헤더를 가려 **제거**되었습니다. 본문은 **`pt-8`** 정도의 일반 여백만 둡니다.

### 3.2 DashboardTopSection

| 영역 | 내용 |
|------|------|
| 좌 | `TodaySchedule` — `GET /api/driver/schedule/today`의 `items[0]` |
| 우 | 총 운임 + 활성 입찰 — `GET /api/driver/dashboard` ([`총 운임 비교 섹션.md`](./총%20운임%20비교%20섹션.md), [`활성 입찰 섹션.md`](./활성%20입찰%20섹션.md)) |

### 3.3 QuickMenu

| 메뉴 | 연결 |
|------|------|
| 기사/버스/견적/운행예정/채팅 등 | `App.jsx`에서 전달한 콜백·모달 |

### 3.4 TodaySchedule

- `GET /api/driver/schedule/today` 응답 `items`의 첫 번째만 표시 ([`오늘의 일정 섹션.md`](./오늘의%20일정%20섹션.md)).
- 「운행 시작하기」는 `reqUuid`(실질 `REQ_ID`)를 `onTravelerQuoteDetail`로 전달.

### 3.5 AuctionList — 실시간 입찰 기회

- `GET /api/auction-list?driverId=…` — 마스터 필터는 **`TB_AUCTION_REQ.DATA_STAT IN ('AUCTION','BIDDING')`** 등 ARCH/레거시 분기.
- 상세: [`실시간 입찰 기회 섹션.md`](./실시간%20입찰%20기회%20섹션.md)

### 3.6 FAB

- 우측 하단 `+` — 동작 미연결

---

## 4. API 연동 (요약)

`driverSessionKey(currentUser)`가 있을 때 병렬 요청:

| 메서드·경로 | 용도 |
|-------------|------|
| `GET /api/driver/dashboard?driverId=` | 대시보드 통계 |
| `GET /api/driver/schedule/today?driverId=` | 당일 일정 |
| `GET /api/auction-list?driverId=` | 실시간 입찰 |
| `GET /api/upcoming-trips?driverId=` | `UpcomingTripsModal` 내부 |

실패 시 운임·일정·입찰은 빈 데이터 또는 0 표시될 수 있습니다.

---

## 5. 네비게이션

사이드바 없음. 전역 `Header` + 본문 바로가기·카드로 이동합니다.

---

## 6. 디자인 메모

`ARCHITECTURE.md` Design System(Teal/Orange, 타이포, Material Symbols)과 맞춘 Tailwind 사용. 본문 `max-w-7xl` 중앙 정렬.

---

## 7. 관련 컴포넌트

- `DriverProfileSetup`, `UpcomingTripsModal`, `LiveChatBusDriver` 등 — 기사 식별자는 `driverId` prop 우선, `driverUuid` 레거시 호환.

---

## 8. 변경 이력

| 일자(참고) | 내용 |
|------------|------|
| — | `TopAppBar` 제거, `pt-8`, QuickMenu·일정·운임·입찰 개편 (기존 이력) |
| 2026-04-09 | SideNavBar 제거, 라벨 정리, 총 운임·활성 입찰·오늘의 일정 개편 |
| 2026-04-09 | **스키마 문서 정리:** ARCHITECTURE·BUSTAAMS DDL 참조, UUID→ID 채번, 세션/`driverId`·REST 쿼리·TB_USER 정합 표 추가 |
| 2026-04-09 | **구현:** 로그인 세션에 `driverId`·`uuid` 동기화, 대시보드 API를 `driverId` 쿼리로 통일; 서버 `driverSessionFromQuery`로 `uuid`/`driverUuid` 호환 |
| 2026-04-09 | **ID 256·암호화:** `normalizeVarcharId`/`clipBizVarcharId`, `TB_USER.RESIDENT_NO_ENC`·`PUT /api/user/profile` 평문 EMAIL/HP_NO, `plainOrLegacyDecrypt` 표시 호환, 가이드 **§D-1** |
| 2026-04-30 | **§0** — 전체 DDL 정본을 **`BusTaams 테이블.md`** 로 명시. `CUST_ID`·`USER_ID` 구분, **§D-2** Request/Response 표, 세션 `custId`·구현 경로·변경 이력 정리. |
| 2026-04-30 | **세션/로그인 DTO:** `userNm`·`hpNo`·`userId`·`custId`만 (`tbUserId`·`userName`·`phoneNo` 제거). **`reqId`/`REQ_ID`** — 일정·입찰·`DriverDashboard` 정합. `buildPostLoginUserDto`·`normalizeUserSession`·§C·§E·§D-2 갱신. |

---

*문서·코드 기준: `BusTaams 테이블.md`(DDL 정본), `DriverDashboard.jsx`, `App.jsx`, `server.js`, `auctionList.js`, `BUSTAAMS_테이블 생성 쿼리 전체.md`, `SERVER 환경.md`.*
