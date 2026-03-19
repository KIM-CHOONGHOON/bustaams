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
