# CommonView — 문서 뷰어 모달

`downloads/문서 View/code.html` 퍼블리싱을 React 모달로 이관하고, 프론트·백엔드·REST API의 모든 영문 식별자를 **CommonView** 네이밍으로 통일한 컴포넌트 정의 문서입니다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 화면 역할 | 계약서·기사 서류 등을 열람하는 전용 **문서 뷰어** |
| 진입 방법 (일반) | 기사 로그인 → DriverDashboard 바로가기 **「문서 뷰어」** 클릭 |
| 진입 방법 (서류) | 차량 정보 등록·수정 모달 서류 카드 **「뷰어로 열기」** 클릭 |
| 형태 | `fixed inset-0` 전체 화면 오버레이 모달 (z-index 200) |
| 원본 파일 | `downloads/문서 View/code.html` |

---

## 2. 동작 모드

CommonView는 props에 따라 두 가지 모드로 동작합니다.

| 모드 | 조건 | 설명 |
|------|------|------|
| **일반 모드** | `fileUuid` 없음 | 샘플 계약서 문서 표시. Library 내비 사이드바. |
| **문서 모드** | `fileUuid` + `userUuid` 전달 | 기사 본인 서류 파일 실제 내용 표시. 좌측에 파일 메타데이터 패널. |

---

## 3. 구현 위치

| 항목 | 경로 |
|------|------|
| 프론트 컴포넌트 | `busTaams_web/src/components/CommonView/CommonView.jsx` |
| App 연동 (일반) | `busTaams_web/src/App.jsx` — `showCommonViewModal` 상태, `<CommonView />` 렌더링 |
| 대시보드 진입 | `busTaams_web/src/components/DriverDashboard/DriverDashboard.jsx` — QuickMenu `onCommonView` |
| 서류 진입 | `busTaams_web/src/components/BusInformationSetup/BusInformationSetup.jsx` — `commonViewTarget` 상태 |
| 백엔드 API | `busTaams_server/server.js` |

---

## 4. 화면 구성

### 4.1 TopNavBar (모달 내 상단 네비바)

| 요소 | 일반 모드 | 문서 모드 |
|------|-----------|-----------|
| 내비 강조 텍스트 | 「문서 뷰어」 | `docTitle` (예: 사업자 등록증) |
| 상단 인쇄 버튼 `common-view-action-print-top` | `window.print()` | 스트림 URL 새 탭 열기 |
| 상단 다운로드 버튼 `common-view-action-download-top` | 미표시 | `attachment` 다운로드 |
| **상단 우측 X 닫기 버튼 `common-view-close-top`** | `close()` 호출 | `close()` 호출 |

- TopNavBar 맨 오른쪽 끝 `×` 아이콘(`close` material symbol)으로 모달을 닫습니다.
- 호버 시 빨간색 계열(`hover:text-red-600`)로 강조되어 닫기 버튼임을 시각적으로 명확히 합니다.

### 4.2 SideBar (좌측, `lg` 이상)

| 일반 모드 | 문서 모드 |
|-----------|-----------|
| Library/Recent/Shared/Archived 내비 + New Document 버튼 | **문서 정보 패널** (문서 종류, 파일명, 형식, 크기, 등록일) + 출력·다운로드 버튼 |

문서 모드 좌측 패널 (`id="common-view-meta-panel"`):
- 문서 종류 (`docTitle` 또는 카테고리 한국어명)
- 파일명: `orgFileNm.fileExt`
- 파일 형식: `fileExt` 대문자
- 크기: `fileSizeLabel`
- 등록일: `regDtLabel`
- 하단: **「문서 출력」** / **「파일 다운로드」** 버튼

### 4.3 본문 헤더

| 요소 | 내용 |
|------|------|
| 제목 `id="common-view-title"` | `docTitle` 또는 「문서 뷰어」 |
| 메타 칩 | 파일명, 파일 형식, 크기 |
| 「문서 출력」 버튼 `common-view-action-print-primary` | 인쇄 처리 |
| 「파일 다운로드」 버튼 `common-view-action-download-primary` | 다운로드 처리 |

### 4.4 문서 뷰어 캔버스

| 파일 형식 | 렌더링 방식 |
|-----------|-------------|
| PDF | `<iframe id="common-view-doc-iframe" src={streamUrl}>` |
| 이미지 (jpg/jpeg/png/webp/gif) | `<img id="common-view-doc-img" src={streamUrl}>` |
| 미지원 형식 | 다운로드 유도 버튼 표시 |

스트림 URL: `GET /api/driver/bus-documents/file?userUuid=...&fileUuid=...` (기존 인라인 스트리밍 엔드포인트)

일반 모드 캔버스: 샘플 계약서 HTML, 페이지네이션 (`id="common-view-pagination"`)

---

## 5. 출력 · 파일 다운로드 기능

### 5.1 권한 제어

- **본인 파일만** 출력·다운로드 가능.
- 서버가 `userUuid`와 `fileUuid`를 `canAccessBusFile()` 함수로 교차 검증:
  - `TB_BUS_DRIVER_VEHICLE` 에서 해당 기사 소유 버스의 서류 UUID 일치 여부 확인
  - `TB_BUS_DRIVER_VEHICLE_FILE_HIST` 이력에서도 추가 검증
  - 불일치 시 `403 Forbidden` 반환 → 프론트에서 에러 표시

### 5.2 출력 (`handlePrint`)

| 모드 | 동작 |
|------|------|
| 일반 모드 | `window.print()` — 현재 모달 뷰 인쇄 |
| 문서 모드 | `window.open(streamUrl, '_blank')` — 새 탭에서 브라우저 내장 PDF/이미지 뷰어로 열어 인쇄 |

### 5.3 파일 다운로드 (`handleDownload`)

| 항목 | 내용 |
|------|------|
| **엔드포인트** | `GET /api/common-view/bus-document/download?userUuid=&fileUuid=` |
| **Content-Disposition** | `attachment; filename*=UTF-8''ORG_FILE_NM.FILE_EXT` |
| **파일명 규칙** | `TB_FILE_MASTER.ORG_FILE_NM` + **"."** + `TB_FILE_MASTER.FILE_EXT` |
| **예시** | `business_license.pdf` |
| **프론트 처리** | `<a href={downloadUrl} download>` 클릭 트리거 |

---

## 6. REST API 연동

**백엔드:** `busTaams_server/server.js`

### 6.1 GET `/api/common-view/document`

일반 모드용 샘플 문서 메타. 쿼리 파라미터 없음.

| 응답 필드 | 설명 |
|-----------|------|
| `commonViewDocumentId` | 문서 고유 ID |
| `fileName` | 표시 파일명 |
| `fileType` | 파일 형식 |
| `fileSizeLabel` | 용량 표시 문자열 |
| `authorName` | 작성자명 |
| `createdAtLabel` | 작성일 |
| `securityLevel` | 보안 등급 |
| `reportNo` | 보고서 번호 |
| `totalPages` | 전체 페이지 수 |

### 6.2 GET `/api/common-view/bus-document/meta`

문서 모드용 파일 메타 조회. **소유 기사 전용.**

| 쿼리 파라미터 | 필수 | 설명 |
|---------------|------|------|
| `userUuid` | ✅ | 로그인 기사 UUID |
| `fileUuid` | ✅ | 조회할 파일 UUID |

| 응답 필드 | 설명 |
|-----------|------|
| `fileUuid` | 파일 UUID |
| `fileCategory` | 파일 카테고리 코드 |
| `orgFileNm` | 원본 파일명 (확장자 미포함, `TB_FILE_MASTER.ORG_FILE_NM`) |
| `fileExt` | 파일 확장자 (`TB_FILE_MASTER.FILE_EXT`) |
| `fileSizeBytes` | 크기 (바이트) |
| `fileSizeLabel` | 크기 표시 문자열 (예: `1.2MB`) |
| `regDtLabel` | 등록일 (예: `2024년 01월 15일`) |

권한 오류 시 `403`, 없을 시 `404`.

### 6.3 GET `/api/common-view/bus-document/download`

파일 다운로드. **소유 기사 전용.**

| 쿼리 파라미터 | 필수 | 설명 |
|---------------|------|------|
| `userUuid` | ✅ | 로그인 기사 UUID |
| `fileUuid` | ✅ | 다운로드할 파일 UUID |

- `Content-Disposition: attachment; filename*=UTF-8''ORG_FILE_NM.FILE_EXT`
- GCS에서 파일을 스트리밍해 클라이언트에 전달.

### 6.4 GET `/api/driver/bus-documents/file` (기존)

인라인 파일 스트리밍 (뷰어 iframe/img 표시용). `Content-Disposition: inline`.

---

## 7. 영문 ID 네이밍 규칙 (CommonView)

모든 식별자는 `commonView` / `common-view` 접두어 사용.

### 7.1 DOM id 목록

| id | 위치 |
|----|------|
| `common-view-root` | 최외곽 오버레이 |
| `common-view-modal` | 모달 패널 |
| `common-view-sidebar` | 좌측 사이드바 |
| `common-view-meta-panel` | 문서 메타 패널 (`<section>`) |
| `common-view-new-document` | New Document 버튼 (일반 모드) |
| `common-view-action-print-top` | 상단 인쇄 버튼 |
| `common-view-action-download-top` | 상단 다운로드 버튼 (문서 모드만) |
| `common-view-action-print-side` | 사이드 인쇄 버튼 (문서 모드만) |
| `common-view-action-download-side` | 사이드 다운로드 버튼 (문서 모드만) |
| `common-view-action-print-primary` | 본문 헤더 인쇄 버튼 |
| `common-view-action-download-primary` | 본문 헤더 다운로드 버튼 |
| `common-view-load-error` | 에러 문구 |
| `common-view-doc-iframe` | PDF 뷰어 iframe (문서 모드) |
| `common-view-doc-img` | 이미지 뷰어 (문서 모드) |
| `common-view-pagination` | 페이지네이션 (일반 모드) |
| `common-view-page-prev` | 이전 페이지 버튼 |
| `common-view-page-next` | 다음 페이지 버튼 |
| `common-view-close-top` | **상단 우측 X 닫기 버튼** (TopNavBar 맨 오른쪽) |
| `common-view-close-bottom` | **하단 우측 「닫기」 버튼** (본문 스크롤 최하단) |
| `common-view-nav-{label}` | 내비 버튼 (일반 모드, library/recent/shared/archived) |

### 7.2 React 상수·함수

| 이름 | 내용 |
|------|------|
| `COMMON_VIEW_ROOT_ID` | `'common-view-root'` |
| `COMMON_VIEW_MODAL_ID` | `'common-view-modal'` |
| `COMMON_VIEW_CATEGORY_LABEL` | 파일 카테고리 코드 → 한국어 표시 매핑 |
| `defaultCommonViewDocument` | 일반 모드 기본값 |
| `fetchCommonViewDocument()` | `GET /api/common-view/document` |
| `fetchCommonViewBusDocMeta(userUuid, fileUuid)` | `GET /api/common-view/bus-document/meta` |

### 7.3 Props

| prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `close` | `() => void` | ✅ | 모달 닫기 |
| `fileUuid` | `string` | 문서 모드에서 필수 | 표시할 파일 UUID |
| `userUuid` | `string` | 문서 모드에서 필수 | 로그인 기사 UUID (권한 검증) |
| `docTitle` | `string` | 선택 | 표시할 문서 제목 (예: `사업자 등록증`) |

### 7.4 BusInformationSetup 상태 (중첩 모달)

| 상태 | 설명 |
|------|------|
| `commonViewTarget` | `{ fileUuid, docTitle }` 또는 `null` |

---

## 8. 진입 흐름

```
[일반 모드]
기사 로그인 → DriverDashboard 바로가기 「문서 뷰어」
  └─ onCommonView() → App.jsx: setShowCommonViewModal(true)
       └─ <CommonView close={...} />   (fileUuid 없음 → 일반 모드)

[문서 모드 — 서류 뷰어]
차량 정보 등록·수정 모달 오픈 → 서류 카드(사업자 등록증 등) 「뷰어로 열기」 버튼 클릭
  └─ setCommonViewTarget({ fileUuid: slot.fileUuid, docTitle: '사업자 등록증' })
       └─ <CommonView fileUuid={...} userUuid={userUuid} docTitle={...} close={...} />
            ├─ GET /api/common-view/bus-document/meta   → 좌측 패널 메타 표시
            ├─ GET /api/driver/bus-documents/file       → iframe/img 인라인 표시
            ├─ 「문서 출력」 → window.open(streamUrl, '_blank')
            └─ 「파일 다운로드」 → GET /api/common-view/bus-document/download
                                     (ORG_FILE_NM.FILE_EXT 파일명으로 저장)
```

---

## 9. 디자인 메모

`ARCHITECTURE.md` Radiant Traveler Design System 기준 적용.

| 항목 | 적용 내용 |
|------|------|
| 색상 | Teal Primary 버튼, Orange Secondary 버튼 |
| 폰트 | `Plus Jakarta Sans`(`font-headline`), `Manrope` |
| 아이콘 | Material Symbols Outlined |
| 배경 계층 | `surface` → `surface-container-low` → `surface-container-lowest` |
| 그림자 | `shadow-ambient` |
| 모서리 | `rounded-3xl`(모달), `rounded-xl`(뷰어), `rounded-full`(버튼) |
| 반응형 | 사이드바 `hidden lg:flex`, 버튼·패딩 `sm:` 분기 |
| z-index | `z-[200]` (BusInformationSetup `z-[100]` 위에 표시) |

---

## 10. 특이사항 및 향후 과제

- 문서 모드에서 `body` 스크롤 잠금은 BusInformationSetup이 이미 잠근 상태이므로 CommonView에서도 동일하게 `overflow = 'hidden'` 재적용.
- **PDF 출력**: 새 탭에서 스트림 URL을 열면 브라우저 내장 PDF 뷰어의 인쇄 기능 사용 가능.
- **페이지 내용**: 일반 모드만 샘플 계약서 표시; 문서 모드는 실제 GCS 파일을 iframe/img로 표시.
- **미지원 형식**: PDF·이미지 외 확장자는 다운로드 유도 버튼으로 대체.
- **향후**: 파일 카테고리별 페이지 분할(여러 파일 목록) 기능 확장 가능.

---

## 10. 모달 닫기 방법

CommonView 모달은 세 가지 방법으로 닫을 수 있습니다.

| 위치 | 요소 | ID | 동작 |
| :--- | :--- | :--- | :--- |
| **TopNavBar 맨 우측 끝** | `×` 아이콘 버튼 | `common-view-close-top` | `close()` 호출. 호버 시 빨간색 강조 |
| **모달 외부 배경** | 반투명 오버레이 클릭 | `aria-label="Close overlay"` | `close()` 호출 |
| **본문 스크롤 최하단 우측** | 「닫기」 텍스트 버튼 | `common-view-close-bottom` | `close()` 호출. 회색(`bg-slate-500`) 채워진 버튼 |

```
┌──────────────────────────────────────────────── [×] ┐  ← common-view-close-top
│  busTaams   Dashboard  문서뷰어  Library   🖨 ⬇  ✕  │
├────────────────────────────────────────────────────┤
│                                                    │
│   (사이드바)       (문서 본문 영역)                   │
│                                                    │
│                                              [닫기] │  ← common-view-close-bottom
└────────────────────────────────────────────────────┘
```

---

*문서 기준: `CommonView.jsx`, `BusInformationSetup.jsx`, `App.jsx`, `DriverDashboard.jsx`, `server.js` 및 `ARCHITECTURE.md`.*
