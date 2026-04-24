# BusTaams 전체 테이블 생성 쿼리 (MySQL)

> **운영 DB:** `CUST_ID` 열을 생성·`bustaams` 스키마 **전 테이블에 반영**한 경우(사용자 작업), **스키마의 진짜 기준**은 **운영 `SHOW CREATE TABLE` / 실제 마이그레이션**입니다.  
> **채팅(§3):** **`TB_CHAT_LOG`·`TB_CHAT_LOG_PART`·`TB_CHAT_LOG_HIST` — 1(방) : N(참가) : (메시지 HIST).**  
> - **`TB_CHAT_LOG`:** 스키마 **개편** — PK **`CHAT_SEQ`** `INT` `AUTO_INCREMENT` (구 `CHAT_ID` 명칭).  
> - **`TB_CHAT_LOG_PART`:** **신규** — 복합 PK (`CHAT_SEQ`,`CUST_ID`), 방·참가자 1:N.  
> - **`TB_CHAT_LOG_HIST`:** **신규(메시지)** — PK **`HIST_SEQ`** `INT` `AUTO_INCREMENT` (구 `HIST_ID`·varchar 가정과 구분).  
> - 공통: `CHAT_TITLE`·`CHAT_COVER_FILE_ID`·`ROOM_KIND`(·`OTHER`) 등. **`BUSTAAMS_테이블 생성 쿼리 전체.md`와 본 §3 `CREATE`는 동일 정본**이다. 옛 **단일** `TB_CHAT_LOG`(`CHAT_LOG_ID`+메시지 혼재)는 **쓰지 않는다**(`실시간채팅_버스기사 화면.md` §4).  
> **본 파일과의 정합:** §1~§2·일부 ID는 `CUST_ID` 중심으로 이미 맞춰 있으나, **§3·§4에 남은 `CREATE` 블록**은 `BUSTAAMS_테이블 생성 쿼리 전체.md` **옛 내보내이**(`USER_ID`(255) FK, `DRIVER_ID`(255) 등)를 그대로 둔 구간이 있을 수 있다(아래 **§0-2**). 문서는 운영과 diff 후 **이 블록들을 `CUST_ID` 기준으로 재편집**하는 것이 좋다.  
> **스키마·DDL 원본(편집 이력):** `bustaams` — `busTaams_web/BUSTAAMS_테이블 생성 쿼리 전체.md` 편집본 + 본문 보강. (중복 `TB_SUBSCRIPTION` 은 한 번만 수록.)  
> **통합 목표 정책:** `SERVER 환경.md` (`CUST_ID`, `USER_ID` varchar(256), 로그인·`server.js` 정합) 및 §0.  
> **참고:** BUSTAAMS 구버전 `TB_USER`(`USER_ID` PK)는 **§4**, 앱·권장은 §1 `CUST_ID` 정의.

---

## 0. 식별자 정책 요약

| 컬럼 | 규격 | 설명 |
|------|------|------|
| **`CUST_ID`** | `VARCHAR(10)` PK (`TB_USER`) | 신규 회원 시 **0패딩 순번** (`0000000001` …). 타 테이블 `TRAVELER_ID` 등 **저장 값은 `CUST_ID`와 동일** (마이그레이션·의미: `SERVER 환경.md`). |
| **`USER_ID`** | `VARCHAR(256)` UK | 로그인·SNS 정합. |

**신규 ID — 0패딩 순번 (DDL 컬럼 길이에 맞출 것)**  
아래 길이는 **본 문서 `CREATE TABLE` 정의** 기준이며, **운영 DB 컬럼 길이가 다르며 표·채번 로직을 함께 수정**한다.

| 테이블 | 식별자 컬럼 | 컬럼 길이 (DDL) | 신규 값 |
|--------|-------------|-----------------|---------|
| `TB_AUCTION_REQ` | `REQ_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_AUCTION_REQ_BUS` | `REQ_BUS_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_AUCTION_REQ_VIA` | `VIA_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_BUS_DRIVER_VEHICLE` | `BUS_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_BUS_DRIVER_VEHICLE_FILE_HIST` | `HIST_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_BUS_DRIVER_VEHICLE_FILE_HIST` | `FILE_ID` | `VARCHAR(20)` | **0패딩 순번** (`20`자리·왼쪽 0, 예: `00000000000000000001`) |
| `TB_BUS_RESERVATION` | `RES_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |
| `TB_CHAT_LOG` | `CHAT_SEQ` | `INT` | **`AUTO_INCREMENT`** (0패딩 아님) |
| `TB_CHAT_LOG_HIST` | `HIST_SEQ` | `INT` | **`AUTO_INCREMENT`** (메시지 일련) |
| `TB_DRIVER_DOCS` | `CUST_ID` (FK, `TB_USER`) | `VARCHAR(10)` | 기사 = `TB_USER.CUST_ID` |
| `TB_DRIVER_DOCS` | `FILE_ID` (FK, `TB_FILE_MASTER`) | `VARCHAR(20)` | **0패딩 순번** (`20`자리, `TB_FILE_MASTER`와 동일 규칙) |
| `TB_FILE_MASTER` | `FILE_ID` | `VARCHAR(20)` | **0패딩 순번** (예: `00000000000000000001`) |
| `TB_PAYMENT_CARD` | `CARD_ID` | `VARCHAR(10)` | **0패딩 순번** (예: `0000000001` …) |

**FK:** 운영에서 `CUST_ID` 를 일원화했다면, 자식 테이블의 회원 키·FK 는 **`REFERENCES TB_USER (CUST_ID)`** · 컬럼명도 `CUST_ID` / `DRIVER_ID`(값=CUST_ID) 등으로 맞는 것이 목표. **이 문서 §3** 에 아직 `REFERENCES … (USER_ID)` 가 보이면 **옛 편집본** — 운영과 맞게 갱신할 것.

---

## 0-2. `CUST_ID` 운영 반영 vs 본 문서 `CREATE` (확인용)

아래는 **지금 이 파일(§3)에 남아 있는 예전 내보내이 패턴**을 기준으로 한 **점검표**이다. 운영이 이미 `CUST_ID`/`varchar(10)`/FK `TB_USER(CUST_ID)` 로 바뀌었다면, **해당 `CREATE` 블록을 운영 DDL로 덮어쓰면** 문서가 일치한다.

| 테이블(§3) | 이 문서에 아직 남는(또는 주의) 패턴 | 운영 `CUST_ID` 일원화 시 기대 |
|------------|-----------------------------------|--------------------------------|
| `TB_SUBSCRIPTION` | `DRIVER_ID` varchar(255), FK → `TB_USER(USER_ID)` | `DRIVER_ID` varchar(10) = `CUST_ID`, FK → `TB_USER(CUST_ID)` |
| `TB_BUS_DRIVER_VEHICLE` | `USER_ID` varchar(255) 기사 키 | `CUST_ID` 또는 `DRIVER_CUST_ID` 등 **10자** + FK `TB_USER(CUST_ID)` (컬럼명은 팀 스키마 따름) |
| `TB_BUS_RESERVATION` | 주석 `TB_USER.USER_ID` | 값·주석 **CUST_ID** |
| `TB_CHAT_LOG` + `TB_CHAT_LOG_PART` + `TB_CHAT_LOG_HIST` | (구) `CHAT_LOG_ID` 단일 로그, 또는 `CHAT_ID`/`HIST_ID`(varchar) 명칭 | **1(방) : N(참가) : 메시지** — `TB_CHAT_LOG` PK **`CHAT_SEQ`** `INT` + **`TB_CHAT_LOG_PART`**(신규) + **`TB_CHAT_LOG_HIST`** PK **`HIST_SEQ`** `INT` (§3·BUSTAAMS DDL). 값 **CUST_ID** 기반 |
| `TB_DRIVER_DETAIL` | `USER_ID` 255, FK `TB_USER(USER_ID)` | 기사 식별 **CUST_ID(10)**, FK `TB_USER(CUST_ID)` |
| `TB_DRIVER_DOCS` | — | **§3 CREATE 반영:** `CUST_ID` varchar(10), PK·FK `TB_USER(CUST_ID)` — 아래 `TB_DRIVER_DOCS` 블록 |
| `TB_INQUIRY` / `TB_PAYMENT_CARD` | `USER_ID` 255, FK `USER_ID` | `CUST_ID` + FK `TB_USER(CUST_ID)` |
| `TB_USER_CANCEL_HIST` / `TB_USER_CANCEL_MANAGE` | 키 `USER_ID` 255 | PK/ FK **`CUST_ID` varchar(10)** (SERVER 환경.md 로그인 페이로드 정책과 동일) |
| `TB_USER_TERMS_HIST` | `USER_ID` 255 | `CUST_ID` (또는 `USER_ID` 유지 + 별도 `CUST_ID` — **운영 스키마** 따름) |
| `TB_USER_DEVICE_TOKEN` | `USER_UUID` binary(16) | 운영이 `CUST_ID` 만 쓰도록 바꿨다면 **문서·코드** 동시 갱신 (`SERVER 환경.md` — UUID 비사용 정책) |

- **이미 맞는 편(문서):** §1 `TB_USER` PK `CUST_ID`, §2 `TB_AUCTION_REQ` · `TRAVELER_ID` → `CUST_ID` FK.  
- **§4** 구 `TB_USER`(USER_ID PK)는 **역사 참고** — 운영이 전환 완료면 **삭제·축소**해도 된다.

---

## 0-1. `bustaams` 스키마 테이블 (내보내기 22 + 통합 2 + 참고 1)

| 구분 | 테이블 |
|------|--------|
| 통합(본 문서 §1~2) | `TB_USER` (`CUST_ID`), `TB_AUCTION_REQ` (마스터, 내보내기에 없음) |
| 내보내기 §3 (22개) | `TB_SUBSCRIPTION`, `TB_AUCTION_REQ_BUS`, `TB_AUCTION_REQ_VIA`, `TB_BUS_DRIVER_VEHICLE`, `TB_BUS_DRIVER_VEHICLE_FILE_HIST`, `TB_BUS_RESERVATION`, `TB_CHAT_LOG`, `TB_CHAT_LOG_PART`, `TB_CHAT_LOG_HIST`, `TB_COMMON_CODE`, `TB_DRIVER_DETAIL`, `TB_DRIVER_DOCS`, `TB_FILE_MASTER`, `TB_INQUIRY`, `TB_PAYMENT_CARD`, `TB_SMS_LOG`, `TB_TERMS_MASTER`, `TB_TRIP_REVIEW`, `TB_USER_CANCEL_HIST`, `TB_USER_CANCEL_MANAGE`, `TB_USER_DEVICE_TOKEN`, `TB_USER_TERMS_HIST` |
| 참고 §4 | BUSTAAMS에 포함되던 `TB_USER`(`USER_ID` PK) |

---

## 1. `TB_USER` (권장: `CUST_ID` + `USER_ID(256)`) — 앱/통합 기준

```sql
CREATE TABLE `TB_USER` (
  `CUST_ID` varchar(10) NOT NULL COMMENT '회원 내부 식별자(신규 가입 시 0패딩 순번, 예: 0000000001)',
  `USER_ID` varchar(256) NOT NULL COMMENT '로그인 ID 또는 카카오·네이버 연동 식별 조합 — SNS 정합 검증용',
  `EMAIL` varchar(100) DEFAULT NULL,
  `SNS_TYPE` enum('NONE','KAKAO','NAVER') DEFAULT 'NONE' COMMENT '간편로그인 타입',
  `USER_TYPE` enum('TRAVELER','DRIVER','PARTNER','ADMIN') NOT NULL COMMENT '회원구분 — 로그인 후 MainDashBoard 분기(관리자는 ADMIN 또는 별도 롤 테이블)',
  `PASSWORD` varchar(255) NOT NULL COMMENT '비밀번호 (단방향 암호화)',
  `USER_NM` varchar(255) DEFAULT NULL,
  `RESIDENT_NO_ENC` varchar(255) DEFAULT NULL COMMENT '주민등록번호 (양방향 암호화) - 기사 등록용',
  `HP_NO` varchar(255) DEFAULT NULL,
  `PROFILE_IMG_PATH` varchar(512) DEFAULT NULL,
  `PROFILE_FILE_ID` varchar(20) DEFAULT NULL COMMENT '프로필 사진 FILE_ID (TB_FILE_MASTER)',
  `SMS_AUTH_YN` enum('Y','N') DEFAULT 'N' COMMENT 'SMS 문자 인증 여부',
  `RECOM_CODE` varchar(20) DEFAULT NULL COMMENT '추천인 코드 (영업파트너의 CUST_ID 또는 별도 코드)',
  `JOIN_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  `USER_STAT` enum('ACTIVE','LEAVE','BANNED','TEMPORARY') DEFAULT 'ACTIVE' COMMENT '상태',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`CUST_ID`),
  UNIQUE KEY `UK_USER_LOGIN_ID` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='통합 회원 및 개인정보 관리';
```

---

## 2. `TB_AUCTION_REQ` (마스터) — BUSTAAMS 내보내기에 본문 없음, `TRAVELER_ID` = `TB_USER.CUST_ID`

**신규 ID — `REQ_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
CREATE TABLE `TB_AUCTION_REQ` (
  `REQ_ID` varchar(10) NOT NULL COMMENT '견적 요청 마스터 키',
  `TRAVELER_ID` varchar(10) NOT NULL COMMENT '여행자 TB_USER.CUST_ID',
  `TRIP_TITLE` varchar(255) DEFAULT NULL COMMENT '여정 제목',
  `START_ADDR` varchar(255) NOT NULL COMMENT '출발지 주소',
  `END_ADDR` varchar(255) NOT NULL COMMENT '목적지 주소',
  `START_DT` datetime NOT NULL COMMENT '출발 일시',
  `END_DT` datetime NOT NULL COMMENT '도착 일시',
  `PASSENGER_CNT` int NOT NULL COMMENT '탑승 인원',
  `REQ_AMT` decimal(13,0) NOT NULL DEFAULT '0' COMMENT '요청 금액(원)',
  `DATA_STAT` enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') DEFAULT 'AUCTION' COMMENT '마스터 상태',
  `EXPIRE_DT` datetime NOT NULL COMMENT '입찰 마감 예정 일시',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`REQ_ID`),
  KEY `IDX_TRAVELER_ID` (`TRAVELER_ID`),
  CONSTRAINT `FK_AUCTION_REQ_TRAVELER` FOREIGN KEY (`TRAVELER_ID`) REFERENCES `TB_USER` (`CUST_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='견적 요청 기본 정보 (Master)';
```

---

## 3. `bustaams` — BUSTAAMS 파일 DDL (20테이블)

`TB_AUCTION_REQ` / §1 `TB_USER` 는 위와 중복되지 않습니다.


### `TB_SUBSCRIPTION`

```sql
-- bustaams.TB_SUBSCRIPTION definition

CREATE TABLE `TB_SUBSCRIPTION` (
  `DRIVER_ID` varchar(10) NOT NULL COMMENT '버스기사 TB_USER.CUST_ID',
  `YYYYMM` varchar(6) NOT NULL COMMENT '월구독년월(YYYYMM)',
  `FEE_POLICY` enum('DRIVER_GENERAL','DRIVER_MIDDLE','DRIVER_HIGH') NOT NULL COMMENT '요금 정책',
  `BASIC_CNT` int NOT NULL DEFAULT '0' COMMENT '월 응찰 가능 건수',
  `USE_CNT` int NOT NULL DEFAULT '0' COMMENT '월 응찰 건수',
  `REMAINING_CNT` int NOT NULL DEFAULT '0' COMMENT '응찰 가능 잔여 건수',
  `REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`DRIVER_ID`,`YYYYMM`),
  KEY `IDX_SUB_YYYYMM` (`YYYYMM`),
  CONSTRAINT `FK_SUB_USER` FOREIGN KEY (`DRIVER_ID`) REFERENCES `TB_USER` (`CUST_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='버스기사 월별 응찰 관리';
```

### `TB_AUCTION_REQ_BUS`

**`TB_AUCTION_REQ_BUS` — 신규 ID `REQ_BUS_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
-- bustaams.TB_AUCTION_REQ_BUS definition

CREATE TABLE `TB_AUCTION_REQ_BUS` (
  `REQ_BUS_ID` varchar(10) NOT NULL COMMENT 'TB_AUCTION_REQ_BUS 의 고유 키값',
  `REQ_ID` varchar(10) NOT NULL COMMENT '요청버스의 원 예약요청 키값',
  `BUS_TYPE_CD` varchar(30) NOT NULL COMMENT '차량 유형 (TB_COMMON_CODE 참조)',
  `DATA_STAT` enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') DEFAULT 'AUCTION' COMMENT '버스기사 입찰 현황 상태',
  `TOLLS_AMT` decimal(13,0) DEFAULT NULL COMMENT '고속도록 통행료',
  `FUEL_COST` decimal(13,0) DEFAULT NULL COMMENT '유류비',
  `RES_FEE_TOTAL_AMT` decimal(13,0) DEFAULT NULL COMMENT '예약금액 전체 6.6% 해당 금액',
  `RES_FEE_REFUND_AMT` decimal(13,0) DEFAULT NULL COMMENT '예약 환급 금액 5.5% 해당 금액',
  `RES_FEE_ATTRIBUTION_AMT` decimal(18,3) DEFAULT NULL COMMENT '예약 귀속 금액 1.1% 해당 금액',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`REQ_BUS_ID`),
  KEY `FK_REQ_BUS_MASTER` (`REQ_ID`),
  CONSTRAINT `FK_REQ_BUS_MASTER` FOREIGN KEY (`REQ_ID`) REFERENCES `TB_AUCTION_REQ` (`REQ_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='견적 요청 차량 상세 (Detail)';
```

### `TB_AUCTION_REQ_VIA`

**`TB_AUCTION_REQ_VIA` — 신규 ID `VIA_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
-- bustaams.TB_AUCTION_REQ_VIA definition

CREATE TABLE `TB_AUCTION_REQ_VIA` (
  `VIA_ID` varchar(10) NOT NULL COMMENT '경유지 고유 식별자',
  `REQ_ID` varchar(10) NOT NULL COMMENT '견적 요청 마스터 ID',
  `VIA_TYPE` enum('START_NODE','START_WAY','ROUND_TRIP','END_WAY','END_NODE') NOT NULL DEFAULT 'START_WAY' COMMENT '구분 (START_NODE:출발지, START_WAY:출발행경유, ROUND_TRIP:회차지, END_WAY:복귀행경유, END_NODE:최종도착지)',
  `VIA_ORD` int NOT NULL COMMENT '방문 순서 (자동 정렬 결과)',
  `VIA_ADDR` varchar(255) NOT NULL COMMENT '경유지 상세 주소',
  `LAT` decimal(10,8) DEFAULT NULL COMMENT '위도 (Latitude)',
  `LNG` decimal(11,8) DEFAULT NULL COMMENT '경도 (Longitude)',
  `DIST_FROM_PREV` decimal(10,2) DEFAULT '0.00' COMMENT '이전 지점으로부터의 거리 (km)',
  `TIME_FROM_PREV` int DEFAULT '0' COMMENT '이전 지점으로부터의 소요 시간 (분)',
  `STOP_TIME_MIN` int DEFAULT '0' COMMENT '정차 예정 시간(분)',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`VIA_ID`),
  KEY `FK_VIA_REQ_NEW` (`REQ_ID`),
  CONSTRAINT `FK_VIA_REQ_NEW` FOREIGN KEY (`REQ_ID`) REFERENCES `TB_AUCTION_REQ` (`REQ_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='거리 및 좌표 정보가 포함된 다중 경유지 관리';
```

### `TB_BUS_DRIVER_VEHICLE`

**`TB_BUS_DRIVER_VEHICLE` — 신규 ID `BUS_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
-- bustaams.TB_BUS_DRIVER_VEHICLE definition

CREATE TABLE `TB_BUS_DRIVER_VEHICLE` (
  `BUS_ID` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '버스 고유 ID',
  `USER_ID` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '소유 기사 (TB_USER)',
  `VEHICLE_NO` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '차량 번호',
  `MODEL_NM` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '모델명',
  `MANUFACTURE_YEAR` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '제작 연도(표시 문자열)',
  `MILEAGE` int DEFAULT '0' COMMENT '주행거리 km',
  `SERVICE_CLASS` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'TB_COMMON_CODE BUS_TYPE DTL_CD',
  `AMENITIES` json DEFAULT NULL COMMENT '편의 옵션 JSON (wifi, usb, …)',
  `HAS_ADAS` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N' COMMENT 'ADAS Y/N',
  `LAST_INSPECT_DT` date DEFAULT NULL COMMENT '최근 정기점검일',
  `INSURANCE_EXP_DT` date DEFAULT NULL COMMENT '보험 만료 예정일',
  `BIZ_REG_FILE_ID` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '사업자등록증 파일 ID',
  `TRANS_LIC_FILE_ID` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '운송허가증 파일 ID',
  `INS_CERT_FILE_ID` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '보험증명서 파일 ID',
  `VEHICLE_PHOTOS_JSON` json DEFAULT NULL COMMENT '차량 사진 FILE_ID 배열(최대 8)',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`BUS_ID`),
  UNIQUE KEY `UK_VEHICLE_NO` (`VEHICLE_NO`),
  KEY `IDX_BUS_DRIVER_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기사 보유 차량·ADAS·서류';
```

### `TB_BUS_DRIVER_VEHICLE_FILE_HIST`

**`TB_BUS_DRIVER_VEHICLE_FILE_HIST` — 신규 ID:** `HIST_ID`·`FILE_ID` 모두 **0패딩 순번** (`HIST_ID`는 예: `0000000001` …, `varchar(10)` / `FILE_ID`는 `varchar(20)` 길이에 맞게 예: `00000000000000000001`).

```sql
-- bustaams.TB_BUS_DRIVER_VEHICLE_FILE_HIST definition

CREATE TABLE `TB_BUS_DRIVER_VEHICLE_FILE_HIST` (
  `HIST_ID` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `BUS_ID` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FK TB_BUS_DRIVER_VEHICLE.BUS_ID',
  `FILE_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `FILE_CATEGORY` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`HIST_ID`),
  KEY `IDX_BUS_FILE` (`BUS_ID`,`FILE_ID`),
  KEY `IDX_FILE_ID` (`FILE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `TB_BUS_RESERVATION`

**`TB_BUS_RESERVATION` — 신규 ID `RES_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
-- bustaams.TB_BUS_RESERVATION definition

CREATE TABLE `TB_BUS_RESERVATION` (
  `RES_ID` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '예약 요청정보 키값',
  `REQ_ID` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '여행 요청정보 키값 (TB_AUCTION_REQ.REQ_ID)',
  `REQ_BUS_ID` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '요청버스 키값 (TB_AUCTION_REQ_BUS.REQ_BUS_ID)',
  `TRAVELER_ID` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '여행자 (TB_USER). REQ_ID→TB_AUCTION_REQ 조인으로도 알 수 있으나 비정규화·조회·FK용',
  `DRIVER_ID` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '해당 버스 기사 (TB_USER.USER_ID)',
  `BUS_ID` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '버스정보 키값 (TB_DRIVER_BUS.BUS_ID 등)',
  `DRIVER_BIDDING_PRICE` decimal(13,0) NOT NULL COMMENT '버스기사 입찰가격',
  `RES_FEE_TOTAL_AMT` decimal(13,0) DEFAULT NULL COMMENT '예약금액 전체 6.6% 해당 금액',
  `RES_FEE_REFUND_AMT` decimal(13,0) DEFAULT NULL COMMENT '예약 환급 금액 5.5% 해당 금액',
  `RES_FEE_ATTRIBUTION_AMT` decimal(13,0) DEFAULT NULL COMMENT '예약 귀속 금액 1.1% 해당 금액',
  `DATA_STAT` enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') COLLATE utf8mb4_unicode_ci DEFAULT 'BIDDING' COMMENT '버스기사 입찰 현황 상태',
  `CONFIRM_DT` datetime DEFAULT NULL COMMENT '예약 확정 일시',
  `REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`RES_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='버스 예약 및 매칭 확정 정보';
```

### `TB_CHAT_LOG` · `TB_CHAT_LOG_PART` · `TB_CHAT_LOG_HIST`

**역할:** **`TB_CHAT_LOG`** = 대화(방) 마스터 1행( **개편** ), **`TB_CHAT_LOG_PART`** = 그 방의 참가자( **신규**, 1:N), **`TB_CHAT_LOG_HIST`** = 메시지( **신규** 테이블, 전송 1행 1건). **구버전** 단일 `TB_CHAT_LOG`(`CHAT_LOG_ID` + 메시지 본문 동일 테이블)는 **사용하지 않는다** — `실시간채팅_버스기사 화면.md` §4와 동일.

- **`CHAT_SEQ`:** `INT AUTO_INCREMENT` (구 컬럼명 `CHAT_ID` → `CHAT_SEQ`). **`HIST_SEQ`:** `INT AUTO_INCREMENT` (구 `HIST_ID` → `HIST_SEQ`, 메시지 PK).
- **`ROOM_KIND`:** `TRAVELER` | `DRIVER` | `PARTNER` | `EMPL` | `OTHER` (맥락 분류). **`CHAT_TITLE`**, **`CHAT_COVER_FILE_ID`** — 목록/헤더 제목·썸네일(로고·사진, `TB_FILE_MASTER` 선택).
- **FK:** `REQ`·`RES`는 **둘 다 NULL**이거나 **둘 다 NOT NULL** — `CHECK` 제약(아래).

```sql
-- bustaams.TB_CHAT_LOG definition — 대화(방) 마스터

CREATE TABLE `TB_CHAT_LOG` (
  `CHAT_SEQ` int NOT NULL AUTO_INCREMENT COMMENT '대화(방) 일련 — INT, 자동채번',
  `ROOM_KIND` enum('TRAVELER','DRIVER','PARTNER','EMPL','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    COMMENT 'TRAVELER:여행자, DRIVER:버스기사, PARTNER:영업회원, EMPL:관리직원, OTHER:이외 — 방 맥락·대표 UI(참가자 상세는 TB_CHAT_LOG_PART)',
  `CHAT_TITLE` varchar(200) DEFAULT NULL COMMENT '대화(방) 제목 — 목록·헤더 표시(미입력 시 앱에서 REQ/닉 등으로 합성 가능)',
  `CHAT_COVER_FILE_ID` varchar(20) DEFAULT NULL COMMENT '대화창 썸네일·로고·사진 — TB_FILE_MASTER.FILE_ID(선택)',
  `REQ_ID` varchar(10) DEFAULT NULL COMMENT 'TB_AUCTION_REQ — 견적/예약 미연동 시 NULL',
  `RES_ID` varchar(10) DEFAULT NULL COMMENT 'TB_BUS_RESERVATION — 견적/예약 미연동 시 NULL',
  `CREATED_BY_CUST_ID` varchar(10) NOT NULL COMMENT '방 개설자 TB_USER.CUST_ID',
  `LAST_MSG_DT` datetime DEFAULT NULL,
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  `REG_ID` varchar(10) DEFAULT NULL,
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `MOD_ID` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`CHAT_SEQ`),
  UNIQUE KEY `UK_CHAT_LOG_RES` (`REQ_ID`,`RES_ID`),
  KEY `IDX_CHAT_LOG_ROOM_KIND` (`ROOM_KIND`,`REG_DT`),
  KEY `IDX_CHAT_LOG_CREATED` (`CREATED_BY_CUST_ID`,`REG_DT`),
  CONSTRAINT `CHK_CHAT_LOG_REQ_RES` CHECK (
    (`REQ_ID` IS NULL AND `RES_ID` IS NULL) OR (`REQ_ID` IS NOT NULL AND `RES_ID` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='채팅 대화(방) 마스터 — 1:N 참가는 TB_CHAT_LOG_PART';
```

```sql
-- bustaams.TB_CHAT_LOG_PART definition — 참가자(1:N)

CREATE TABLE `TB_CHAT_LOG_PART` (
  `CHAT_SEQ` int NOT NULL COMMENT 'TB_CHAT_LOG',
  `CUST_ID` varchar(10) NOT NULL COMMENT 'TB_USER.CUST_ID',
  `PART_TYPE` enum('TRAVELER','DRIVER','PARTNER','EMPL') NOT NULL
    COMMENT 'TRAVELER:여행자, DRIVER:버스기사, PARTNER:영업회원, EMPL:관리직원 — 이 방에서의 역할(표시·권한)',
  `JOINED_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '방 입장(등록) 시각',
  `INVITER_CUST_ID` varchar(10) DEFAULT NULL COMMENT '초대로 입장 시 초대한 CUST_ID',
  PRIMARY KEY (`CHAT_SEQ`,`CUST_ID`),
  KEY `IDX_PART_CUST` (`CUST_ID`,`CHAT_SEQ`),
  CONSTRAINT `FK_PART_CHAT` FOREIGN KEY (`CHAT_SEQ`) REFERENCES `TB_CHAT_LOG` (`CHAT_SEQ`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='채팅방 참가자(1:N)';
```

```sql
-- bustaams.TB_CHAT_LOG_HIST definition — 메시지

CREATE TABLE `TB_CHAT_LOG_HIST` (
  `HIST_SEQ` int NOT NULL AUTO_INCREMENT COMMENT '메시지 일련 — INT, 자동채번',
  `CHAT_SEQ` int NOT NULL,
  `SENDER_CUST_ID` varchar(10) NOT NULL,
  `SENDER_ROLE` enum('TRAVELER','DRIVER','PARTNER','EMPL','SYSTEM') NOT NULL
    COMMENT 'TRAVELER:여행자, DRIVER:버스기사, PARTNER:영업회원, EMPL:관리직원, SYSTEM:시스템',
  `MSG_KIND` varchar(20) NOT NULL DEFAULT 'TEXT',
  `MSG_BODY` text,
  `FILE_ID` varchar(20) DEFAULT NULL,
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`HIST_SEQ`),
  KEY `IDX_HIST_CHAT` (`CHAT_SEQ`,`REG_DT`),
  KEY `IDX_HIST_SENDER` (`SENDER_CUST_ID`,`REG_DT`),
  CONSTRAINT `FK_HIST_CHAT` FOREIGN KEY (`CHAT_SEQ`) REFERENCES `TB_CHAT_LOG` (`CHAT_SEQ`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 메시지';
```

### `TB_COMMON_CODE`

```sql
-- bustaams.TB_COMMON_CODE definition

CREATE TABLE `TB_COMMON_CODE` (
  `GRP_CD` varchar(30) NOT NULL COMMENT '그룹 코드 (예: USER_STAT, BUS_TYPE)',
  `DTL_CD` varchar(30) NOT NULL COMMENT '상세 코드 (예: ACTIVE, PREMIUM_28)',
  `CD_NM_KO` varchar(100) NOT NULL COMMENT '코드 한글명',
  `CD_NM_EN` varchar(100) DEFAULT NULL COMMENT '코드 영문명',
  `CD_FNUM` decimal(13,3) DEFAULT '0.000' COMMENT '코드 시작값에 해당하는 참고숫자',
  `CD_TNUM` decimal(13,3) DEFAULT '0.000' COMMENT '코드 종료값에 해당하는 참고숫자',
  `USE_YN` enum('Y','N') DEFAULT 'Y' COMMENT '사용 여부',
  `DISP_ORD` int DEFAULT '0' COMMENT '출력 순서',
  `CD_DESC` text COMMENT '코드 상세 설명',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`GRP_CD`,`DTL_CD`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='시스템 공통 코드 관리 테이블';
```

### `TB_DRIVER_DETAIL`

```sql
-- bustaams.TB_DRIVER_DETAIL definition

CREATE TABLE `TB_DRIVER_DETAIL` (
  `USER_ID` varchar(255) NOT NULL COMMENT '기사 식별자',
  `ZIPCODE` varchar(10) DEFAULT NULL COMMENT '우편번호',
  `ADDRESS` varchar(255) DEFAULT NULL COMMENT '기본 주소',
  `DETAIL_ADDRESS` varchar(255) DEFAULT NULL COMMENT '상세 주소',
  `FEE_POLICY` varchar(30) DEFAULT NULL COMMENT '기사회원등급코드',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  `REG_ID` varchar(30) DEFAULT NULL,
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  `MOD_ID` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`USER_ID`),
  CONSTRAINT `FK_DETAIL_USER` FOREIGN KEY (`USER_ID`) REFERENCES `TB_USER` (`USER_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='기사 상세 인적 사항 및 주소 정보';
```

### `TB_DRIVER_DOCS`

- **기사 키:** `CUST_ID` varchar(10) = `TB_USER.CUST_ID` (§1 `TB_USER` PK와 동일 정책). 구 `USER_ID`(255) PK 일부는 **이관 시 컬럼·FK 교체**를 전제로 한다.
- **`DOC_TYPE`:** `ENUM` 리터럴은 **`TB_COMMON_CODE` `GRP_CD='DOC_TYPE'`** 의 `DTL_CD`와 **동일**하게 둔다(코드명·한글명·정렬: `busTaams_server/sql/tb_common_code_doc_type.sql` 시드 참고). 컬럼 `COMMENT`에 값별 의미를 병기.
- **`FILE_ID`:** `TB_FILE_MASTER` FK — 값은 **0패딩 순번** `varchar(20)` (예: `00000000000000000001`).

```sql
-- bustaams.TB_DRIVER_DOCS definition

CREATE TABLE `TB_DRIVER_DOCS` (
  `CUST_ID` varchar(10) NOT NULL COMMENT '기사 TB_USER.CUST_ID',
  `DOC_TYPE` enum('LICENSE','QUALIFICATION','APTITUDE','BIZ_REG','TRANSPORT_PERMIT','INSURANCE') NOT NULL COMMENT '서류 구분 — TB_COMMON_CODE(GRP_CD=DOC_TYPE)의 DTL_CD와 동일. LICENSE:운전면허증, QUALIFICATION:버스운전자격증, APTITUDE:운전적성정밀검사, BIZ_REG:사업자등록증, TRANSPORT_PERMIT:여객자동차운송사업허가증, INSURANCE:보험가입증명서',
  `FILE_ID` varchar(20) DEFAULT NULL COMMENT '첨부 파일 TB_FILE_MASTER.FILE_ID (0패딩 순번)',
  `FILE_PATH` varchar(512) DEFAULT NULL COMMENT '레거시/직접 경로 URL (선택, FILE_ID 우선)',
  `LICENSE_TYPE_CD` varchar(30) DEFAULT NULL COMMENT '면허 종류 코드 (TB_COMMON_CODE 등, DOC_TYPE=LICENSE일 때)',
  `DOC_NO_ENC` varchar(255) DEFAULT NULL COMMENT '면허·자격 등 문서 번호 (양방향 암호화)',
  `ISSUE_DT` date DEFAULT NULL COMMENT '발급 일자',
  `EXP_DT` date DEFAULT NULL COMMENT '만료일',
  `INFO_STAT_CD` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '유효·자격 유지 상세 코드',
  `APPROVE_STAT` enum('WAIT','APPROVE','REJECT') DEFAULT 'WAIT' COMMENT '본사 승인 상태',
  `REJECT_REASON` text COMMENT '반려 사유',
  `APPROVER_ID` varchar(10) DEFAULT NULL COMMENT '본사 승인자 TB_USER.CUST_ID(선택)',
  `APPROVE_DT` datetime DEFAULT NULL COMMENT '본사 최종 승인 일시',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`CUST_ID`,`DOC_TYPE`),
  KEY `FK_DOCS_FILE` (`FILE_ID`),
  CONSTRAINT `FK_DOCS_FILE` FOREIGN KEY (`FILE_ID`) REFERENCES `TB_FILE_MASTER` (`FILE_ID`),
  CONSTRAINT `FK_DOCS_USER` FOREIGN KEY (`CUST_ID`) REFERENCES `TB_USER` (`CUST_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='기사 자격 증빙 및 본사 심사 이력';
```

### `TB_FILE_MASTER`

**`TB_FILE_MASTER` — 신규 ID `FILE_ID`:** **0패딩 순번** (`varchar(20)` 길이에 맞게 예: `00000000000000000001`).

```sql
-- bustaams.TB_FILE_MASTER definition

CREATE TABLE `TB_FILE_MASTER` (
  `FILE_ID` varchar(20) NOT NULL COMMENT '파일 고유 식별자 (ID)',
  `FILE_CATEGORY` varchar(50) NOT NULL COMMENT '파일 분류 코드',
  `GCS_BUCKET_NM` varchar(100) DEFAULT 'bustaams-secure-data' COMMENT 'GCS 버킷명',
  `GCS_PATH` varchar(255) NOT NULL COMMENT 'GCS 내 물리적 경로',
  `ORG_FILE_NM` varchar(255) DEFAULT NULL COMMENT '원본 파일명',
  `FILE_EXT` char(5) DEFAULT 'png' COMMENT '파일 확장자',
  `FILE_SIZE` bigint DEFAULT NULL COMMENT '파일 크기 (Byte)',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`FILE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 파일 마스터 테이블';
```

### `TB_INQUIRY`

```sql
-- bustaams.TB_INQUIRY definition

CREATE TABLE `TB_INQUIRY` (
  `INQ_ID` int NOT NULL AUTO_INCREMENT,
  `USER_ID` varchar(255) NOT NULL,
  `INQ_CATEGORY` enum('BID_RES','PAY_REFUND','CANCEL_RULE','BUS_STAT','SUGGESTION') NOT NULL,
  `TITLE` varchar(255) NOT NULL,
  `CONTENT` text NOT NULL,
  `ATTACH_FILE_ID` varchar(20) DEFAULT NULL,
  `REPLY_CONTENT` text,
  `REPLY_DT` datetime DEFAULT NULL,
  `INQ_STAT` enum('WAITING','COMPLETED') DEFAULT 'WAITING',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`INQ_ID`),
  KEY `FK_INQ_USER` (`USER_ID`),
  KEY `FK_INQ_FILE` (`ATTACH_FILE_ID`),
  CONSTRAINT `FK_INQ_FILE` FOREIGN KEY (`ATTACH_FILE_ID`) REFERENCES `TB_FILE_MASTER` (`FILE_ID`),
  CONSTRAINT `FK_INQ_USER` FOREIGN KEY (`USER_ID`) REFERENCES `TB_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='1:1 고객 문의 게시판';
```

### `TB_PAYMENT_CARD`

**`TB_PAYMENT_CARD` — 신규 ID `CARD_ID`:** **0패딩 순번** (예: `0000000001` …, `varchar(10)`).

```sql
-- bustaams.TB_PAYMENT_CARD definition

CREATE TABLE `TB_PAYMENT_CARD` (
  `CARD_ID` varchar(10) NOT NULL,
  `USER_ID` varchar(255) NOT NULL,
  `CARD_NICKNAME` varchar(50) DEFAULT NULL,
  `CARD_NO_ENC` varchar(255) NOT NULL,
  `EXP_MONTH` char(2) NOT NULL,
  `EXP_YEAR` char(2) NOT NULL,
  `IS_PRIMARY` enum('Y','N') DEFAULT 'N',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`CARD_ID`),
  KEY `FK_CARD_USER` (`USER_ID`),
  CONSTRAINT `FK_CARD_USER` FOREIGN KEY (`USER_ID`) REFERENCES `TB_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='등록된 신용/체크카드 결제 수단';
```

### `TB_SMS_LOG`

**`TB_SMS_LOG` — 신규 ID `LOG_ID`:** `varchar(16)` 컬럼에 맞는 **0패딩 순번** (앱·운영 정책에 따름).

```sql
-- bustaams.TB_SMS_LOG definition

CREATE TABLE `TB_SMS_LOG` (
  `LOG_ID` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '발송 이력 고유 키',
  `REQ_ID` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '연관된 경매 요청 ID',
  `SEND_CATEGORY` enum('REQ_REG','NEW_BID','CONFIRM','REQ_CANCEL','RES_CANCEL','ETC') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ETC' COMMENT '발송 상황 (REQ_REG:등록, NEW_BID:견적도착, CONFIRM:확정, REQ_CANCEL:요청취소, RES_CANCEL:예약취소)',
  `SENDER_ID` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '발송 주체 ID (시스템이면 NULL)',
  `RECEIVER_ID` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '수신 대상 ID',
  `RECEIVER_PHONE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '수신 휴대폰 번호',
  `MSG_CONTENT` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '메시지 본문',
  `MSG_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SMS' COMMENT '메시지 구분 (SMS, LMS, ALIM_TALK)',
  `SEND_STAT` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT '발송 상태 (SUCCESS, FAIL, PENDING)',
  `ERROR_MSG` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '에러 메시지',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LOG_ID`),
  KEY `IDX_SMS_LOG_CATEGORY` (`SEND_CATEGORY`,`REG_DT`),
  KEY `IDX_SMS_LOG_RECEIVER` (`RECEIVER_ID`,`REG_DT`),
  KEY `IDX_SMS_LOG_REQ` (`REQ_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='문자 및 알림톡 발송 이력 관리';
```

### `TB_TERMS_MASTER`

```sql
-- bustaams.TB_TERMS_MASTER definition

CREATE TABLE `TB_TERMS_MASTER` (
  `TERMS_ID` int NOT NULL AUTO_INCREMENT COMMENT '약관 고유 식별자',
  `TERMS_TYPE` varchar(20) NOT NULL COMMENT '약관 종류 (SVC, PRIVACY, LOCATION, MKT, DRIVER)',
  `TERMS_VERSION` varchar(10) NOT NULL COMMENT '약관 버전 (예: v1.0, v2.1)',
  `REQUIRE_YN` char(1) DEFAULT 'Y' COMMENT '필수 동의 여부 (Y/N)',
  `CONTENT_URL` varchar(500) DEFAULT NULL COMMENT 'GCS에 저장된 약관 전문(PDF/MD) 물리 파일 접근 경로 URL',
  `ENFORCE_DT` date NOT NULL COMMENT '해당 버전 약관의 실제 시행 일자',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '약관 등록 일시',
  PRIMARY KEY (`TERMS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='서비스 공통 약관 마스터 테이블';
```

### `TB_TRIP_REVIEW`

```sql
-- bustaams.TB_TRIP_REVIEW definition

CREATE TABLE `TB_TRIP_REVIEW` (
  `REVIEW_ID` int NOT NULL AUTO_INCREMENT,
  `RES_ID` varchar(10) NOT NULL,
  `WRITER_ID` varchar(10) NOT NULL,
  `STAR_RATING` tinyint DEFAULT '5',
  `COMMENT_TEXT` text,
  `REPLY_TEXT` text COMMENT '기사 답글',
  `REPLY_DT` datetime DEFAULT NULL COMMENT '답글 일시',
  `REG_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `REG_ID` varchar(30) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`REVIEW_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='서비스 만족도 리뷰 관리';
```

### `TB_USER_CANCEL_HIST`

```sql
-- bustaams.TB_USER_CANCEL_HIST definition

CREATE TABLE `TB_USER_CANCEL_HIST` (
  `USER_ID` varchar(255) NOT NULL COMMENT '대상 고객 TB_USER.USER_ID',
  `HIST_SEQ` int NOT NULL COMMENT '이력 순번 (ID)',
  `USER_TYPE` enum('TRAVELER','DRIVER','SALES') NOT NULL COMMENT '고객 구분 — TB_USER_CANCEL_MANAGE 와 동일',
  `CANCEL_REASON_GRP_CD` varchar(50) NOT NULL DEFAULT 'CANCEL_REASON' COMMENT '취소사유 공통그룹코드 → TB_COMMON_CODE.GRP_CD',
  `CANCEL_REASON_DTL_CD` varchar(50) NOT NULL COMMENT '취소사유 상세코드 → TB_COMMON_CODE.DTL_CD',
  `CANCEL_REASON_TEXT` text COMMENT '취소사유 상세 내용',
  `REASON_DOC_FILE_NM` varchar(500) DEFAULT NULL COMMENT '취소사유 증빙 제출 서류 파일명',
  `REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '이력 등록 일시',
  `REG_ID` varchar(50) DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '이력 수정 일시',
  `MOD_ID` varchar(50) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`USER_ID`,`HIST_SEQ`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='취소 이력(상세)';
```

### `TB_USER_CANCEL_MANAGE`

```sql
-- bustaams.TB_USER_CANCEL_MANAGE definition

CREATE TABLE `TB_USER_CANCEL_MANAGE` (
  `USER_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '대상 고객 TB_USER.USER_ID',
  `USER_TYPE` enum('TRAVELER','DRIVER','SALES') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '고객 구분: 여행자·버스기사·영업회원',
  `CANCEL_CNT` int NOT NULL DEFAULT '0' COMMENT '누적 취소 건수(총합·정책에 따라 세부 합과 일치시키거나 별도 집계)',
  `CANCEL_BUS_DRIVER_CNT` int NOT NULL DEFAULT '0' COMMENT '버스기사 누적 취소 건수',
  `CANCEL_TRAVELER_ALL_CNT` int NOT NULL DEFAULT '0' COMMENT '여행자 여행 전체취소 누적 건수',
  `CANCEL_TRAVELER_PARTIAL_BUS_CNT` int NOT NULL DEFAULT '0' COMMENT '여행자 버스 부분 취소 누적 건수',
  `TRADE_RESTRICT_YN` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N' COMMENT '거래제한 여부 Y/N',
  `TRADE_RESTRICT_START_DT` datetime DEFAULT NULL COMMENT '거래제한 시작일시',
  `TRADE_RESTRICT_END_DT` datetime DEFAULT NULL COMMENT '거래제한 종료일시',
  `REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마스터 등록 일시',
  `REG_ID` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '등록자 ID',
  `MOD_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마스터 수정 일시',
  `MOD_ID` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`USER_ID`),
  KEY `IDX_UCM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객별·유형별 취소 누적·거래제한 마스터';
```

### `TB_USER_DEVICE_TOKEN`

```sql
-- bustaams.TB_USER_DEVICE_TOKEN definition

CREATE TABLE `TB_USER_DEVICE_TOKEN` (
  `ROW_ID` bigint NOT NULL AUTO_INCREMENT,
  `USER_UUID` binary(16) NOT NULL,
  `FCM_TOKEN` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `CLIENT_KIND` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `UPD_DT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ROW_ID`),
  UNIQUE KEY `UK_USER_FCM_TOKEN` (`USER_UUID`,`FCM_TOKEN`(256)),
  KEY `IDX_USER_DEVICE_UPD` (`USER_UUID`,`UPD_DT`)
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FCM 기기 토큰 (채팅 알림 등)';
```

### `TB_USER_TERMS_HIST`

```sql
-- bustaams.TB_USER_TERMS_HIST definition

CREATE TABLE `TB_USER_TERMS_HIST` (
  `USER_ID` varchar(255) NOT NULL,
  `TERMS_HIST_SEQ` int NOT NULL,
  `TERMS_TYPE` enum('SERVICE','TRAVELER_SERVICE','DRIVER_SERVICE','PRIVACY','MARKETING','PARTNER_CONTRACT') NOT NULL COMMENT '약관 종류',
  `TERMS_VER` varchar(10) NOT NULL,
  `AGREE_YN` enum('Y','N') DEFAULT 'Y',
  `MKT_SMS_YN` enum('Y','N') DEFAULT 'N',
  `MKT_PUSH_YN` enum('Y','N') DEFAULT 'N',
  `MKT_EMAIL_YN` enum('Y','N') DEFAULT 'N',
  `MKT_TEL_YN` enum('Y','N') DEFAULT 'N',
  `SIGN_FILE_ID` varchar(20) DEFAULT NULL,
  `AGREE_DT` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`USER_ID`,`TERMS_HIST_SEQ`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원 약관 동의 및 서명 관리';
```

---

## 4. BUSTAAMS 수록 `TB_USER` (이전: `USER_ID` PK) — 참고

§1 `CUST_ID` 모델이 권장 정의입니다.

```sql
-- bustaams.TB_USER definition

CREATE TABLE `TB_USER` (
  `USER_ID` varchar(255) NOT NULL,
  `EMAIL` varchar(100) DEFAULT NULL,
  `SNS_TYPE` enum('NONE','KAKAO','NAVER') DEFAULT 'NONE' COMMENT '간편로그인 타입',
  `USER_TYPE` enum('TRAVELER','DRIVER','PARTNER') NOT NULL COMMENT '회원구분',
  `PASSWORD` varchar(255) NOT NULL COMMENT '비밀번호 (단방향 암호화)',
  `USER_NM` varchar(255) DEFAULT NULL,
  `RESIDENT_NO_ENC` varchar(255) DEFAULT NULL COMMENT '주민등록번호 (양방향 암호화) - 기사 등록용 추가',
  `HP_NO` varchar(255) DEFAULT NULL,
  `PROFILE_IMG_PATH` varchar(512) DEFAULT NULL,
  `PROFILE_FILE_ID` varchar(20) DEFAULT NULL COMMENT '프로필 사진 파일 식별자 (TB_FILE_MASTER 참조)',
  `SMS_AUTH_YN` enum('Y','N') DEFAULT 'N' COMMENT 'SMS 문자 인증 여부',
  `RECOM_CODE` varchar(20) DEFAULT NULL COMMENT '추천인 코드 (영업파트너의 USER_ID)',
  `JOIN_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  `USER_STAT` enum('ACTIVE','LEAVE','BANNED','TEMPORARY') DEFAULT 'ACTIVE' COMMENT '상태',
  `MOD_DT` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
  `MOD_ID` varchar(30) DEFAULT NULL COMMENT '수정자 ID',
  PRIMARY KEY (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='통합 회원 및 개인정보 관리 [2, 3]';
```

---

## 5. 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-04-10 | `CUST_ID`/`USER_ID(256)` 정책, `TB_AUCTION_REQ` 마스터, BUSTAAMS 편철. |
| 2026-04-23 | 주요 ID **0패딩 순번** 안내. |
| 2026-04-24 | `bustaams` **전체** DDL `BUSTAAMS_테이블 생성 쿼리 전체.md` 기준으로 §3·§4 재정렬. `CREATE` 파싱 `ENGINE=…;` 기준. **채팅(§3):** `TB_CHAT_LOG`·`TB_CHAT_LOG_PART`·`TB_CHAT_LOG_HIST` **3분할**(방/참가/메시지) — BUSTAAMS **동기**; 구 단일 `CHAT_LOG_ID`+메시지 혼재 모델 **폐지**(상단·§0-2). |
| 2026-04-26 | 운영 DB `CUST_ID` 일원화 전제: 상단 안내, **§0-2** 문서·운영 갭 점검표. §0 FK 문구 정리. |
| 2026-04-30 | **채팅(§3):** `TB_CHAT_LOG` **개편** — PK **`CHAT_ID` → `CHAT_SEQ`**. `TB_CHAT_LOG_PART` **신규**, `TB_CHAT_LOG_HIST` **신규** — PK **`HIST_ID`(varchar) → `HIST_SEQ`(`INT AUTO_INCREMENT`)**. 상단·§0-2·§3 설명·`BUSTAAMS_테이블 생성 쿼리 전체.md`·`server.js`·`실시간채팅_버스기사 화면.md` 정합. |
| 2026-04-23 | **`TB_DRIVER_DOCS`:** 기사 키 **`USER_ID`(255) → `CUST_ID`(10)**, PK·FK `TB_USER(CUST_ID)` — §0-2 BustAams 일원화. **`DOC_TYPE`** `COMMENT` + **`TB_COMMON_CODE`(`DOC_TYPE`)** 연계 안내, `APPROVER_ID`·`MOD_DT` 정리, `BUSTAAMS_테이블 생성 쿼리 전체.md` 동기. |
