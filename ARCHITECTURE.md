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
  - 백엔드(`busTaams_api`)에서 제공하는 REST API를 호출하여 데이터를 연동합니다.

### 2. 백엔드 (Backend)
- **작성 폴더:** `busTaams_api`
- **기술 스택:** Java (MVC 패턴)
- **상세 설명:**
  - 데이터 처리 및 비즈니스 로직을 담당하는 핵심 서버 파트입니다.
  - 프론트엔드(`busTaams_web`) 및 앱 프론트(`busTaams_app`)와 통신하기 위한 **REST API**를 제공합니다.
  - 이 폴더 내에서 Web과 App을 위한 Java 소스와 REST API 코드를 통합하여 함께 관리합니다.

### 3. 관리자 (Admin)
- **작성 폴더:** `busTaams_admin`
- **상세 설명:**
  - 관리자용 프론트엔드와 백엔드가 결합된 통합 관리 시스템입니다.
  - 일반 사용자와 관리자 환경을 분리하기 위해 **별도의 URL**을 이용하여 접근 및 관리하도록 구성됩니다.

### 4. 앱 프론트 (App Frontend)
- **작성 폴더:** `busTaams_app`
- **상세 설명:**
  - 모바일 애플리케이션 화면을 구성하는 앱의 프론트엔드 요소입니다.
  - 서버 측 데이터 처리는 `busTaams_api` 폴더에서 일괄 관리되며, REST API를 통해 연동됩니다.

---

## 🗂 디렉토리 구조 요약 (Directory Structure)

```text
bustaams/
├── busTaams_web/      # [프론트엔드] React 기반 반응형 웹 (iOS, iPadOS, Windows 지원)
├── busTaams_api/      # [백엔드] Java MVC 기반, Web/App 공통 기능 및 REST API 제공
├── busTaams_admin/    # [관리자] 관리자 전용 프론트엔드/백엔드 (별도 관리자 URL 사용)
└── busTaams_app/      # [앱프론트] 모바일 앱 프론트엔드
```

---

## 📂 파일 저장 경로 (File Storage Paths)

본 프로젝트에서 사용되는 주요 인증/증명서 정적 파일들은 프론트엔드 환경의 `assets` 폴더 하위에서 체계적으로 분류되어 관리됩니다.

### 1. 공용 이미지 에셋 (Common Images)
bustaams 프로젝트 전반의 화면 UI를 구성하는 데 필요한 범용적인 디자인 이미지 파일들은 별도의 이미지 전용 폴더로 모아 관리합니다.
- **경로:** `busTaams_web/src/assets/images/`
- **용도:** 회사 로고(`bustaams_bus_logo.png`), 아이콘, 배경화면 등 어플리케이션 전반에서 공용으로 사용되는 모든 `.png` 및 시각적 정적 이미지 파일 보관

### 2. 기사님 증명서 관리
기사님의 신뢰도를 검증하기 위한 필수 자격/증명 서류들은 `busTaams_web/src/assets/certificates/` 폴더 하위에서 용도별로 격리되어 저장됩니다.

- **버스운전 자격증 증명서**
  - **경로:** `busTaams_web/src/assets/certificates/bus_licenses/`
  - **용도:** 기사님이 업로드한 버스운전 자격증 원본 이미지 및 사본 파일 보관
- **무사고 증명서**
  - **경로:** `busTaams_web/src/assets/certificates/accident_free/`
  - **용도:** 무사고 운전 경력 증명서 파일 보관

*※ 향후 사업자등록증 등 추가 증명서가 필요할 경우, 동일하게 `certificates/` 하위에 새로운 하위 폴더를 생성하여 일관된 파일 트리 구조를 유지합니다.*

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
