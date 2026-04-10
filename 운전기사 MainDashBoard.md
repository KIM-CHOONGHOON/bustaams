# 운전기사 Main 대시보드 (DriverDashboard)

`busTaams_web`에서 로그인 유형이 **기사(DRIVER)** 일 때 표시되는 메인 대시보드 화면에 대한 정리 문서입니다.

---

## 1. 진입 조건

- **파일:** `busTaams_web/src/App.jsx`
- 홈(`currentView === 'home'`)이고, 로그인 사용자가 있으며 `user.userType === 'DRIVER'` 인 경우 렌더링됩니다.
- **주의:** `currentView === 'signup'`(회원가입 전체 화면)인 상태에서 헤더 로그인만 성공하면, 메인 영역은 계속 `SignupPage`만 그려져 `DriverDashboard`가 보이지 않을 수 있습니다. 로그인 성공 시 `setCurrentView('home')`으로 전환하도록 처리합니다.
- `driverView` 상태:
  - `'profileSetup'` → `DriverProfileSetup` (기사 등록/프로필 설정)
  - 그 외(기본 `'dashboard'`) → **`DriverDashboard`**

---

## 2. 구현 위치

| 항목 | 경로 |
|------|------|
| 메인 컴포넌트 | `busTaams_web/src/components/DriverDashboard/DriverDashboard.jsx` |

---

## 3. 화면 구성 요약

단일 파일 내에서 하위 UI를 함수 컴포넌트로 나누어 구성합니다.

**좌측 사이드바는 사용하지 않습니다.** (과거에 있던 프로필·메인 플릿 등 내비·신규 버스 등록·고객지원·로그아웃 영역은 제거됨. 로그아웃·계정은 앱 **전역 `Header`**에서 처리.)

### 3.1 상단 영역 — **전역 Header만 사용 (페이지 전용 TopAppBar 없음)**

이전에는 `DriverDashboard` 내부에 **`TopAppBar`**(고정 상단바: 제목·탭·검색·알림 등)가 있었으나, 아래 이유로 **제거**되었습니다.

| 항목 | 내용 |
|------|------|
| **문제** | `TopAppBar`가 `fixed top-0` + `bg-white/80` 등으로 뷰포트 최상단을 덮어, `App.jsx`의 **BusTaams 메인 `Header`**(로고·네비·로그인/내 정보)가 가려짐 |
| **의도** | 삭제한 구역(구 탑바 자리)에는 **아무 것도 그리지 않음**. 흰색 등으로 덮어쓰지 않고, **전역 헤더가 그대로 보이도록** 함 |
| **알림·계정** | 페이지 전용 아이콘 대신 **앱 상단 `Header`**의 내 정보·로그아웃·드롭다운 등을 사용 |

**본문 여백:** 고정 탑바용 `pt-28`을 제거하고, 전역 헤더 아래에서만 시작하도록 **`pt-8`** 정도의 일반 여백만 둠 (`DriverDashboard.jsx` 메인 콘텐츠 래퍼).

### 3.2 DashboardTopSection — 상단 한 묶음 (오늘의 일정 + 운임·활성 입찰)

하나의 `<section>`에 **12칸 그리드**로 배치합니다. 과거 좌측에 있던 **「오늘의 성과」제목·설명 텍스트**는 **「오늘의 일정」** UI로 대체되었고, 우측 **총 운임·활성 입찰** 두 카드는 그대로입니다.

| 영역 | 너비(대형 화면) | 내용 |
|------|-----------------|------|
| **좌** | `lg:col-span-4` | **`TodaySchedule`** — 제목 「오늘의 일정」+ 당일 확정 일정 카드 1건 (`GET /api/driver/schedule/today` 의 `items[0]`). **「전체보기」 버튼 없음.** |
| **우** | `lg:col-span-8` | **총 운임 카드** + **활성 입찰 카드** (`GET /api/driver/dashboard`) — 명세: [`총 운임 비교 섹션.md`](./총%20운임%20비교%20섹션.md), [`활성 입찰 섹션.md`](./활성%20입찰%20섹션.md) |

운행 예정 **전체 목록**은 바로가기 **「운행예정목록 조회」** → `UpcomingTripsModal` 로만 진입합니다.

### 3.3 QuickMenu — 「바로가기 메뉴」

| 메뉴 | 연결 |
|------|------|
| 기사 정보 관리 | `onProfileSetup()` → 프로필 설정 화면으로 전환 |
| 버스 정보 관리 | `onBusInfoSetup()` → App에서 버스 정보 모달 등 |
| 여행자 견적 목록 조회 | `onQuotationList()` → 견적 모달 등 |
| 운행예정목록 조회 | `upcomingTrips` → **UpcomingTrips** 모달 (`UpcomingTripsModal`, 명세: [`운행예정목록 화면.md`](./운행예정목록%20화면.md) · UI 축약: [`운행예정목록.md`](./운행예정목록.md)) |
| 완료/거절 리스트, 실시간 채팅, 정산 관리 | `key` 없음 → 클릭 시 동작 없음 |

> **CommonView(문서 뷰어)는 대시보드 바로가기 메뉴에 포함되지 않습니다.**  
> CommonView 모달은 각 모달(차량 정보 등록 등)에서 필요한 시점에 직접 호출하는 방식이며, 대시보드 레벨에서 독립적으로 진입하는 메뉴가 아닙니다.

### 3.4 TodaySchedule — 「오늘의 일정」

- `DriverDashboard.jsx` 내 **`TodaySchedule`** 서브 컴포넌트. **상단 `DashboardTopSection` 좌측 열에만** 사용되며, 하단에는 중복 배치하지 않음.
- `GET /api/driver/schedule/today` 응답 `items`의 **첫 번째 요소**만 카드에 표시 (명세: [`오늘의 일정 섹션.md`](./오늘의%20일정%20섹션.md) 참고).
- **「전체보기」 버튼 없음** (삭제됨).
- 데이터 없음 시 카드 안내 문구 표시.

### 3.5 AuctionList — 「실시간 입찰 기회」

- `GET /api/auction-list?driverUuid=` 응답의 `items` 사용 (`TB_AUCTION_REQ.REQ_STAT = 'BIDDING'`)
- 카드에 **버스 썸네일 없음** — 배지·노선·부가정보·현재 최고가·「입찰 참여」/「입찰 제시 변경」만 표시
- 상세 명세는 [`실시간 입찰 기회 섹션.md`](./실시간 입찰 기회%20섹션.md) 참고

### 3.6 FAB

- 우측 하단 `+` 플로팅 버튼 — 동작 미연결

---

## 4. API 연동

**기준 URL:** `import.meta.env.VITE_API_BASE_URL` 또는 기본 `http://127.0.0.1:8080`

`currentUser.uuid` / `userUuid` / `USER_UUID_STR` 중 하나가 있을 때 `useEffect`에서 병렬 요청:

| 메서드·경로 | 용도 | 상태 변수 |
|-------------|------|-----------|
| `GET /api/driver/dashboard?uuid={uuid}` | 대시보드 통계 | `stats` |
| `GET /api/driver/schedule/today?uuid={uuid}` | 당일 일정 | `todayScheduleItems` |
| `GET /api/upcoming-trips?driverUuid={uuid}` | 운행 예정 목록 모달 (**UpcomingTrips**) | `UpcomingTripsModal` 내부 fetch |
| `GET /api/auction-list?driverUuid={uuid}` | 실시간 입찰 기회 목록 | `auctionList` |

**참고:** **`GET /api/driver/dashboard`**, **`GET /api/driver/schedule/today`**, **`GET /api/upcoming-trips`**, **`GET /api/auction-list`** 는 `server.js`에 구현되어 있습니다. 대시보드 API 실패 시 운임 카드는 금액 `0`·클라이언트 기준 년월 제목으로 표시될 수 있습니다.

---

## 5. 네비게이션

- **사이드바(프로필·좌측 메뉴·신규 버스 등록·고객지원·로그아웃 영역)는 없음.** 앱 전역 `Header`와 본문 바로가기 메뉴·카드 등으로만 이동.
- 본문은 **상단(일정+운임·입찰 카드) → 바로가기 → 실시간 입찰 기회** 단일 세로 레이아웃.

---

## 6. 디자인 메모

- 프로젝트 `ARCHITECTURE.md`의 Design System(Teal/Orange, Plus Jakarta Sans, Material Symbols 등)과 맞춘 Tailwind 유틸 클래스 사용.
- 본문은 전역 헤더 아래 **가로 전체** 폭(`max-w-7xl` 중앙 정렬)으로 표시.

---

## 7. 관련 컴포넌트 (App 기준)

- `DriverProfileSetup` — 기사 프로필 등록 화면
- `DriverProfileModal`, 버스 정보 모달, 견적 모달 등은 App에서 `DriverDashboard`에 콜백으로 연결

---

## 8. 변경 이력 (상단 레이아웃)

| 일자(참고) | 내용 |
|------------|------|
| — | `DriverDashboard.jsx`에서 **`TopAppBar` 컴포넌트 및 사용처 삭제** — 전역 `Header`와 중복·가림 방지 |
| — | 메인 영역 상단 패딩 **`pt-28` → `pt-8`** — 고정 탑바용 여백 제거 |
| — | QuickMenu에서 **「문서 뷰어」(CommonView) 항목 삭제** — CommonView는 각 모달에서 필요 시 직접 호출하는 방식으로 변경, `App.jsx`의 `showCommonViewModal` state 및 `onCommonView` prop 제거 |
| 2026-04-09 | **SideNavBar 제거** — 좌측 사이드바(브랜드·프로필·메뉴·신규 버스 등록·고객지원·로그아웃) 삭제. `DriverDashboard`에서 `onLogout` prop 제거, `App.jsx`에서 해당 전달 제거 |
| 2026-04-09 | **QuickMenu** — 기사/버스/견적 라벨을 「기사 정보 관리」「버스 정보 관리」「여행자 견적 목록 조회」로 변경. 「보류 리스트」「요금제 선택」 항목 삭제 |
| 2026-04-09 | **총 운임 비교** — 「총 수익」카드를 `YYYY년 MM월 총 운임 금액`·당월/전월 `DONE` 합계·전월 대비 색상(적/청)으로 변경, `GET /api/driver/dashboard` 구현 ([`총 운임 비교 섹션.md`](./총%20운임%20비교%20섹션.md)) |
| 2026-04-09 | **활성 입찰** — 우측 카드를 REQ/CONFIRM 건수·금액 4지표로 확장 ([`활성 입찰 섹션.md`](./활성%20입찰%20섹션.md)) |
| 2026-04-09 | **상단 섹션 개편** — 좌측 「오늘의 성과」텍스트 블록을 「**오늘의 일정**」(`TodaySchedule`)으로 대체. 동일 `<section>` 우측에 총 운임·활성 입찰 카드 유지. 일정 「전체보기」 삭제. 하단 그리드에서 일정 열 제거 → `AuctionList` 만 전폭. 구현명 `DashboardTopSection`. |

---

*문서 작성 기준: 저장소 내 `DriverDashboard.jsx` 및 `App.jsx`, `server.js` 기준. 상단 레이아웃은 위 변경 이력 반영.*
