# ☁️ Google Cloud Storage (GCP) 버킷 및 폴더 신규 생성 가이드

본 문서는 `busTaams` 프로젝트의 동적 업로드 리소스(서명, 자격 증명서, 약관 등)를 완벽하게 분리 보관하기 위해 구글 클라우드 스토리지(GCS)를 신규 구축하는 프로세스를 정의합니다.

---

## 🏗️ 1. GCS 버킷 및 폴더 구조 생성 방법

버킷 생성은 누구나 직관적으로 설정할 수 있는 **웹 콘솔(Web Console)** 방식과, 개발자가 터미널에서 1분 만에 세팅할 수 있는 **명령어(CLI)** 방식 두 가지로 나뉩니다. 편하신 방법을 선택하여 진행하세요.

### 📍 방법 A. 구글 클라우드 웹 콘솔(UI)에서 생성하기 (가장 추천)

1. **GCP 콘솔 접속 및 버킷(Bucket) 생성**
   - 구글 클라우드 콘솔([console.cloud.google.com](https://console.cloud.google.com/))에 접속 후 `bustaams` 프로젝트를 선택합니다.
   - 좌측 네비게이션 메뉴에서 **[Cloud Storage] > [버킷(Buckets)]**으로 이동하여 **[만들기(CREATE)]** 버튼을 클릭합니다.
   - **버킷 이름 설정:** 전 세계에서 유일한 이름이어야 합니다. 예: `bustaams-secure-data`
   - **위치 유형 선택:** `Region`(리전)을 선택하고 **`asia-northeast3 (서울)`**로 맞춥니다. (가장 빠른 응답 속도 보장)
   - **스토리지 클래스:** 데이터가 실시간으로 빈번하게 조회/업로드되므로 `Standard`(표준)를 유지합니다.
   - **액세스 제어 규칙:** 보안 사고 방지를 위해 반드시 **`균일한 속성(Uniform)`**에 체크합니다.
   - 하단의 `만들기` 버튼을 눌러 스토리지 컨테이너를 최종 생성합니다.

2. **디렉토리(폴더) 구조 트리 만들기**
   - 방금 만들어진 버킷 이름을 클릭하여 내부로 들어갑니다.
   - **[폴더 만들기(CREATE FOLDER)]** 버튼을 눌러 다음 3개의 최상위 빈 폴더를 생성합니다.
     - 📁 `signatures` (전자 서명 이미지 보관용)
     - 📁 `certificates` (기사님 증명서 통합 보관용)
     - 📁 `terms` (공용 서비스 약관 문서 보관용)
   - `certificates` 폴더 내부로 한 번 더 진입하여 하위에 다음 2개 폴더를 추가로 생성합니다.
     - 📁 `bus_licenses` (버스 운전 자격증 사본)
     - 📁 `accident_free` (무사고 운전 경력 증명서)


### 🧑‍💻 방법 B. 터미널(CLI) 명령어로 즉시 생성하기
개발 PC에 `gcloud` SDK 도구가 설치되어 있고 프로젝트에 인증되어 있다면, 터미널 복사+붙여넣기를 통해 인프라를 스크립팅 방식으로 자동 구축할 수 있습니다.

```bash
# 1. 서울(asia-northeast3) 리전에 균일한 보안(Uniform)을 적용한 전용 버킷 1개 생성
gcloud storage buckets create gs://bustaams-secure-data \
    --location=asia-northeast3 \
    --uniform-bucket-level-access

# 2. GCS는 가상 폴더(Prefix) 개념이므로, /dev/null을 이용해 빈 디렉토리 구조 4개를 순식간에 프로비저닝합니다.
gcloud storage cp /dev/null gs://bustaams-secure-data/signatures/
gcloud storage cp /dev/null gs://bustaams-secure-data/certificates/bus_licenses/
gcloud storage cp /dev/null gs://bustaams-secure-data/certificates/accident_free/
gcloud storage cp /dev/null gs://bustaams-secure-data/terms/
```

---

## ⚙️ 2. 백엔드(Node.js) 연동을 위한 서비스 권한 키 발급 필수 항목

버킷과 폴더 구조가 모두 완성되었다면, 백엔드 서버(`busTaams_server`)가 이 클라우드 폴더를 자유롭게 드나들 수 있는 전용 "보안 출입증(Service Account Key)"을 발급받아야 합니다.

1. **서비스 계정 생성:** 
   - GCP 콘솔 좌측 햄버거 메뉴에서 **[IAM 및 관리자] > [서비스 계정(Service Accounts)]**으로 이동합니다.
   - 상단 `서비스 계정 만들기`를 클릭하고 `bustaams-backend-uploader` (또는 원하는 이름) 라는 계정을 하나 생성합니다.
2. **역할(Role) 부여:**
   - 2단계 권한 탭에서 **`저장소 개체 관리자(Storage Object Admin)`** 권한을 부여하여 저장, 읽기, 삭제가 가능하게 조치합니다.
3. **보안 키(JSON) 발급:**
   - 생성된 서비스 계정 목록을 리스트에서 클릭한 뒤 **[키(Keys)]** 탭으로 진입합니다.
   - **`키 추가` > `새 키 만들기` > `JSON 포맷`**을 선택해 다운로드합니다.
4. **Node.js 연동 준비 마무리:**
   - 다운로드받은 JSON 포맷의 권한 키 파일을 `busTaams_server/` 폴더 밖으로 유출되지 않게 `gcp-key.json` 등의 이름으로 은밀하게 옮겨 둡니다. (GitHub 커밋 시 제외 설정 필수!)
   - 향후 백엔드 코드에서 이 키를 물려주면 프론트엔드 - 백엔드 - GCS 3박자의 클라우드 시스템이 완벽하게 연동됩니다.
