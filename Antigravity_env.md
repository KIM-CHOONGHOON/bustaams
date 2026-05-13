# BusTaams — Antigravity AI 프로젝트 컨텍스트 (보강본)

이 파일은 Antigravity에 **프로젝트 루트 기준으로 추가**되어, 코드 생성 및 수정 시 저장소 구조와 규약을 빠르게 맞추기 위한 환경 요약본입니다. 상세 내용은 루트의 `ARCHITECTURE.md`를 참고합니다.

---

## 1. 제품 개요
**BusTaams(버스타암스)**: 여행자와 전세버스 기사를 직접 매칭하는 역경매 및 중개 플랫폼입니다. 

---

## 2. 저장소 구조 (루트: `project_bustaams/`)

| 경로 | 역할 | 비고 |
|------|------|------|
| `busTaams_server/` | **통합 백엔드** (Node.js + Express) | `server.js`가 메인 진입점 |
| `busTaams_web/` | **사용자 프론트엔드** (Vite + React) | `src/`에 컴포넌트 위치 |
| `ARCHITECTURE.md` | 시스템 아키텍처 정본 | 프로젝트 규정의 근간 |
| `BusTaams_Project 테이블 설계.md` | 데이터베이스 상세 설계 | 스키마 변경 시 필수 참조 |
| `busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md` | DDL(테이블 생성) 스크립트 모음 | |
| `busTaams_server/sql/` | SQL 마이그레이션 및 스크립트 | |

---

## 3. 백엔드 개발 기준 (`server.js`, `router.js`)

### **라우팅 및 API 설계**
- **우선순위:** 많은 엔드포인트가 `server.js`에 직접 정의되어 있습니다. 기존 API 수정 시 `server.js`와 `routes/` 폴더 내 파일 간의 경로 중복을 반드시 확인하십시오. (예: `auctionTripRouter` 마운트 경로 주의)
- **응답 규격:** 모든 API는 일관된 JSON 형식을 반환합니다.
  - 성공: `res.status(200).json({ data: ... })` 또는 `res.status(200).json(rows)`
  - 실패: `res.status(400/500).json({ error: '메시지', detail: ... })`
- **에러 핸들링:** 모든 비동기 핸들러는 `try-catch`로 감싸고, 에러 발생 시 `console.error('[API_NAME] Error:', error)`를 남깁니다.

### **데이터 처리 패턴**
- **CUST_ID 처리:** DB 쿼리 시 10자리 패딩을 보장합니다. (`LPAD(?, 10, '0')` 사용)
- **날짜/시간:** MySQL의 `DATETIME` 형식을 사용하며, JS에서는 `new Date().toISOString()` 또는 `YYYY-MM-DD HH:mm:ss` 포맷으로 변환하여 처리합니다. (KST 시차 주의)
- **암호화:** 민감 정보(주민번호 등)는 `crypto.js`를 사용하여 `encrypt()`/`decrypt()` 처리합니다.

---

## 4. 프론트엔드 개발 기준 (Vite, React)

### **환경 설정 및 통신**
- **환경 변수:** Vite 환경이므로 모든 변수는 **`VITE_`** 접두어를 사용합니다. (`VITE_API_BASE_URL` 등)
- **API 호출:** `fetch` 또는 `axios`를 사용하며, 하드코딩된 `http://localhost:8080` 보다는 환경 변수를 참조하도록 작성합니다.

### **UI 및 디자인 규격**
- **아이콘:** `Google Material Symbols (Outlined)`를 기본으로 사용합니다. (`<span className="material-symbols-outlined">icon_name</span>`)
- **폰트:** `Pretendard`, `Inter`, 또는 `Roboto`와 같은 깔끔한 Sans-serif 계열을 선호합니다.
- **스타일링:** TailwindCSS를 기반으로 하되, 프로젝트 특유의 `Radiant Traveler` 스타일(고급스러운 그리드, 유리 효과 등)을 유지합니다.

---

## 5. 설계 및 보안 규약

- **식별자 표준:** 핵심 식별자는 **`CUST_ID`**입니다. (`USER_ID`는 로그인 ID용)
- **보안:**
  - 비밀번호: `bcrypt` 사용
  - 민감 데이터: `crypto.js` 모듈을 통한 AES-256-GCM 암호화 준수
- **외부 검증:** 기사 면허 등은 `driverVerification.js` 연동 규약을 따릅니다.

---

## 6. AI 작업 시 필수 가이드라인

1. **정합성 우선:** 테이블/컬럼 수정 전 반드시 `BusTaams_Project 테이블 설계.md` 확인.
2. **ID 명명:** `Uuid` 대신 **`Id`** 사용 (`reqId`, `resId`).
3. **최소 수정:** 무관한 파일 수정 지양, 요청 범위 집중.
4. **한국어 유지:** 사용자 UI 및 안내 문구는 반드시 **한국어**로 작성.
5. **데이터 무결성:** 모든 상태 변경(UPDATE) 시 `MOD_ID`(수정자)와 `MOD_DT`(수정일시)를 필히 포함.

---
*본 문서는 `ARCHITECTURE.md`를 바탕으로 보강되었으며, 환경 변화에 따라 동기화가 필요합니다.*
