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

---

## 🔐 3. Firebase 휴대폰 인증(OTP) 세팅 및 연동 키 발급 방법

현재 프론트엔드(`App.jsx`)에 임시로 하드코딩된 `PLACEHOLDER` 값을 실제 서비스 키로 교체하고, 문자 메세지(SMS) 전송을 진짜로 활성화하는 방법입니다.

### 📍 1단계: Firebase 프로젝트 생성 및 요금제 설정
1. **Firebase 콘솔 접속:** [console.firebase.google.com](https://console.firebase.google.com/)으로 이동합니다.
2. **프로젝트 추가:** 기존 구글 클라우드(GCP) 프로젝트(`bustaams`)가 있다면 해당 프로젝트를 선택하여 연결하거나, 새로 만듭니다.
3. **요금제 업그레이드:** 휴대폰 번호 인증(SMS 발송)은 어뷰징 방지를 위해 Firebase **Blaze 요금제(종량제)**로 전환해야 발송이 허용됩니다. (초기 무상 할당량이 있어 개발/테스트 시 요금은 거의 발생하지 않습니다.)

### 📍 2단계: Authentication (인증) 활성화
1. 좌측 메뉴에서 **[빌드] > [Authentication]**을 클릭하고 `시작하기`를 누릅니다.
2. **[Sign-in method (로그인 방법)]** 탭을 클릭하고, **'전화번호(Phone)'** 제공업체를 찾아 클릭합니다.
3. 스위치를 **'사용 설정(Enable)'**으로 켜고 저장합니다.
*(※ '테스트용 전화번호' 란에 본인의 휴대폰 번호와 가상의 랜덤 인증코드(예: 123456)를 등록해 두면, 비용 차감 없이 안심하고 무한 테스트가 가능합니다.)*

### 📍 3단계: 프론트엔드(`App.jsx`) 웹 SDK 키 발급
1. Firebase 콘솔 좌측 상단의 ⚙️(톱니바퀴) 아이콘을 눌러 **[프로젝트 설정]**으로 이동합니다.
2. `일반` 탭 맨 아래쪽의 **[내 앱]** 섹션에서 `</>` (웹 아이콘)을 눌러 새 웹 앱을 등록합니다. (이름: `bustaams-web` 등)
3. 등록 완료 후 나타나는 `firebaseConfig` 객체 안의 설정값들을 모두 복사합니다.
4. **코드 적용:** `busTaams_web/src/App.jsx` 파일 상단(20번째 줄 부근) 파이어베이스 설정 배열에 복사한 키들을 아래와 같이 덮어씌웁니다.
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyAU5QJ2pnJb37BJ3iUXoppMoi3kRgP55QI",
     authDomain: "project-d481af23-2c56-483d-956.firebaseapp.com",
     projectId: "project-d481af23-2c56-483d-956",
     storageBucket: "project-d481af23-2c56-483d-956.firebasestorage.app",
     messagingSenderId: "98374123431",
     appId: "1:98374123431:web:7db538cf23173492e74082",
     measurementId: "G-XR2RWVL6B4"
   };
   ```

### 📍 4단계: 백엔드(`server.js`) 서버리스 서명 검증 키 발급
프론트엔드에서 획득한 Firebase 인증 토큰이 조작된 토큰이 아닌지 백엔드(`firebase-admin` 라이브러리)에서 교차 검증하기 위해 전용 Admin 권한 키가 필요합니다.

1. 다시 Firebase 콘솔 **[프로젝트 설정]**에서 이번에는 **[서비스 계정]** 탭으로 이동합니다.
2. `Firebase Admin SDK` 구역 하단의 **[새 비공개 키 생성]** 버튼을 클릭하여 `.json` 파일을 다운로드받습니다.
3. 다운로드한 파일을 백엔드 폴더(`busTaams_server/`) 안의 은밀한 곳에 보관합니다. (예: `firebase-admin-key.json`)
4. **코드 적용:** `busTaams_server/.env` 파일 안에 해당 JSON 파일의 상대/절대 경로를 적어줍니다.
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-admin-key.json
   ```
   *(주의: 이 `.json` 파일 역시 절대 GitHub이나 외부에 노출되면 안 되므로 `.gitignore` 파일에 반드시 추가해야 합니다.)*

모든 발급과 세팅이 끝난 후 프론트엔드와 백엔드를 껐다 켜면, 모의 통과 창 대신 **진짜 스마트폰으로 [Web발신] 인증번호 문자가 전송**되며 실서버와 완벽하게 동일한 본인 인증 체계가 가동됩니다!

---

### 🚨 [트러블슈팅] "조직 정책에 따라 서비스 계정 키 생성이 제한되는지 확인하세요" 에러 발생 시

구글 상위 조직이 설정되어 있는 회사(`bustaams-org`) 계정으로 구글 클라우드를 사용할 경우, 구글의 기본자재 보안 조직 정책(Organization Policy) 때문에 최고 관리자라 할지라도 키 다운로드가 강제로 막혀있을 수 있습니다. 아래 방법으로 이 제한을 해제(우회)해야 합니다.

1. **GCP 콘솔 접속:** [console.cloud.google.com](https://console.cloud.google.com/)으로 이동하여 상단에 `bustaams` 프로젝트가 잘 선택되어 있는지 확인합니다.
2. 좌측 상단 햄버거 메뉴(☰)를 클릭 후 **[IAM 및 관리자] > [조직 정책]** (또는 Organization policies) 메뉴를 찾아 클릭합니다.
3. 상단 검색창/필터 영역에서 **`서비스 계정 키 생성 사용 중지`** (영문일 경우 `iam.disableServiceAccountKeyCreation`)를 검색해서 찾아 화면에 나오면 클릭합니다.
4. 해당 화면 상단의 **[정책 수정]**(또는 관리) 버튼을 누릅니다.
5. '정책 적용 대상'을 기본값에서 **맞춤설정(Customize)**으로 변경합니다.
6. 하단 '적용(Enforcement)' 섹션의 옵션을 **[설정 안함]** 또는 **[해제(끄기/Off)]** 상태로 변경합니다. (또는 '모두 허용' 규칙 추가)
7. **[저장]**을 누릅니다.
8. 구글 데이터센터에 규칙이 전파되는데 보통 1~2분 정도의 시간이 소요됩니다. 잠깐 커피 한 모금 드시고, 다시 방금 전 **붉은색 에러 팝업이 떴던 Firebase 콘솔 화면으로 돌아와 새로고침(F5)** 해보시면 빨간 에러가 기적처럼 사라지고 원하시던 파란색 **[새 비공개 키 생성]** 버튼이 활성화되어 있을 것입니다!
