# BusTaams 로그인 화면 및 백엔드 연동 설계

이 문서는 BusTaams 프로젝트의 로그인 화면 구현 방식과 백엔드 연동 로직을 정의합니다.

## 1. 프론트엔드 화면 구현 (React 전환)

- **원본 소스**: `downloads\bustaams_web\로그인\Login.html`
- **구현 방식**: 기존 HTML/CSS 디자인을 그대로 유지하며 React 컴포넌트로 변환합니다.
- **디자인 준수**: 화면의 형태, 버튼 구성, 색상값, 그라데이션, 글래스모피즘 효과 등 전체적인 시각적 요소는 수정하지 않고 HTML 구조를 React(JSX) 형태로 충실히 재현합니다.
- **컴포넌트 위치**: `src/components/Login/Login.jsx` 및 `Login.css`

## 2. 데이터베이스 구조 (TB_USER)

로그인 및 회원 관리를 위한 테이블 구조는 다음과 같습니다.

- **주 키 (Primary Key)**: `USER_UUID` (BINARY(16), 시스템 식별용)
- **사용자 식별자**: `USER_ID_ENC` (암호화된 ID - 사용자 입력 ID, 카카오 ID, 네이버 ID 통합 관리)
- **로그인 타입**: `SNS_TYPE` 컬럼에 따라 구분
    - `NONE`: 사용자 직접 입력 ID와 비밀번호를 통한 일반 로그인
    - `KAKAO`: 카카오 계정을 이용한 간편 로그인
    - `NAVER`: 네이버 계정을 이용한 간편 로그인

## 3. 백엔드 로그인 로직 (server.js)

`SNS_TYPE`에 따라 다음과 같은 인증 절차를 수행합니다.

### A. 일반 로그인 (SNS_TYPE: 'NONE')
1. 클라이언트로부터 `userId`와 `password`를 수신합니다.
2. `TB_USER` 테이블의 모든 레코드를 순회하며 `USER_ID_ENC`를 복호화하여 입력받은 `userId`와 일치하는 사용자를 찾습니다.
3. 사용자가 존재할 경우, 저장된 `PASSWORD` 해시와 입력받은 `password`를 `bcrypt.compare`로 검증합니다.

### B. 간편 로그인 (SNS_TYPE: 'KAKAO' / 'NAVER')
1. SNS 인증 성공 후 전달받은 고유 식별자(SNS ID)를 `userId`로 수신합니다.
2. `USER_ID_ENC` 복호화 비교를 통해 해당 SNS ID로 가입된 사용자를 찾습니다.
3. SNS 로그인의 경우 별도의 비밀번호 검증 없이 사용자 정보를 반환하여 로그인을 완료합니다.

## 4. 응답 데이터
로그인 성공 시 다음 정보를 프론트엔드로 반환합니다.
- `USER_UUID`: 사용자 고유 식별자
- `USER_NM`: 사용자 성명 (복호화됨)
- `USER_TYPE`: 회원 구분 (TRAVELER, DRIVER, PARTNER)
- `HP_NO`: 전화번호 (복호화됨)
