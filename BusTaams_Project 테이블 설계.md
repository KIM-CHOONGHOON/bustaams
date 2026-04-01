# BusTaams 프로젝트 테이블 설계 (MySQL)

본 문서는 `bustaams` 프로젝트의 데이터베이스 스키마 및 관련 연동 구조를 정의합니다. 모든 PK는 UUID(Binary 16)를 사용하며, 민감 정보는 양방향 암호화하여 저장합니다.

---

## 1. 공통 파일 마스터 관리 (GCS 연동)
**테이블명:** `TB_FILE_MASTER`  
*파일 및 이미지 리소스를 구글 클라우드 스토리지(GCS)와 연동하여 관리하는 마스터 테이블입니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **FILE_UUID** | BINARY(16) | NOT NULL, PK | 파일 고유 식별자 (UUID) |
| **FILE_CATEGORY** | ENUM | NOT NULL | 파일 분류 ('SIGNATURE', 'LICENSE', 'BUS_PHOTO', 'DOCS') |
| **GCS_BUCKET_NM** | VARCHAR(100) | DEFAULT 'bustaams-secure-data' | GCS 버킷명 |
| **GCS_PATH** | VARCHAR(255) | NOT NULL | GCS 내 물리적 경로 |
| **ORG_FILE_NM** | VARCHAR(255) | - | 원본 파일명 |
| **FILE_EXT** | CHAR(5) | DEFAULT 'png' | 파일 확장자 |
| **FILE_SIZE** | BIGINT | - | 파일 크기 (Byte) |
| **REG_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 업로드 일시 |

---

## 2. 통합 회원 및 개인정보 관리
**테이블명:** `TB_USER`  
*회원 기본 정보 및 개인정보 암호화 저장을 관리하는 핵심 테이블입니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **USER_UUID** | BINARY(16) | NOT NULL, PK | 시스템 관리용 고유 식별자 (UUID) |
| **USER_ID_ENC** | VARCHAR(255) | NOT NULL, UNIQUE | 사용자 입력 ID / SNS ID (양방향 암호화) |
| **SNS_TYPE** | ENUM | DEFAULT 'NONE' | 간편로그인 타입 ('NONE', 'KAKAO', 'NAVER') |
| **USER_TYPE** | ENUM | NOT NULL | 회원구분 ('TRAVELER', 'DRIVER', 'PARTNER') |
| **PASSWORD** | VARCHAR(255) | NOT NULL | 비밀번호 (단방향 암호화) |
| **USER_NM** | VARCHAR(255) | NOT NULL | 회원성명 (양방향 암호화) |
| **HP_NO** | VARCHAR(255) | NOT NULL | 전화번호 (양방향 암호화) |
| **EMAIL_ENC** | VARCHAR(255) | - | 이메일 주소 (양방향 암호화) |
| **SMS_AUTH_YN** | ENUM | DEFAULT 'N' | SMS 문자 인증 여부 ('Y', 'N') |
| **RECOM_CODE** | BINARY(16) | - | 추천인 코드 (영업파트너의 USER_UUID) |
| **JOIN_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 가입 일시 |
| **USER_STAT** | ENUM | DEFAULT 'ACTIVE' | 상태 ('ACTIVE', 'LEAVE', 'BANNED') |

---

## 3. 약관 및 이력 관리 (추가 설계)
*회원 가입 및 서비스 이용에 필요한 약관과 동의 이력을 관리합니다.*

### 3-1. 약관 마스터 (`TB_TERMS_MASTER`)
| 컬럼명 | 데이터 타입 | 설명 |
| :--- | :--- | :--- |
| **TERMS_ID** | INT | AUTO_INCREMENT, PK |
| **TERMS_TYPE** | VARCHAR(20) | 약관 종류 (SVC, PRIVACY, LOCATION, MKT, DRIVER) |
| **TERMS_VERSION** | VARCHAR(10) | 약관 버전 (예: v1.0, v2.1) |
| **REQUIRE_YN** | CHAR(1) | 필수 동의 여부 (Y/N) |
| **CONTENT_URL** | VARCHAR(500) | GCS 내 약관 전문(PDF/MD) 물리 파일 경로 |
| **ENFORCE_DT** | DATE | 해당 버전 약관의 실제 시행 일자 |
| **REG_DT** | DATETIME | 약관 등록 일시 |

### 3-2. 회원 약관 동의 이력 (`TB_USER_TERMS_HIST`)
| 컬럼명 | 데이터 타입 | 설명 |
| :--- | :--- | :--- |
| **HIST_ID** | BIGINT | AUTO_INCREMENT, PK |
| **USER_UUID** | BINARY(16) | 동의한 회원 식별자 (TB_USER.USER_UUID 참조) |
| **TERMS_ID** | INT | 동의한 약관 ID (TB_TERMS_MASTER.TERMS_ID 참조) |
| **SIGN_FILE_UUID** | BINARY(16) | 전자 서명 파일 식별자 (TB_FILE_MASTER.FILE_UUID 참조) |
| **AGREE_YN** | CHAR(1) | 동의 여부 (Y/N) |
| **AGREE_DT** | DATETIME | 사용자 실제 약관 동의/거절 행위 일시 |
| **CLIENT_IP** | VARCHAR(45) | 동의 당시 접속 IP 주소 (Auditing 용도) |

---

## 4. 기사 전문 정보 관리
**테이블명:** `TB_DRIVER_INFO`  
*기사님의 면허, 자격증, 프로필 등 전문적인 정보를 관리하는 테이블입니다. 민감 정보는 양방향 암호화하여 저장합니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **USER_UUID** | BINARY(16) | NOT NULL, PK | 회원 고유 식별자 (FK: TB_USER) |
| **RRN_ENC** | VARCHAR(512) | NOT NULL | 주민등록번호 (양방향 암호화) |
| **LICENSE_TYPE** | VARCHAR(50) | - | 면허 종류 (예: 1종 대형) |
| **LICENSE_NO** | VARCHAR(100) | - | 면허 번호 |
| **LICENSE_ISSUE_DT** | DATE | - | 발급 일자 |
| **LICENSE_EXPIRY_DT** | DATE | - | 유효 기간 |
| **QUAL_CERT_NO** | VARCHAR(100) | - | 버스운전 자격번호 |
| **QUAL_CERT_FILE_UUID** | BINARY(16) | - | 자격증 사본 (FK: TB_FILE_MASTER) |
| **PROFILE_PHOTO_UUID** | BINARY(16) | - | 프로필 사진 (FK: TB_FILE_MASTER) |
| **BIO_TEXT** | TEXT | - | 자기소개 및 강점 |
| **CREATE_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록 일시 |
| **UPDATE_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 수정 일시 |

---

## 5. 차량 정보 관리 (TB_DRIVER_BUS)
**테이블명:** `TB_DRIVER_BUS`
*기사님이 등록한 차량(버스)의 상세 정보를 관리하는 테이블입니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **BUS_UUID** | BINARY(16) | NOT NULL, PK | 버스 관리 고유 식별자 |
| **USER_UUID** | BINARY(16) | NOT NULL | 소유주 기사 고유 식별자 (FK: TB_USER) |
| **VEHICLE_NO** | VARCHAR(20) | NOT NULL, UNIQUE | 차량 번호 |
| **MODEL_NM** | VARCHAR(100) | NOT NULL | 모델명 (예: 유니버스 노블 EX) |
| **MANUFACTURE_YEAR** | VARCHAR(10) | - | 제작 연도 (예: 2024년형) |
| **MILEAGE** | INT | DEFAULT 0 | 주행 거리 (km) |
| **SERVICE_CLASS** | VARCHAR(50) | NOT NULL | 서비스 등급 (PREMIUM_GOLD, PRESTIGE 등) |
| **AMENITIES** | JSON | - | 제공 편의 시설 |
| **LAST_INSPECT_DT** | DATE | - | 최근 정기 점검일 |
| **INSURANCE_EXP_DT** | DATE | - | 보험 만료 예정일 |
| **BIZ_REG_FILE_UUID** | BINARY(16) | - | 사업자 등록증 파일 (FK: TB_FILE_MASTER) |
| **TRANS_LIC_FILE_UUID** | BINARY(16) | - | 운송사업 허가증 파일 |
| **INS_CERT_FILE_UUID** | BINARY(16) | - | 보험증권 파일 |
| **REG_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록 일시 |

---

## 6. 견적 요청 관리 (TB_BUS_REQUEST)
**테이블명:** `TB_BUS_REQUEST`
*고객(Traveler)이 등록한 버스 대절 예약/견적 요청 정보를 관리하는 테이블입니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **REQUEST_UUID** | BINARY(16) | NOT NULL, PK | 견적 요청 고유 식별자 |
| **TRAVELER_UUID**| BINARY(16) | NOT NULL | 요청 고객 고유 식별자 (FK: TB_USER) |
| **DEPARTURE_LOC**| VARCHAR(255) | NOT NULL | 출발지 |
| **DESTINATION_LOC**| VARCHAR(255) | NOT NULL | 목적지 |
| **PASSENGER_CNT**| INT | NOT NULL | 탑승 인원 수 |
| **SERVICE_TYPE** | VARCHAR(50) | - | 요청 버스 타입 (예: 45인승 대형) |
| **REQUEST_STATUS**| VARCHAR(20) | DEFAULT 'OPEN' | 상태 (OPEN, CLOSED, CANCELED) |
| **CREATE_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 요청 등록 일시 |

---

## 7. 입찰/견적 관리 (TB_BID)
**테이블명:** `TB_BID`
*특정 견적 요청에 대해 기사님(Driver)이 제출한 입찰(견적) 내역을 관리하는 테이블입니다.*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| **BID_UUID** | BINARY(16) | NOT NULL, PK | 입찰 내역 고유 식별자 |
| **REQUEST_UUID** | BINARY(16) | NOT NULL | 대상 견적 요청 고유 식별자 (FK: TB_BUS_REQUEST) |
| **DRIVER_UUID** | BINARY(16) | NOT NULL | 투찰한 기사 고유 식별자 (FK: TB_USER) |
| **BUS_UUID** | BINARY(16) | - | 투찰에 사용하는 버스 식별자 (FK: TB_DRIVER_BUS) |
| **BID_AMT** | DECIMAL(15,2)| NOT NULL | 제출 견적가 (금액) |
| **BID_STATUS** | VARCHAR(20) | DEFAULT 'ACTIVE' | 입찰 상태 (ACTIVE, ACCEPTED, REJECTED) |
| **CREATE_DT** | DATETIME | DEFAULT CURRENT_TIMESTAMP | 입찰 제출 일시 |
