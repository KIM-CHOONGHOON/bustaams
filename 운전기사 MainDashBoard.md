# 운전기사 Main 대시보드 (DriverDashboard)

`busTaams_web`에서 로그인 유형이 **기사(DRIVER)** 일 때 표시되는 메인 대시보드 화면에 대한 정리 문서입니다.

---

## 1. 진입 조건

- **파일:** `busTaams_web/src/App.jsx`
- 홈(`currentView === 'home'`)이고, 로그인 사용자가 있으며 `user.userType === 'DRIVER'` 인 경우 렌더링됩니다.
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

### 3.1 SideNavBar (좌측 사이드바, `md` 이상에서 표시)

- **브랜드:** busTaams
- **프로필:** 이미지(외부 URL 고정), 이름 `driver?.name` 없으면 **「프리미엄 캡틴」**, 「인증된 멤버」
- **메뉴 항목 (라벨):** 메인 플릿, 실시간 입찰, 운행 일정, 결제 내역, 인증 정보, 설정  
  → 클릭 시 `activeMenu`만 변경, **메인 영역 콘텐츠는 전환되지 않음** (아래 5절 참고)
- **버튼:** 신규 버스 등록 (동작 미연결)
- **하단:** 고객지원, 로그아웃 (`onLogout`)

### 3.2 TopAppBar (상단 고정)

- 제목: 「대시보드」
- 내비 링크: 대시보드, 경매, 운행 일정, 견적 관리 (대부분 `#` 또는 시각용)
- 검색 입력, 알림, 계정 아이콘

### 3.3 EarningsSection — 「오늘의 성과」

- 총 수익 카드: API `stats.totalRevenue` 또는 기본값 `₩1,240,000`
- 활성 입찰 카드: `stats.activeBids` 또는 기본 `8`, 진행 바는 12 기준 비율

### 3.4 QuickMenu — 「바로가기 메뉴」

| 메뉴 | 연결 |
|------|------|
| 기사 정보 | `onProfileSetup()` → 프로필 설정 화면으로 전환 |
| 버스 정보 | `onBusInfoSetup()` → App에서 버스 정보 모달 등 |
| 견적 리스트 | `onQuotationRequests()` → 견적 모달 등 |
| 예정/보류/완료/거절 리스트, 실시간 채팅, 정산 관리, 요금제 선택 | `action` 없음 → 클릭 시 동작 없음 |

### 3.5 TodaySchedule — 「오늘의 일정」

- `schedule` 배열의 **첫 번째 요소**만 사용 (`time`, `route`, `departure`, `bus`)
- 없을 때는 문서에 적힌 기본 문구(예: 오후 02:30, 서울 ↔ 부산 정기 운행 등) 표시

### 3.6 AuctionList — 「실시간 입찰 기회」

- API에서 받은 `auctions`가 있으면 사용, 없으면 **내장 목업 데이터**(`defaultAuctions`) 사용

### 3.7 FAB

- 우측 하단 `+` 플로팅 버튼 — 동작 미연결

---

## 4. API 연동

**기준 URL:** `import.meta.env.VITE_API_BASE_URL` 또는 기본 `http://127.0.0.1:8080`

`currentUser.uuid`가 있을 때 `useEffect`에서 병렬 요청:

| 메서드·경로 | 용도 | 상태 변수 |
|-------------|------|-----------|
| `GET /api/driver/dashboard?uuid={uuid}` | 대시보드 통계 | `stats` |
| `GET /api/driver/schedule/today?uuid={uuid}` | 당일 일정 | `schedule` |
| `GET /api/driver/auctions` | 입찰 목록 | `auctions` |

**참고:** 현재 `busTaams_server/server.js`에는 위 GET 경로가 없고, 기사 관련으로는 예를 들어 `POST /api/driver/profile`, `POST /api/driver/profile-setup`, `POST /api/driver/bus`, `GET /api/driver/quotation-requests` 등만 존재합니다. 따라서 대시보드용 GET은 **404 등으로 실패할 수 있으며**, 그 경우 UI는 **목업·기본값**에 의존합니다.

`loading` 상태는 있으나 **로딩 UI는 거의 없음.**

---

## 5. 네비게이션 한계

- 사이드바·탑바의 여러 메뉴는 **시각적 하이라이트(`activeMenu`) 또는 링크 형태**만 있고, **실제 라우팅·화면 전환은 구현되어 있지 않습니다.**
- 사용자가 보는 메인 콘텐츠는 항상 동일한 대시보드 레이아웃(성과 → 바로가기 → 일정+입찰)입니다.

---

## 6. 디자인 메모

- 프로젝트 `ARCHITECTURE.md`의 Design System(Teal/Orange, Plus Jakarta Sans, Material Symbols 등)과 맞춘 Tailwind 유틸 클래스 사용.
- 반응형: 사이드바는 `hidden md:flex`로 모바일에서는 숨김.

---

## 7. 관련 컴포넌트 (App 기준)

- `DriverProfileSetup` — 기사 프로필 등록 화면
- `DriverProfileModal`, 버스 정보 모달, 견적 모달 등은 App에서 `DriverDashboard`에 콜백으로 연결

---

*문서 작성 기준: 저장소 내 `DriverDashboard.jsx` 및 `App.jsx`, `server.js` 기준.*
