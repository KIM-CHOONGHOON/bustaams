# APP 홈페이지 구성 (`busTaams_web/src/App.jsx`)

버스탐스 웹 앱의 **루트 레이아웃·랜딩(비로그인 홈)·로그인 후 분기·오버레이** 는 `App.jsx` 에서 정의됩니다. (각 대시보드·모달의 **세부 UI** 는 해당 컴포넌트 파일을 참고.)

---

## 1. 파일 역할

| 구분 | 설명 |
|------|------|
| 진입점 | React 앱에서 `App` 컴포넌트가 최상위 셸 역할 |
| 상태 | `user`, `currentView`, 각종 모달/드로어 표시 플래그, 여행자/기사 서브뷰 등 |
| 세션 | `localStorage` 키 `user` 로 복원, `normalizeUserSession` 으로 필드 정규화 |
| 스타일 | Tailwind 유틸리티, Design System 토큰(`surface`, `primary` 등) |

---

## 2. 루트 레이아웃 조건

| 조건 | 루트 `div` 클래스 | 의미 |
|------|-------------------|------|
| `currentView === 'home'` **且** `!user` (**게스트 랜딩**) | `h-dvh max-h-dvh overflow-hidden` | 헤더+히어로+푸터를 **한 뷰포트 높이** 안에 맞춤(스크롤 없음 목표) |
| 그 외 (로그인 후, 회원가입 페이지 등) | `min-h-screen` | 일반 스크롤 가능한 최소 전체 높이 |

변수: `isGuestLanding = currentView === 'home' && !user`

---

## 3. 화면 트리 (요약)

```
App
├── Header                    … 전 구간 공통
├── [게스트 랜딩]
│   ├── main
│   │   └── Hero              … 히어로 섹션만
│   └── Footer                … 컴팩트 푸터
├── [그 외]
│   └── main
│       ├── (home + user)     … 역할별 대시보드 또는 서브화면
│       └── (signup)          … SignupPage
├── 로그인 모달 (조건부)
├── 계정 설정 (조건부)
├── 기타 비즈니스 모달/오버레이 (조건부)
└── LiveChatTraveler (항상 마운트, open prop으로 제어)
```

---

## 4. Header (`Header` 컴포넌트)

| 영역 | 비로그인 (`!user`) | 로그인 (`user`) |
|------|-------------------|-----------------|
| **좌측** | 버튼: 클릭 시 `onLogoClick` → `handleLogoClick` | 동일 |
| **로고 이미지** | `assets/images/BUSTAAM_FULL_LOGO.png` | 동일 |
| **우측** | ① `BUSTAAMS_NAME_LOGO.png` (링크 `#`, `preventDefault`) ② **로그인** → `setShowLoginModal(true)` ③ **회원가입** → 상위에서 내려준 `setShowSignUpModal` (실제로는 `currentView` 를 회원가입으로 전환하는 콜백) | 환영 칩(이름·유형), **내 정보**, **로그아웃** |

- 헤더 바 높이: 컨테이너 `h-24`, `shrink-0` 로 랜딩 시 flex 레이아웃에서 축소 방지.
- 제거된 항목(문서 시점): 가운데 네비 「이용 고객 전용」「기사님 전용」드롭다운, 「이용 약관」단독 링크.

---

## 5. 게스트 랜딩 (`isGuestLanding`)

| 순서 | 블록 | 내용 |
|------|------|------|
| 1 | `main` | `flex-1 min-h-0 overflow-hidden` — 남는 높이를 히어로에 할당 |
| 2 | **Hero** | 배경: 외부 URL 풍경 이미지(전체 덮음, opacity·blend). 본문: 제목 「여행의 시작, busTaams와 함께」, 부제 카피. 반응형 타이포. |
| 3 | **Footer** | 3열(브랜드·고객지원·소셜) + 하단 저작권·약관 링크. 패딩·간격은 한 화면 배치용으로 컴팩트. |

**히어로에서 제거된 섹션(이력):** 「왜 busTaams 인가요?」카드 3개, 봄맞이 프로모 배너 — 현재 `App.jsx` 히어로에는 없음.

---

## 6. 로그인 후 `main` (`currentView === 'home'` 이고 `user` 존재)

`user.userType` 기준 분기 (대문자 정규화는 `normalizeUserSession`).

| `userType` | 렌더 컴포넌트 | 비고 |
|------------|----------------|------|
| `CONSUMER` / `TRAVELER` / `CUSTOMER` | `CustomerDashboard` | `customerView === 'confirmedList'` 이면 `ReservationCompletedList` |
| `DRIVER` | `DriverDashboard` | 프로필/버스/견적/상세 콜백 연결 |
| `SALES` / `PARTNER` | `PartnerDashboard` | `onLogout` 전달 |
| 기타 | `null` | 빈 메인 |

이때 **Footer 는 표시하지 않음** (`App.jsx` 기준).

---

## 7. 회원가입 전환 (`currentView !== 'home'`)

- `main` 안에 **`SignupPage`** 만 전체 영역으로 표시.
- 헤더의 회원가입 버튼은 상위에서 `setCurrentView('signup')` 으로 연결되는 콜백 사용.

---

## 8. 오버레이·모달 (루트 `App` 하단, 조건부)

| 플래그 / 조건 | 컴포넌트·내용 |
|---------------|----------------|
| `showLoginModal` | 전체 화면 딤 + `Login` 카드 |
| `showAccountSettings` | `AccountSettings` |
| `showSignUpModal` | `SignUpModal` (별도 소규모 가입 모달) |
| `showBusInfoModal` | `BusInformationSetup` |
| `showProfileSetupModal` | `DriverProfileSetup` |
| `showQuotationModal` | `ListOfTravelerQuotations` |
| `travelerQuoteReqUuid` | `TravelerQuoteRequestDetails` |
| `showReservationListModal` | `ReservationList` 래퍼(닫기 버튼·큰 패널) |
| `showBusRegisterModal` | `CreateBusRequest` |
| `LiveChatTraveler` | `open` / `onClose` / `travelerUuid` |

---

## 9. 공통 헬퍼·부가 기능

| 이름 | 역할 |
|------|------|
| `normalizeUserSession` | `userType` 대문자, `uuid`/`userUuid`/`driverId` 동기화, PK 256자 `clipBizVarcharId` |
| `handleLogoClick` | 모달 정리, `currentView` → `home`, 기사면 `driverView` 초기화, 스크롤 상단 |
| `handleLogout` | `localStorage` 제거, `user` null, 관련 뷰·플래그 초기화 |
| `useEffect` + `registerWebFcmTokenIfPossible` | 로그인 시 FCM 등록 시도 |

---

## 10. 관련 자산 경로 (헤더·랜딩)

| 용도 | 경로 |
|------|------|
| 풀 로고(헤더 좌측) | `src/assets/images/BUSTAAM_FULL_LOGO.png` |
| 네임 로고(비로그인 시 로그인 왼쪽) | `src/assets/images/BUSTAAMS_NAME_LOGO.png` |

---

## 11. 변경 이력 (문서)

| 일자 | 내용 |
|------|------|
| 2026-04-09 | 초안: `App.jsx` 기준 랜딩/헤더/푸터/분기/모달 구조 정리 |

---

*구현 세부는 항상 `busTaams_web/src/App.jsx` 와 동기화할 것.*
