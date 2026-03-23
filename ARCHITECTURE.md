# 프로젝트 환경 정의서 (Project Architecture)

**프로젝트 명칭:** bustaams

본 문서는 `bustaams` 프로젝트의 전체 시스템 구성 요소와 폴더 구조, 각 파트별 역할 및 연동 방식을 정의한 관리자용 문서입니다.

---

## 🏗 시스템 구성 및 역할

### 1. 프론트엔드 (Frontend)
- **작성 폴더:** `busTaams_web`
- **기술 스택:** React
- **상세 설명:** 
  - 일반 웹 사용자를 위한 프론트엔드 서비스입니다.
  - iOS, iPadOS, Windows 등 다양한 OS 및 디바이스 환경에서 원활하게 동작하도록 **반응형 웹(Responsive Web)**으로 구축됩니다.
  - 백엔드(`busTaams_server`)에서 제공하는 REST API를 호출하여 데이터를 연동합니다.

### 2. 백엔드 (Backend)
- **작성 폴더:** `busTaams_server`
- **기술 스택:** Node.js (Express)
- **상세 설명:**
  - 데이터 처리 및 비즈니스 로직을 담당하는 핵심 서버 파트입니다.
  - 프론트엔드(`busTaams_web`) 및 앱 프론트(`busTaams_app`)와 통신하기 위한 **REST API / JSON 응답**을 전담합니다.

---

### 💡 React + Node.js 풀스택 아키텍처 (작동 원리 및 이점)

#### 1. 왜 이 조합이 좋은가요?
- **언어의 통일성 (JavaScript)**: 프론트엔드와 백엔드 모두 자바스크립트(또는 타입스크립트)를 사용합니다. 문법이 같아서 전환이 빠르고, 코드를 공유하기 좋습니다.
- **비동기 처리 효율성**: Node.js는 가볍고 빠르며, 많은 사용자의 요청을 동시에 처리하는 데 특화되어 있어 React 앱의 서버로 매우 적합합니다.
- **강력한 커뮤니티**: npm(노드 패키지 매니저)을 통해 필요한 기능을 거의 대부분 라이브러리로 파워풀하게 가져다 쓸 수 있습니다.

#### 2. 어떻게 연결되나요? (작동 원리)
보통 다음과 같은 흐름으로 데이터를 주고받습니다.
- **React (프론트)**: 사용자가 버튼을 누르면(예: 버스 입찰 신청), API 요청(`fetch` 또는 `axios`)을 보냅니다.
- **Node.js (백엔드)**: 요청을 받아 데이터베이스(DB)에서 정보를 꺼내거나 저장합니다.
- **응답 (Response)**: 서버가 처리 결과를 JSON 형태로 React에 돌려주면, React가 화면을 부드럽게 업데이트합니다.

#### 3. 프로젝트 구조 추천
현재 `bus-taams` 폴더 안에 프론트와 백엔드를 분리해서 독립적으로 관리하는 것이 버전에 따른 협업과 배포에 유리합니다.
- `busTaams_web/`: React 프론트엔드 (현재 작업 중인 곳)
- `busTaams_server/`: Node.js 백엔드 (새로 구축하실 곳)
- `busTaams_admin/`: 관리자용 React 페이지 (이미 폴더를 만드셨네요!)

#### 4. 지금 바로 시작해볼 수 있는 체크리스트
- [ ] **Node.js 서버 폴더 생성**: 터미널에서 `mkdir busTaams_server` 명령어를 통해 서버 폴더 뼈대 생성
- [ ] **Express 설치**: Node.js에서 가장 많이 쓰는 웹 프레임워크인 Express를 설치해서 서버 라우팅 뼈대를 편하게 잡습니다.
- [ ] **API 설계**: "입찰 목록 가져오기", "로그인하기" 등 프론트엔드에서 필요한 기능들을 서버 내 함수로 정의합니다.

---

### 3. 관리자 (Admin)
- **작성 폴더:** `busTaams_admin`
- **상세 설명:**
  - 관리자용 프론트엔드와 백엔드가 결합된 통합 관리 시스템입니다.
  - 일반 사용자와 관리자 환경을 분리하기 위해 **별도의 URL**을 이용하여 접근 및 관리하도록 구성됩니다.

### 4. 앱 프론트 (App Frontend)
- **작성 폴더:** `busTaams_app`
- **상세 설명:**
  - 모바일 애플리케이션 화면을 구성하는 앱의 프론트엔드 요소입니다.
  - 서버 측 데이터 처리 및 비즈니스 로직은 `busTaams_server` 폴더에서 일괄 관리되며, REST API를 통해 연동됩니다.

---

## 🗂 디렉토리 구조 요약 (Directory Structure)

```text
bustaams/
├── busTaams_web/      # [프론트엔드] React 기반 반응형 웹 (현재 작업 중)
├── busTaams_server/   # [백엔드] Node.js(Express) 기반, Web/App 공통 기능 및 JSON API 제공 (기존 Java 대체)
├── busTaams_admin/    # [관리자] 관리자 전용 React 페이지 (별도 관리자 URL 사용)
└── busTaams_app/      # [앱프론트] 모바일 앱 프론트엔드
```

### 💡 풀스택 구조에서의 정확한 역할 (쉽게 정리한 상태)
새로운 Node.js 기반 환경에서는 **`busTaams_server` 폴더 하나가 백엔드의 모든 역할(비즈니스 로직 처리 + REST API 라우팅)을 통째로 전담**합니다. 
- **`busTaams_web`**: 껍데기(UI) 화면을 유저에게 보여주며, 유저 클릭 등의 액션 발생 시 `busTaams_server`로 API 요청(문서)을 보냅니다.
- **`busTaams_server`**: 유저의 요청을 받아들여(REST API 수신) 유효성을 확인하고, DB(`TB_USER` 등)를 조작한 뒤 그 결과값을 다시 JSON의 형태로 프론트엔드에 응답해 주는 "완전한 뒷단 서버" 역할을 수행합니다. 
- **(🚫 기존 `busTaams_api` 폴더 제한)**: Node.js로의 백엔드 통합 변경에 따라, 기존 Java 기반의 `busTaams_api`는 사용하지 않고 영구 폐기(또는 아카이브 보관)합니다. 즉 앞으로의 모든 DB 연동 및 API 코딩은 오직 **`busTaams_server`** 폴더 안에서 진행됩니다.

---

## 📂 파일 및 스토리지 아키텍처 (Storage Architecture)

본 프로젝트는 소스 코드의 무결성(Integrity)을 유지하고 서버 운영/배포의 독립성을 보장하기 위해, 앱 구동에 필요한 고정 리소스(Static)와 유저가 생성하는 동적 리소스(Dynamic)의 저장소를 물리적으로 완벽히 분리하여 운영합니다.

### 1. [Workspace] 공용 정적 에셋 (Static UI Assets)
애플리케이션 전반의 UI 디자인을 구성하는 고정 이미지들은 프론트엔드 코드 저장소 내부에 포함되어 브라우저 내 빌드(Build) 결과물과 함께 서비스됩니다.
- **물리적 경로:** `busTaams_web/src/assets/images/`
- **저장 대상:** 회사 공식 로고(`bustaams_bus_logo.png`), UI 패턴, 고정된 배경화면 아이콘 등

### 2. [Google Cloud Storage] 사용자 동적 업로드 데이터 분리 저장 (Dynamic Data)
Git 저장소의 치명적 오염과 서버 스케일아웃(Scale-out) 시 발생하는 파일 동기화·용량 한계 이슈를 원천 차단하기 위해, 회원이 능동적으로 생성/업로드하는 모든 개인정보 및 파일은 앱 서버(Workspace)가 아닌 **구글 클라우드 스토리지(Google Cloud Storage, GCS)** 시스템에 완벽히 독립적으로 저장됩니다. 

파일의 종류 및 보안 접근(Access Control) 목적에 따라 GCS 버킷(Bucket) 내 하위 폴더 트리(Prefix)를 다음과 같이 강제 분류하여 관리합니다.

- **2-1. [서명 데이터] 전자 서명 파일 보관소**
  - **GCS 경로:** `gs://[프로젝트ID]-secure-bucket/signatures/{YYYYMM}/`
  - **용도:** 회원 가입 및 제휴 맺을 때 생성/캡처되는 `.png` 형태의 서명 이미지 전용 저장소
  - **접근 권한:** Private (백엔드에서 임시로 발급하는 Signed URL을 통해서만 조회 가능)
  
- **2-2. [기사 서류] 민감 자격 증명서 보관소**
  - **GCS 경로:** `gs://[프로젝트ID]-secure-bucket/certificates/bus_licenses/` (버스 운전 자격증 사본)
  - **GCS 경로:** `gs://[프로젝트ID]-secure-bucket/certificates/accident_free/` (무사고 운전 경력 증명서)
  - **용도:** 시스템상 가장 엄격한 취급이 필요한 기사님의 물리적 사진/스캔 증명서 데이터 적재
  - **접근 권한:** Strict Private (인가된 관리자 및 자사 시스템 내 REST API를 통해서만 열람 가능)

- **2-3. [서비스 공통 서류] 약관 및 규정 정적 문서 저장소**
  - **GCS 경로:** `gs://[프로젝트ID]-public-bucket/terms/`
  - **용도:** 데이터베이스 테이블 관리가 어려운 분량의 약관 PDF 문서(`서비스이용약관.pdf` 등), 마케팅 동의서 원본 파일 보관용
  - **접근 권한:** Public Read (누구나 다운로드 가능하도록 CDN 캐싱을 통해 배포 권장)

*※ 핵심 룰: 백엔드(`busTaams_server`)는 클라이언트가 전송한 바이너리 파일이나 생성된 캔버스 PNG 값을 수신한 즉시 GCS로 업로드 요청 스트림을 전송해야 하며, MySQL 데이터베이스(`TB_USER` 등)에는 파일 원본이나 바이너리가 아닌, 발급된 GCS 스토리지 최종 접근 URL 주소(`https://storage.googleapis.com/...`) 문자열만 기록해야 합니다.*

---

## 🎨 DESIGN 표준 (Web & App 공통)

본 섹션은 `busTaams_web`(프론트엔드) 및 `busTaams_app`(앱 프론트엔드)에서 일관성 있게 동일하게 적용되어야 하는 공통 UI/UX 화면 표준(Design System) 가이드라인입니다.

### Design System Strategy: The Radiant Traveler

#### 1. Overview & Creative North Star
**Creative North Star: "The Digital Concierge"**

This design system is built to evoke the breezy, high-energy anticipation of a spring/summer journey. Unlike standard booking platforms that feel utilitarian and rigid, this system adopts an **Editorial High-End** approach. We achieve this by breaking the "template" look through intentional asymmetry, generous white space, and a sophisticated layering of surfaces.

The visual language balances the reliability of a professional auction platform with the vibrant energy of travel. We move away from traditional box-heavy layouts toward an open-canvas feel, where information breathes and priority is established through tonal depth and typographic scale rather than heavy lines.

---

#### 2. Color Strategy: Tonal Energy
Our palette uses a foundation of professional Teal complemented by an energetic Orange, set against a sophisticated neutral background hierarchy.

##### The Palette (Core Tokens)
- **Primary (Teal):** `#00685f` (Primary) / `#008378` (Container)
- **Secondary (Orange):** `#9d4300` (Secondary) / `#fd761a` (Container)
- **Backgrounds:** `#f7f9fb` (Surface) / `#ffffff` (Surface Lowest)
- **Success/Error:** Standardized tonal reds and greens via `error` and `surface_tint` tokens.

##### Signature Rules
*   **The "No-Line" Rule:** We strictly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a search filter section using `surface_container_low` sits directly on a `surface` background without a stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers. An auction card (`surface_container_lowest`) should sit atop a section background (`surface_container_low`) to create a natural "lift."
*   **The "Glass & Gradient" Rule:** Use Glassmorphism for floating navigation and high-level overlays. Apply `surface` colors at 80% opacity with a `backdrop-filter: blur(20px)` to create a premium, frosted-glass effect. 
*   **Signature Textures:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` to `primary_container` (Teal) or `secondary` to `secondary_container` (Orange) at a 135-degree angle to add "soul" and dimension.

---

#### 3. Typography: Editorial Authority
We utilize two distinct typefaces to create a custom, high-end feel.

*   **Display & Headlines (Plus Jakarta Sans):** Used for large headers and auction titles. Its geometric yet friendly curves reflect the "spring/summer" vibe.
*   **Body & Labels (Manrope / Pretendard):** Optimized for high legibility in auction details and form inputs.

**Hierarchy Principles:**
- **High Contrast:** Use `display-lg` (3.5rem) for hero statements to create an editorial impact.
- **Micro-Copy:** Use `label-md` with increased letter-spacing for meta-data (e.g., "AUCTION ENDS IN") to provide an authoritative, clean look.

---

#### 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Stacking surface tiers defines priority. 
    *   *Base:* `surface`
    *   *Section:* `surface_container_low`
    *   *Interactive Card:* `surface_container_lowest` (Pure White)
*   **Ambient Shadows:** For floating modals or "active" states, use extra-diffused shadows.
    *   *Token:* `box-shadow: 0 12px 40px rgba(0, 104, 95, 0.06);` (Notice the tint is a low-opacity version of the Primary Teal, not black/gray).
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at 15% opacity. Never use 100% opaque borders.

---

#### 5. Components

##### 5.1 Buttons (버튼)
All buttons use the `md` (0.75rem) or `lg` (1rem) roundedness scale.
- **Primary (주요 버튼):** Teal gradient (`primary` to `primary_container`). White text. No border.
- **Secondary (보조 버튼):** Orange gradient (`secondary` to `secondary_container`). White text.
- **Ghost/Outline (고스트 버튼):** No background. `primary` text. Use the "Ghost Border" rule if necessary.
- **Disabled:** `surface_dim` background with `on_surface_variant` text.

##### 5.2 Form Elements (폼 요소)
- **Input Fields (입력창):** Use `surface_container_high` backgrounds instead of white boxes with borders. On focus, transition the background to `surface_lowest` and add a 2px `primary` ghost border (20% opacity).
- **Checkboxes & Radios:** When checked, use `primary` (Teal). Use a soft `primary_fixed` shadow to indicate the active state.

##### 5.3 Feedback & Navigation (피드백 및 내비게이션)
- **Modals (모달):** Glassmorphic header with `surface_container_lowest` body. Use `xl` (1.5rem) corner radius for a friendly, modern feel.
- **Mobile Tab Bar (모바일 탭바):** A floating glass element centered at the bottom, using `surface` with 80% opacity and a subtle ambient shadow.
- **Lists (리스트):** Forbid dividers. Use `spacing.8` (2rem) of vertical white space or alternating subtle background shifts (`surface` vs `surface_container_low`).

##### 5.4 Signature Component: The Auction Card
A bespoke card for bus auctions.
- Background: `surface_container_lowest`.
- Radius: `lg` (1rem).
- Detail: A subtle orange accent line (2px) on the left side of the card to denote "High Priority" or "Ending Soon," rather than an intrusive badge.

---

#### 6. Do's and Don'ts

##### Do (권장 사항)
- **Do** use whitespace as a functional tool to group information.
- **Do** use the Teal primary for "Action" and Orange secondary for "Urgency/Attention."
- **Do** ensure all Korean text uses `Pretendard` for perfect weight distribution and readability across devices.
- **Do** use the `surface_bright` token for backgrounds in sunny, outdoor-themed sections.

##### Don't (금지 사항)
- **Don't** use 1px solid black or dark gray borders.
- **Don't** use standard drop shadows (e.g., `rgba(0,0,0,0.5)`). Only use tinted, ambient shadows.
- **Don't** crowd the screen. If a section feels busy, increase the spacing token by one level (e.g., from `spacing.4` to `spacing.6`).
- **Don't** use sharp corners. Everything must feel organic and approachable, staying within the `md` to `xl` roundedness range.
