# BusTaams 로그인 화면 및 백엔드 연동 설계

이 문서는 BusTaams 프로젝트의 로그인 화면 구현 방식과 백엔드 연동 로직, 그리고 로그인 성공 후 권한에 따른 라우팅 흐름을 정의합니다.

## 1. 프론트엔드 화면 구현 (React 전환)

- **원본 소스**: `downloads/bustaams_web/로그인/Login.html`
- **구현 원칙**: 기존 HTML의 화면 형태, 버튼 구성, 색상값, 입력 항목 등 전체적인 시각적 요소를 전혀 훼손하지 않고 React(JSX) 형태로 충실히 재현합니다.
- **컴포넌트 위치**: `src/components/Login/Login.jsx` 및 `Login.css`
- **상태 관리**: 입력받은 아이디(`userId`)와 비밀번호(`password`) 상태를 관리하며, API 통신 후 응답 결과에 따라 부모 컴포넌트(`App.jsx`)로 유저 정보를 전달합니다.

## 2. 데이터베이스 구조 (TB_USER)

`BusTaams_Project 테이블 설계.md`의 구조를 따릅니다.

- **주 키 (Primary Key)**: `USER_UUID` (BINARY(16), 시스템 식별용)
- **사용자 식별자**: `USER_ID_ENC` (암호화된 ID - 이메일 등)
- **비밀번호**: `PASSWORD` (Bcrypt 단방향 해시 암호화)
- **기타 정보**: `USER_NM` (회원 가입 시 성명), `HP_NO` (전화번호), `USER_TYPE` (권한)
- **로그인 타입**: `SNS_TYPE` ('NONE', 'KAKAO', 'NAVER')

## 3. 백엔드 로그인 로직 (RestAPI)

**Endpoint**: `POST /api/users/login`

클라이언트로부터 `userId`와 `password`를 수신하여 다음 검증을 거칩니다:
1. `TB_USER`에서 `USER_ID_ENC`를 복호화하여 일치하는 아이디를 탐색합니다.
2. `bcrypt.compare`를 통해 비밀번호 일치 여부를 검증합니다.
3. 성공 시, 프론트엔드 대시보드 표출에 필요한 핵심 정보(`USER_UUID`, `userName`, `userType`, `phoneNo` 등)를 반환합니다.

## 4. 권한 기반 대시보드 라우팅 (App.jsx)

로그인 성공 후 반환받은 `userType`(회원 구분)에 따라 동적으로 메인 화면이 전환됩니다.

1. **TRAVELER (소비자)**
   - `CustomerDashboard` 화면을 호출합니다.
2. **PARTNER (제휴사/파트너)**
   - `PartnerDashboard` 화면을 호출합니다.
3. **DRIVER (기사님)**
   - `DriverDashboard` 화면을 호출합니다.

해당 라우팅 로직은 최상단 컴포넌트인 `App.jsx`의 React 조건부 렌더링에 통합되어 컨트롤됩니다.
