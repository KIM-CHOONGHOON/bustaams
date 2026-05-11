# 운전기사 Main 대시보드 (DriverDashboard) — 개발 정본

로그인 유형이 **버스기사(`USER_TYPE = DRIVER`)** 일 때 표시되는 **메인 홈(대시보드)** 를 프론트·백엔드·REST까지 한 번에 재구현할 수 있도록 정리한다.  
**스키마 단일 정본:** [`BusTaams_Project 테이블 설계.md`](./BusTaams_Project%20테이블%20설계.md)

---

## 0. 아키텍처 요약

| 항목 | 내용 |
|------|------|
| 프론트 컴포넌트 | `busTaams_web/src/components/DriverDashboard/DriverDashboard.jsx` |
| 앱 진입 | `App.jsx` — `user.userType === 'DRIVER'` 이고 `currentView === 'home'` |
| **Router** | **별도 `router.js` 없음** — API는 `busTaams_server/server.js` 의 `app.get` 등으로 등록, 일부는 `require('./routes/...')(app, pool)` |
| 기사 키 (`DRIVER_ID`) | 설계상 **`TB_BUS_RESERVATION.DRIVER_ID` = `TB_USER.CUST_ID`** (`varchar(10)`). API는 `custId`·`driverId`·`uuid` 등으로 받은 뒤 **`TB_USER`에서 `CUST_ID`로 정규화** 후 조회한다. |

---

## 1. 레이아웃·메뉴 (`DriverDashboard.jsx`)

### 1.1 상단 2단 — 순서: **여행 일정 → 여행 상세**

| 영역 | 설명 |
|------|------|
| **여행 일정** | 시스템 연·월 **달력**. 좌·우 버튼으로 **1개월 단위** 이동. |
| **여행 상세** | 선택한 일정의 상세·경유지 목록. **고정 높이**(`h-[min(28rem,70vh)]`), **출발·경유·도착 목록 영역만** 세로 스크롤. |

**달력 마커 (도착일 = `TB_AUCTION_REQ.END_DT` 일자):**

| `TB_BUS_RESERVATION.DATA_STAT` | 표시 |
|--------------------------------|------|
| `BIDDING` | 진노랑 **삼각형** |
| `CONFIRM` | 진파랑 **사각형** |
| `DONE` | 진빨강 **원** |

조회 대상 상태: **`BIDDING`, `CONFIRM`, `DONE`** 만.  
일자 필터: 표시 중인 달에 대해 **`DATE(END_DT)`** 가 해당 월 `[1일, 다음 달 1일)` 에 포함되는 예약.

같은 도착일에 복수 건이 있으면 캘린더 칸에 마커를 나열하고, **여행 상세** 상단에서 건별 칩으로 전환 가능.

### 1.2 여행 상세 출력

- **기준:** `TB_BUS_RESERVATION` + `TB_AUCTION_REQ` + `TB_AUCTION_REQ_BUS`(LEFT, `REQ_ID`·`REQ_BUS_SEQ`) + `TB_AUCTION_REQ_VIA`(`REQ_ID`, `ORDER BY VIA_SEQ`).
- **상태 줄:**  
  - `BIDDING`: 진노랑 삼각형 + **「청약등록」**  
  - `CONFIRM`: 진파랑 사각형 + **「청약확정」**  
  - `DONE`: 진빨강 원 + **「여행종료」**
- **일시 줄:** `TB_AUCTION_REQ.START_DT` ~ `END_DT` → **`YYYY-MM-DD HH:MM`** (`→` 구분).
- **경유 줄:** `VIA_TYPE`별 라벨 + `VIA_ADDR`  
  - `START_NODE` → 출발지  
  - `START_WAY` → 출발 경유지  
  - `ROUND_TRIP` → 목적지  
  - `END_WAY` → 도착 경유지  
  - `END_NODE` → 도착지  
- 하단 버튼: **견적·요청 상세로 이동** (`onTravelerQuoteDetail({ reqId, reqBusSeq })`).

### 1.3 하단 메뉴 — **등록/변경 메뉴** / **조회 메뉴**

두 블록 제목 모두 동일 타이포: **`text-xl font-bold text-on-surface ml-2`**.

| 구분 | 라벨 | 동작 |
|------|------|------|
| **등록/변경** | 기사 정보 관리 | `onProfileSetup` |
| **등록/변경** | 카드 및 월회비 | `BillingSubscription` 모달 |
| **등록/변경** | 버스 정보 관리 | `onBusInfoSetup` |
| **조회** | **여행 예정 목록 조회** | `UpcomingTripsModal` (강조 테두리) |
| **조회** | 여행 완료 목록 | 미연결(플레이스홀더) |
| **조회** | 청약 취소 목록 조회 | 미연결 |
| **조회** | 여행자와 대화 | `CommonLiveChat` |
| **조회** | 정산 관리 | 미연결 |
| **조회** | 여행 요청 목록 조회 | `onQuotationList` |
| **조회** | 기사님 청약 목록 | `onDriversListOfBids` |

### 1.4 제거·미사용 (본 대시보드)

- **「월 총 운임 금액」** 섹션 및 **`GET /api/driver/dashboard`** — **삭제됨** (프론트 호출 없음, 라우트 제거).
- 구 **「활성 입찰」** 카드 — **삭제**; 대체로 **여행 일정** 달력.
- 구 **「오늘의 일정」** 단독 카드 — **「여행 상세」**로 대체 (`GET /api/driver/schedule/today` 는 레거시 호환용으로 서버에 남을 수 있으나 대시보드에서는 **미사용**).

### 1.5 모달·오버레이

- `BillingSubscription`, `UpcomingTripsModal`, `CommonLiveChat`
- 우하단 FAB `+` — 동작 미연결

---

## 2. `BusTaams_Project` 테이블 매핑

| 테이블 | 용도 |
|--------|------|
| **TB_USER** | 세션 키 → `CUST_ID` 정규화 |
| **TB_BUS_RESERVATION** | `DRIVER_ID`, `REQ_ID`, `RES_ID`, `REQ_BUS_SEQ`, `DATA_STAT` |
| **TB_AUCTION_REQ** | `TRIP_TITLE`, `START_DT`, `END_DT` (달력·상세 일시) |
| **TB_AUCTION_REQ_BUS** | `REQ_ID`, `REQ_BUS_SEQ` 조인 — 차량 유형 등 |
| **TB_AUCTION_REQ_VIA** | `REQ_ID`, `VIA_SEQ`, `VIA_TYPE`, `VIA_ADDR` |

---

## 3. REST API (`server.js`)

| 메서드 | 경로 | Query | 용도 |
|--------|------|-------|------|
| GET | `/api/driver/schedule/calendar` | `custId` \| `driverId` \| `uuid`, **`year`**, **`month`(1–12)** | 달력 월별 도착일 기준 예약 목록 |
| GET | `/api/driver/trip-detail` | 위 + `reqId`, `resId`, **`reqBusSeq`** | 여행 상세 + 경유 |
| GET | `/api/driver/schedule/today` | `custId` \| … | (레거시) 당일 확정 일정 — 대시보드 비사용 |
| GET | `/api/upcoming-trips` | `driverId` \| `custId` \| `uuid` | 여행 예정 모달 |
| GET | `/api/DriversListOfBids` | … | 청약 목록 |
| GET | `/api/list-of-traveler-quotations` | … | 여행 요청 목록 |
| GET | `/api/billing-subscription` | `driverId` | 카드·월회비 |

**삭제:** `GET /api/driver/dashboard` (월 총 운임·구 활성 입찰 집계).

### 3.1 `GET /api/driver/schedule/calendar`

- `resolveDriverCustIdForReservations` 로 기사 `CUST_ID` 확정.
- `TB_BUS_RESERVATION` ⋈ `TB_AUCTION_REQ` (`REQ_ID`).
- `DRIVER_ID = ?`, `DATA_STAT IN ('BIDDING','CONFIRM','DONE')`.
- `DATE(r.END_DT) >= 해당월1일` AND `DATE(r.END_DT) < 다음달1일`.

### 3.2 `GET /api/driver/trip-detail`

- 예약 1건 매칭: `DRIVER_ID`, `REQ_ID`, `RES_ID`, `REQ_BUS_SEQ`, 상태 위 3종.
- `TB_AUCTION_REQ_BUS` **LEFT JOIN** (버스 행 없을 수 있음).
- `TB_AUCTION_REQ_VIA` 별도 조회, `ORDER BY VIA_SEQ`.

---

## 4. 프론트 API 호출 (마운트·월 변경)

- `GET /api/driver/schedule/calendar?custId=&year=&month=`
- 일정 선택 시 `GET /api/driver/trip-detail?custId=&reqId=&resId=&reqBusSeq=`

환경: `VITE_API_BASE_URL` 또는 기본 `http://127.0.0.1:8080`

---

## 5. 검증 체크리스트

- [ ] 달력 이전/다음 달 전환 시 API `year`·`month` 일치
- [ ] 도착일(`END_DT`)이 같은 달에만 표시되는지
- [ ] `BIDDING` / `CONFIRM` / `DONE` 만 달력·상세에 노출
- [ ] 여행 상세 경유 스크롤·고정 높이
- [ ] 등록/변경·조회 제목 폰트 동일
- [ ] `driver/dashboard` 호출이 코드·문서에 남아 있지 않은지

---

## 6. 관련 문서

- [`BusTaams_Project 테이블 설계.md`](./BusTaams_Project%20테이블%20설계.md)
- [`여행자와 대화(버스기사).md`](./여행자와%20대화(버스기사).md)
- [`기사님 청약 목록.md`](./기사님%20청약%20목록.md)

---

*본 문서는 저장소 현행 `DriverDashboard.jsx`, `server.js`(캘린더·상세 구간)를 기준으로 작성하였다.*
