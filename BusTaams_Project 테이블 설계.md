# BusTaams 프로젝트 테이블 설계 (Full Schema)

## TB_AUCTION_REQ

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  | 경매 요청 ID |
| **TRAVELER_ID** | varchar(10) | NO |  | NULL |  | 여행자 식별자 CUST_ID |
| **TRIP_TITLE** | varchar(256) | YES |  | NULL |  | 여정 제목 |
| **START_ADDR** | varchar(256) | NO |  | NULL |  | 출발지 주소 |
| **END_ADDR** | varchar(256) | NO |  | NULL |  | 목적지 주소 |
| **START_DT** | datetime | NO |  | NULL |  | 출발 일시 |
| **END_DT** | datetime | NO |  | NULL |  | 도착 일시 |
| **BUS_CHANG_CNT** | int | NO |  | 0 |  | 버스기사변경 건수 |
| **PASSENGER_CNT** | int | YES |  | 0 |  | 탑승 인원 |
| **REQ_AMT** | decimal(13,0) | NO |  | 0 |  | 요청 금액 (원) |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL','OTHER') | YES |  | AUCTION |  | 버스 예약·입찰 진행 상태 (AUCTION:입찰대기, BIDDING:응찰등록, CONFIRM:예약확정, DONE:운행종료, TRAVELER_CANCEL:전체취소, DRIVER_CANCEL:응찰취소, BUS_CHANGE:버스변경요청, BUS_CANCEL:버스취소, OTHER:기타) |
| **EXPIRE_DT** | datetime | NO |  | NULL |  | 입찰 마감 예정 일시 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_AUCTION_REQ_BUS

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  | 요청버스의 원 예약요청 키값 |
| **REQ_BUS_SEQ** | int | NO | PRI | NULL |  | 요청예약의 요청버스의 SEQ |
| **BUS_TYPE_CD** | varchar(30) | NO |  | NULL |  | 차량 유형 (TB_COMMON_CODE 참조) |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') | YES |  | AUCTION |  | 버스기사 입찰 현황 상태 |
| **TOLLS_AMT** | decimal(13,0) | YES |  | NULL |  | 고속도록 통행료 |
| **FUEL_COST** | decimal(13,0) | YES |  | NULL |  | 유류비 |
| **RES_BUS_AMT** | decimal(13,0) | YES |  | NULL |  | 버스 예약금액 |
| **RES_FEE_TOTAL_AMT** | decimal(13,0) | YES |  | NULL |  | 예약금액 전체 6.6% 해당 금액 |
| **RES_FEE_REFUND_AMT** | decimal(13,0) | YES |  | NULL |  | 예약 환급 금액 5.5% 해당 금액 |
| **RES_FEE_ATTRIBUTION_AMT** | decimal(18,3) | YES |  | NULL |  | 예약 귀속 금액 1.1% 해당 금액 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_AUCTION_REQ_VIA

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  | 견적 요청 마스터 ID |
| **VIA_SEQ** | int | NO | PRI | NULL |  | 경유지 순서별 일련번호 |
| **VIA_TYPE** | enum('START_NODE','START_WAY','ROUND_TRIP','END_WAY','END_NODE') | NO |  | START_WAY |  | 구분 (START_NODE:출발지, START_WAY:출발행경유, ROUND_TRIP:회차지, END_WAY:복귀행경유, END_NODE:최종도착지) |
| **VIA_ADDR** | varchar(255) | NO |  | NULL |  | 경유지 상세 주소 |
| **LAT** | decimal(10,8) | YES |  | NULL |  | 위도 (Latitude) |
| **LNG** | decimal(11,8) | YES |  | NULL |  | 경도 (Longitude) |
| **DIST_FROM_PREV** | decimal(10,2) | YES |  | 0.00 |  | 이전 지점으로부터의 거리 (km) |
| **TIME_FROM_PREV** | int | YES |  | 0 |  | 이전 지점으로부터의 소요 시간 (분) |
| **STOP_TIME_MIN** | int | YES |  | 0 |  | 정차 예정 시간(분) |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_BUS_DRIVER_VEHICLE

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUS_ID** | varchar(10) | NO | PRI | NULL |  | 버스 고유 ID(0패딩 순번) |
| **CUST_ID** | varchar(10) | NO | MUL | NULL |  | 해당 버스기사 TB_USER.CUST_ID |
| **VEHICLE_NO** | varchar(20) | NO |  | NULL |  | 차량 번호 |
| **MODEL_NM** | varchar(100) | NO |  | NULL |  | 모델명 |
| **MANUFACTURE_YEAR** | varchar(10) | YES |  | NULL |  | 제작 연도(표시 문자열) |
| **MILEAGE** | int | YES |  | 0 |  | 주행거리 km |
| **SERVICE_CLASS** | varchar(50) | NO |  | NULL |  | TB_COMMON_CODE GRP_CD=BUS_TYPE 의 DTL_CD |
| **AMENITIES** | json | YES |  | NULL |  | 편의 옵션 JSON (wifi, usb 등) |
| **HAS_ADAS** | char(1) | NO |  | N |  | ADAS Y/N |
| **LAST_INSPECT_DT** | date | YES |  | NULL |  | 최근 정기점검일 |
| **INSURANCE_EXP_DT** | date | YES |  | NULL |  | 보험 만료 예정일 |
| **VEHICLE_PHOTOS_JSON** | json | YES |  | NULL |  | 차량 사진 FILE_ID 배열 |
| **BIZ_REG_FILE_ID** | varchar(20) | YES |  | NULL |  | 사업자등록증 TB_FILE_MASTER.FILE_ID |
| **TRANS_LIC_FILE_ID** | varchar(20) | YES |  | NULL |  | 운송사업허가 TB_FILE_MASTER.FILE_ID |
| **INS_CERT_FILE_ID** | varchar(20) | YES |  | NULL |  | 보험가입증명 TB_FILE_MASTER.FILE_ID |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_BUS_RESERVATION

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RES_ID** | varchar(10) | NO | PRI | NULL |  | 예약 요청정보 키값 |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  | 여행 요청정보 키값 (TB_AUCTION_REQ.REQ_ID) |
| **REQ_BUS_SEQ** | int | NO | PRI | NULL |  | 요청예약의 요청버스의 SEQ |
| **TRAVELER_ID** | varchar(10) | YES |  | NULL |  | 여행자 (TB_USER.CUST_ID) |
| **DRIVER_ID** | varchar(10) | YES |  | NULL |  | 해당 버스 기사 (TB_USER.CUST_ID) |
| **BUS_ID** | varchar(10) | YES |  | NULL |  | 버스정보 키값 (TB_BUS_DRIVER_VEHICLE.BUS_ID) |
| **DRIVER_BIDDING_PRICE** | decimal(13,0) | NO |  | NULL |  | 버스기사 입찰가격 |
| **RES_FEE_TOTAL_AMT** | decimal(13,0) | YES |  | NULL |  | 예약금액 전체 6.6% 해당 금액 |
| **RES_FEE_REFUND_AMT** | decimal(13,0) | YES |  | NULL |  | 예약 환급 금액 5.5% 해당 금액 |
| **RES_FEE_ATTRIBUTION_AMT** | decimal(13,0) | YES |  | NULL |  | 예약 귀속 금액 1.1% 해당 금액 |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') | YES |  | BIDDING |  | 버스기사 입찰 현황 상태 |
| **CONFIRM_DT** | datetime | YES |  | NULL |  | 예약 확정 일시 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_CHAT_LOG

> 스키마 정본: `busTaams_server/sql/tb_chat_log_room_hist_part.sql` — 대화(방) 마스터. 메시지 본문은 `TB_CHAT_LOG_HIST`, 참가자는 `TB_CHAT_LOG_PART`.

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CHAT_LOG_SEQ** | int | NO | PRI | NULL | auto_increment | 대화(방) 일련 — PK |
| **ROOM_KIND** | enum('TRAVELER','DRIVER','PARTNER','EMPL','OTHER') | NO | MUL |  |  | TRAVELER:여행자, DRIVER:버스기사, PARTNER:영업회원, EMPL:관리직원, OTHER:이외 |
| **CHAT_TITLE** | varchar(200) | YES |  | NULL |  | 대화(방) 제목 |
| **CHAT_COVER_FILE_ID** | varchar(20) | YES |  | NULL |  | 대화창 썸네일 — TB_FILE_MASTER.FILE_ID(선택) |
| **REQ_ID** | varchar(10) | YES | MUL | NULL |  | TB_AUCTION_REQ — 미연동 시 NULL. UK_CHAT_LOG_RES (REQ_ID, RES_ID) |
| **RES_ID** | varchar(10) | YES |  | NULL |  | TB_BUS_RESERVATION — 미연동 시 NULL |
| **CREATED_BY_CUST_ID** | varchar(10) | NO | MUL | NULL |  | 방 개설자 TB_USER.CUST_ID |
| **LAST_MSG_DT** | datetime | YES |  | NULL |  | 마지막 메시지 시각(TB_CHAT_LOG_HIST 기준 갱신 권장) |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

**인덱스·제약(요약):** `UK_CHAT_LOG_RES` (`REQ_ID`,`RES_ID`), `IDX_CHAT_LOG_ROOM_KIND`, `IDX_CHAT_LOG_CREATED`, `IDX_CHAT_LOG_REQ_REG`, `CHK_CHAT_LOG_REQ_RES`(REQ·RES 동시 NULL 또는 동시 NOT NULL). FK 없음.

## TB_CHAT_LOG_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HIST_SEQ** | int | NO | PRI | NULL | auto_increment | 메시지 일련 — PK |
| **CHAT_LOG_SEQ** | int | NO | MUL | NULL |  | TB_CHAT_LOG.CHAT_LOG_SEQ — FK ON DELETE CASCADE |
| **SENDER_CUST_ID** | varchar(10) | NO | MUL | NULL |  | 발신자 TB_USER.CUST_ID |
| **SENDER_ROLE** | enum('TRAVELER','DRIVER','PARTNER','EMPL','SYSTEM') | NO |  |  |  | TRAVELER, DRIVER, PARTNER, EMPL, SYSTEM |
| **MSG_KIND** | varchar(20) | NO |  | 'TEXT' |  | DEFAULT 'TEXT' |
| **MSG_BODY** | text | YES |  | NULL |  | 메시지 본문 |
| **FILE_ID** | varchar(20) | YES |  | NULL |  | 첨부 시 TB_FILE_MASTER.FILE_ID |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |

**인덱스·제약(요약):** `IDX_HIST_CHAT` (`CHAT_LOG_SEQ`,`REG_DT`), `IDX_HIST_SENDER`, `FK_HIST_CHAT` → `TB_CHAT_LOG`(`CHAT_LOG_SEQ`).

## TB_CHAT_LOG_PART

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CHAT_LOG_SEQ** | int | NO | PRI | NULL |  | TB_CHAT_LOG.CHAT_LOG_SEQ — 복합 PK 1 |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | TB_USER.CUST_ID — 복합 PK 2 |
| **PART_TYPE** | enum('TRAVELER','DRIVER','PARTNER','EMPL') | NO |  |  |  | 이 방에서의 역할 — 표시·권한 |
| **JOINED_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 방 입장(등록) 시각 |
| **INVITER_CUST_ID** | varchar(10) | YES |  | NULL |  | 초대로 입장 시 초대한 CUST_ID |

**인덱스·제약(요약):** `IDX_PART_CUST` (`CUST_ID`,`CHAT_LOG_SEQ`), `FK_PART_CHAT` → `TB_CHAT_LOG`(`CHAT_LOG_SEQ`) ON DELETE CASCADE.

## TB_COMMON_CODE

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GRP_CD** | varchar(30) | NO | PRI | NULL |  | 그룹 코드 |
| **DTL_CD** | varchar(30) | NO | PRI | NULL |  | 상세 코드 |
| **CD_NM_KO** | varchar(100) | NO |  | NULL |  | 코드 한글명 |
| **CD_NM_EN** | varchar(100) | YES |  | NULL |  | 코드 영문명 |
| **CD_FNUM** | decimal(13,3) | YES |  | 0.000 |  | 참고숫자 1 |
| **CD_TNUM** | decimal(13,3) | YES |  | 0.000 |  | 참고숫자 2 |
| **USE_YN** | enum('Y','N') | YES |  | Y |  | 사용 여부 |
| **DISP_ORD** | int | YES |  | 0 |  | 출력 순서 |
| **CD_DESC** | text | YES |  | NULL |  | 코드 설명 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(30) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(30) | YES |  | NULL |  | 수정자 ID |

## TB_DRIVER_DETAIL

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USER_ID** | varchar(255) | NO | PRI | NULL |  | 기사 식별자 (USER_ID) |
| **BIRTH_YMD** | varchar(6) | YES |  | NULL |  | 생년월일 (YYMMDD) |
| **SEX** | varchar(1) | YES |  | NULL |  | 성별 |
| **ADDR_TYPE** | enum('HOME','OFFICE','OTHER') | NO | MUL | HOME |  | 주소 구분 |
| **ADDR_NAME** | varchar(40) | YES |  | NULL |  | 주소 명칭 |
| **ZIPCODE** | varchar(10) | YES |  | NULL |  | 우편번호 |
| **ADDRESS** | varchar(255) | YES |  | NULL |  | 기본 주소 |
| **DETAIL_ADDRESS** | varchar(255) | YES |  | NULL |  | 상세 주소 |
| **FEE_POLICY** | varchar(30) | YES |  | NULL |  | 기사회원등급코드 |
| **SELF_INTRO** | varchar(500) | YES |  | NULL |  | 기사 자기소개 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(30) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(30) | YES |  | NULL |  | 수정자 ID |

## TB_DRIVER_DOCS

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 기사 CUST_ID |
| **DOC_TYPE** | enum('LICENSE','QUALIFICATION','APTITUDE','BIZ_REG','TRANSPORT_PERMIT','INSURANCE','DRIVER_PHOTO','VEHICLE_PHOTO','TERMS_OF_USE','PRIVACY_CONSENT','MARKETING_CONSENT','DRIVER_CONTRACT','TRAVELER_CONTRACT','PARTNER_CONTRACT','TERMS_INTEGRATED') | NO | PRI | NULL |  | 문서 종류 |
| **DOC_TYPE_SEQ** | int unsigned | NO | PRI | NULL |  | 이력 순번 |
| **GCS_BUCKET_NM** | varchar(100) | YES |  | bustaams-secure-data |  | GCS 버킷명 |
| **GCS_PATH** | varchar(255) | NO |  | NULL |  | GCS 객체 경로 |
| **ORG_FILE_NM** | varchar(255) | YES |  | NULL |  | 원본 파일명 |
| **ORG_FILE_EXT** | char(5) | YES |  | png |  | 확장자 |
| **FILE_SIZE** | bigint | YES |  | NULL |  | 파일 크기 |
| **LICENSE_TYPE_CD** | varchar(30) | YES |  | NULL |  | 면허 종류 코드 |
| **DOC_NO_ENC** | varchar(255) | YES |  | NULL |  | 문서 번호 (암호화) |
| **ISSUE_DT** | date | YES |  | NULL |  | 발급 일자 |
| **EXP_DT** | date | YES |  | NULL |  | 만료 일자 |
| **INFO_STAT_CD** | varchar(300) | YES |  | NULL |  | 유효 상태 코드 |
| **APPROVE_STAT** | enum('WAIT','APPROVE','REJECT') | YES |  | WAIT |  | 승인 상태 |
| **REJECT_REASON** | text | YES |  | NULL |  | 반려 사유 |
| **APPROVER_ID** | varchar(10) | YES |  | NULL |  | 승인자 ID |
| **APPROVE_DT** | datetime | YES |  | NULL |  | 승인 일시 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(30) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(30) | YES |  | NULL |  | 수정자 ID |

**`TB_DRIVER_INFO`**: 본 프로젝트에서는 **미사용**(스키마에서 제거됨). 주민번호는 **`TB_USER.RESIDENT_NO_ENC`**, 면허·자격·주소·소개는 **`TB_DRIVER_DETAIL`**·**`TB_DRIVER_DOCS`**를 따른다.

## TB_FILE_MASTER

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FILE_ID** | varchar(20) | NO | PRI | NULL |  | PK. 숫자 채번 시 **20자리 왼쪽 0패딩**(예 `00000000000000000001`) 정본 |
| **FILE_CATEGORY** | varchar(50) | NO |  | NULL |  | 파일 카테고리 |
| **GCS_BUCKET_NM** | varchar(100) | YES |  | bustaams-secure-data |  | GCS 버킷명 |
| **GCS_PATH** | varchar(255) | NO |  | NULL |  | GCS 물리 경로 |
| **ORG_FILE_NM** | varchar(255) | YES |  | NULL |  | 원본 파일명 |
| **FILE_EXT** | char(5) | YES |  | png |  | 파일 확장자 |
| **FILE_SIZE** | bigint | YES |  | NULL |  | 파일 크기 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_INQUIRY

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 CUST_ID |
| **INQ_SEQ** | int | NO | PRI | NULL |  | 문의 순번 |
| **INQ_CATEGORY** | enum('BID_RES','PAY_REFUND','CANCEL_RULE','BUS_STAT','SUGGESTION') | NO |  | NULL |  | 문의 카테고리 |
| **TITLE** | varchar(255) | NO |  | NULL |  | 문의 제목 |
| **CONTENT** | text | NO |  | NULL |  | 문의 내용 |
| **ATTACH_FILE_ID** | varchar(20) | YES |  | NULL |  | 첨부파일 ID |
| **REPLY_CONTENT** | text | YES |  | NULL |  | 답변 내용 |
| **REPLY_DT** | datetime | YES |  | NULL |  | 답변 일시 |
| **INQ_STAT** | enum('WAITING','COMPLETED') | YES |  | WAITING |  | 처리 상태 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_MON_MEMBER

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 기사 CUST_ID |
| **YYYYMM** | varchar(6) | NO | PRI | NULL |  | 구독년월 |
| **FEE_POLICY** | enum('DRIVER_GENERAL','DRIVER_MIDDLE','DRIVER_HIGH') | NO |  | NULL |  | 요금 정책 |
| **BASIC_CNT** | int | NO |  | 0 |  | 월 응찰 가능 건수 |
| **USE_CNT** | int | NO |  | 0 |  | 월 사용 건수 |
| **REMAINING_CNT** | int | NO |  | 0 |  | 잔여 건수 |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_PAYMENT_CARD

> `bustaams` 스키마 정본: [`busTaams_server/sql/tb_payment_card.sql`](busTaams_server/sql/tb_payment_card.sql). 기존 DB에 컬럼 추가 시: [`busTaams_server/sql/alter_tb_payment_card_card_billing_key_enc.sql`](busTaams_server/sql/alter_tb_payment_card_card_billing_key_enc.sql). PK `(CUST_ID, CARD_SEQ)`, FK `FK_TPC_USER`: `CUST_ID` → `TB_USER(CUST_ID)`. PG **빌링키·결제 토큰**은 `CARD_BILLING_KEY_ENC`(AES-GCM), **발급 카드 명칭**은 `ORIGINAL_CARD_NAME`. 월 회비 **자동결제 일정 메타**(`AUTO_PAY_*`) 포함. `TB_DRIVER_PAYMENT_HIST` 가 `(CARD_CUST_ID, CARD_SEQ)` 로 본 테이블을 참조한다.

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL | | 카드정보 등록 사용자 `TB_USER.CUST_ID` |
| **CARD_SEQ** | int | NO | PRI | NULL | | 사용자의 카드 등록 SEQ |
| **CARD_NICKNAME** | varchar(50) | YES | | NULL | | 카드 별칭 |
| **CARD_NO_ENC** | varchar(255) | NO | | NULL | | 카드번호 ENC정보 |
| **CARD_BILLING_KEY_ENC** | varchar(512) | YES | | NULL | | PG 빌링키·결제토큰 AES-GCM (미사용 시 NULL) |
| **ORIGINAL_CARD_NAME** | varchar(50) | YES | | NULL | | 발급 카드 명칭 |
| **EXP_MONTH** | char(2) | NO | | NULL | | 유효기간 월 |
| **EXP_YEAR** | char(2) | NO | | NULL | | 유효기간 년도 |
| **IS_PRIMARY** | enum('Y','N') | YES | | N | | 메인 카드여부 |
| **AUTO_PAY_START_DT** | datetime | YES | | NULL | | 자동결제(월 회비 등) 시작 일시, NULL=이 카드로 자동결제 미등록 |
| **AUTO_PAY_END_DT** | datetime | YES | | NULL | | 자동결제 종료 일시, NULL=시작 후 아직 종료 전(진행·중단 처리 시각) |
| **AUTO_PAY_DAY** | tinyint unsigned | NO | | 1 | | 매월 자동결제 처리일(1~31, 기본 1일; 29~31일은 해당 월 일수에 맞게 배치에서 보정) |
| **REG_DT** | datetime | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES | | NULL | | 등록자 ID |
| **MOD_DT** | datetime | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES | | NULL | | 수정자 ID |

**인덱스·CHECK·기타:** `IDX_TPC_CUST_PRIMARY` (`CUST_ID`, `IS_PRIMARY`), `IDX_TPC_AUTO_PAY_ACTIVE` (`CUST_ID`, `AUTO_PAY_START_DT`, `AUTO_PAY_END_DT`); `CHK_TB_PAYMENT_CARD_AUTO_PAY_DAY`, `CHK_TB_PAYMENT_CARD_AUTO_PAY_RANGE` (`AUTO_PAY_END_DT` 가 있으면 `AUTO_PAY_START_DT` 필수 및 `END >= START`). 테이블 코멘트: 등록된 신용/체크카드 결제 수단. 엔진 InnoDB, `utf8mb4` / `utf8mb4_0900_ai_ci`.

## TB_DRIVER_PAYMENT_HIST

> `bustaams` 정합 DDL: [`busTaams_server/sql/tb_driver_payment_hist.sql`](busTaams_server/sql/tb_driver_payment_hist.sql). 버스기사 **월 회비 자동결제 납부 이력**. FK `DRIVER_ID` → `TB_USER(USER_ID)`; `FK_DSP_PAY_CARD`: `(CARD_CUST_ID, CARD_SEQ)` → `TB_PAYMENT_CARD` ON DELETE SET NULL. `CARD_CUST_ID`/`CARD_SEQ` 는 둘 다 NULL 또는 둘 다 NOT NULL 로 입력(반쪽 쌍 금지는 DB CHECK 미사용, MySQL 3823). 귀속 월은 `TB_SUBSCRIPTION.YYYYMM` 과 동일 `YYYYMM` 체계.

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PAY_HIST_SEQ** | bigint unsigned | NO | PRI | NULL | auto_increment | 납부 이력 일련번호 |
| **DRIVER_ID** | varchar(255) | NO | MUL | NULL | | 기사 `TB_USER.USER_ID` |
| **CARD_CUST_ID** | varchar(10) | YES | MUL | NULL | | 결제에 사용한 카드 `TB_PAYMENT_CARD.CUST_ID` |
| **CARD_SEQ** | int | YES | | NULL | | 결제에 사용한 카드 `TB_PAYMENT_CARD.CARD_SEQ` |
| **BILLING_YYYYMM** | varchar(6) | NO | | NULL | | 청구·귀속 월(`YYYYMM`) |
| **PAY_AMT** | decimal(13,0) | NO | | NULL | | 청구 금액(원) |
| **PAY_STAT** | enum('PENDING','SUCCESS','FAILED','REFUNDED','CANCELLED') | NO | MUL | PENDING | | 결제 상태 |
| **PAY_REQ_DT** | datetime | NO | | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 자동결제 요청(시도) 일시 |
| **PAY_COMPLETED_DT** | datetime | YES | | NULL | | 승인 완료 일시 |
| **PG_TXN_ID** | varchar(120) | YES | | NULL | | PG 거래·승인 식별자 |
| **FAIL_MSG** | varchar(500) | YES | | NULL | | 실패 사유(PG/내부) |
| **CARD_NICKNAME_SNAPSHOT** | varchar(50) | YES | | NULL | | 결제 시점 카드 별칭(카드 삭제 후 조회용) |
| **CARD_LAST_FOUR_SNAPSHOT** | char(4) | YES | | NULL | | 결제 시점 카드 끝 4자리 |
| **REG_DT** | datetime | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES | | NULL | | 등록자 ID |
| **MOD_DT** | datetime | YES | | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES | | NULL | | 수정자 ID |

**인덱스:** `IDX_DSP_DRIVER_MONTH` (`DRIVER_ID`, `BILLING_YYYYMM`), `IDX_DSP_PAY_STAT_REQ` (`PAY_STAT`, `PAY_REQ_DT`), `IDX_DSP_CARD_REF` (`CARD_CUST_ID`, `CARD_SEQ`).

## TB_SMS_LOG

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG_SEQ** | int | NO | PRI | NULL | auto_increment | 발송 일련번호 |
| **REQ_ID** | varchar(10) | YES |  | NULL |  | 연관 요청 ID |
| **SEND_CATEGORY** | varchar(20) | NO |  | ETC |  | 발송 카테고리 |
| **SENDER_ID** | varchar(10) | YES |  | NULL |  | 발송자 ID |
| **RECEIVER_ID** | varchar(10) | YES |  | NULL |  | 수신자 ID |
| **RECEIVER_PHONE** | varchar(20) | NO |  | NULL |  | 수신 번호 |
| **MSG_CONTENT** | text | NO |  | NULL |  | 메시지 내용 |
| **MSG_TYPE** | varchar(20) | NO |  | SMS |  | 메시지 타입 (SMS, LMS, ALIM_TALK) |
| **SEND_STAT** | varchar(20) | NO |  | PENDING |  | 발송 상태 (SUCCESS, FAIL, PENDING) |
| **ERROR_MSG** | text | YES |  | NULL |  | 에러 메시지 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |

## TB_TERMS_MASTER

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TERMS_SEQ** | int | NO | PRI | NULL | auto_increment | 약관 식별자 |
| **TERMS_TYPE** | varchar(20) | NO |  | NULL |  | 약관 종류 |
| **TERMS_VERSION** | varchar(10) | NO |  | NULL |  | 약관 버전 |
| **REQUIRE_YN** | char(1) | YES |  | Y |  | 필수 여부 |
| **CONTENT_URL** | varchar(500) | YES |  | NULL |  | 약관 URL |
| **ENFORCE_DT** | date | NO |  | NULL |  | 시행일 |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_TRIP_REVIEW

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RES_ID** | varchar(10) | NO | PRI | NULL |  | 예약 ID |
| **REVIEW_SEQ** | int | NO | PRI | NULL |  | 리뷰 순번 |
| **WRITER_ID** | varchar(10) | NO |  | NULL |  | 작성자 CUST_ID |
| **DRIVER_ID** | varchar(10) | NO |  | NULL |  | 기사 CUST_ID |
| **STAR_RATING** | tinyint | YES |  | 5 |  | 별점 |
| **COMMENT_TEXT** | text | YES |  | NULL |  | 리뷰 내용 |
| **REPLY_TEXT** | text | YES |  | NULL |  | 답변 내용 |
| **REPLY_DT** | datetime | YES |  | NULL |  | 답변 일시 |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_USER

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 식별자 |
| **USER_ID** | varchar(256) | NO | UNI | NULL |  | 로그인 ID |
| **EMAIL** | varchar(100) | YES |  | NULL |  | 이메일 |
| **SNS_TYPE** | enum('NONE','KAKAO','NAVER') | YES |  | NONE |  | SNS 타입 |
| **USER_TYPE** | enum('TRAVELER','DRIVER','PARTNER') | NO |  | NULL |  | 회원 구분 |
| **PASSWORD** | varchar(255) | NO |  | NULL |  | 비밀번호 |
| **USER_NM** | varchar(255) | YES |  | NULL |  | 사용자명 |
| **RESIDENT_NO_ENC** | varchar(255) | YES |  | NULL |  | 주민번호 (암호화) |
| **HP_NO** | varchar(255) | YES |  | NULL |  | 휴대폰번호 |
| **USER_IMAGE** | varchar(255) | YES |  | NULL |  | 사용자 이미지 |
| **SIGNATURE_FILE_ID** | varchar(20) | YES |  | NULL |  | 서명 파일 ID |
| **PROFILE_FILE_ID** | varchar(20) | YES |  | NULL |  | **`TB_FILE_MASTER.FILE_ID`와 동일 문자열**(20자 패딩 권장) |
| **SMS_AUTH_YN** | enum('Y','N') | YES |  | N |  | SMS 인증 여부 |
| **RECOM_CODE** | varchar(20) | YES |  | NULL |  | 추천인 코드 |
| **JOIN_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 가입 일시 |
| **USER_STAT** | enum('ACTIVE','LEAVE','BANNED','TEMPORARY') | YES |  | ACTIVE |  | 상태 |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_USER_CANCEL_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 CUST_ID |
| **HIST_SEQ** | int | NO | PRI | NULL |  | 취소 이력 순번 |
| **CANCEL_REASON_GRP_CD** | varchar(50) | NO |  | CANCEL_REASON |  | 취소사유 그룹코드 |
| **CANCEL_REASON_DTL_CD** | varchar(50) | NO |  | NULL |  | 취소사유 상세코드 |
| **CANCEL_REASON_TEXT** | text | YES |  | NULL |  | 취소사유 상세내용 |
| **REASON_DOC_FILE_NM** | varchar(500) | YES |  | NULL |  | 증빙 서류 파일명 |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_USER_CANCEL_MANAGE

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 CUST_ID |
| **CANCEL_CNT** | int | NO |  | 0 |  | 누적 취소 건수 |
| **CANCEL_BUS_DRIVER_CNT** | int | NO |  | 0 |  | 기사 취소 건수 |
| **CANCEL_TRAVELER_ALL_CNT** | int | NO |  | 0 |  | 여행자 전체취소 건수 |
| **CANCEL_TRAVELER_PARTIAL_BUS_CNT** | int | NO |  | 0 |  | 여행자 부분취소 건수 |
| **TRADE_RESTRICT_YN** | char(1) | NO |  | N |  | 거래제한 여부 |
| **TRADE_RESTRICT_START_DT** | datetime | YES |  | NULL |  | 제한 시작일 |
| **TRADE_RESTRICT_END_DT** | datetime | YES |  | NULL |  | 제한 종료일 |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

### 정책 및 로직
- **데이터 생성**: 회원가입 완료 시 `CUST_ID`별로 초기 레코드를 생성함 (모든 카운트 0, `TRADE_RESTRICT_YN = 'N'`).
- **카운트 증가**: '나의 예약목록'에서 여정 전체 취소(`complex-cancel`) 시 `CANCEL_CNT` 및 `CANCEL_TRAVELER_ALL_CNT`를 각각 1씩 증가시킴.
- **거래 제한**: 로그인 시 이 테이블을 조회하여 `TRADE_RESTRICT_YN`이 'Y'인 경우 로그인을 차단함.

## TB_USER_DEVICE_TOKEN

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 CUST_ID |
| **FCM_TOKEN** | varchar(512) | NO |  | NULL |  | FCM 토큰 |
| **CLIENT_KIND** | varchar(20) | NO |  | web |  | 클라이언트 종류 |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 등록 일시 |
| **REG_ID** | varchar(10) | YES |  | NULL |  | 등록자 ID |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP | 수정 일시 |
| **MOD_ID** | varchar(10) | YES |  | NULL |  | 수정자 ID |

## TB_USER_TERMS_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  | 사용자 CUST_ID |
| **TERMS_HIST_SEQ** | int | NO | PRI | NULL |  | 약관 이력 순번 |
| **TERMS_TYPE** | enum('SERVICE','TRAVELER_SERVICE','DRIVER_SERVICE','PRIVACY','MARKETING','PARTNER_CONTRACT') | NO |  | NULL |  | 약관 종류 |
| **TERMS_VER** | varchar(10) | NO |  | NULL |  | 약관 버전 |
| **AGREE_YN** | enum('Y','N') | YES |  | Y |  | 동의 여부 |
| **MKT_SMS_YN** | enum('Y','N') | YES |  | N |  | 마케팅 SMS 동의 |
| **MKT_PUSH_YN** | enum('Y','N') | YES |  | N |  | 마케팅 PUSH 동의 |
| **MKT_EMAIL_YN** | enum('Y','N') | YES |  | N |  | 마케팅 이메일 동의 |
| **MKT_TEL_YN** | enum('Y','N') | YES |  | N |  | 마케팅 전화 동의 |
| **SIGN_FILE_ID** | varchar(20) | YES |  | NULL |  | 서명 파일 ID |
| **AGREE_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED | 동의 일시 |

## 비즈니스 규칙 (Business Rules)

### 1. 버스 변경 (Bus Change) & 재등록 (Re-registration)
- **제한**: 각 예약(`REQ_ID`)당 최대 **3회**까지 가능.
- **변경(Change) 로직**:
  - `TB_AUCTION_REQ.DATA_STAT`을 `'BUS_CHANGE'`로 변경 -> **목록에서 즉시 제외됨**.
  - `TB_AUCTION_REQ.BUS_CHANG_CNT`를 **+1** 증가.
  - `TB_AUCTION_REQ_BUS`의 해당 차량 행의 상태를 `'BUS_CHANGE'`로 변경.
- **재등록(Re-registration) 로직**:
  - 변경 성공 직후 전용 모달(`BusReRegistrationModal`)을 통해 새로운 차량 및 가격을 입력받음.
  - `TB_AUCTION_REQ_BUS`에 새로운 차량 정보를 `INSERT` (상태: `'AUCTION'`).
  - `TB_AUCTION_REQ.DATA_STAT`을 다시 `'AUCTION'`으로 복구 -> **목록에 다시 노출됨**.
- **목록 필터링**: 나의 예약 목록 조회 시 마스터(`TB_AUCTION_REQ`)의 `DATA_STAT`이 `('TRAVELER_CANCEL', 'BUS_CHANGE')`인 항목은 제외함. 단, 버스(`TB_AUCTION_REQ_BUS`) 단위의 `BUS_CANCEL`은 목록에 노출함.

### 2. 사용자 취소 페널티 (Cancellation Penalty)
- **대상**: **모든 사용자** (여행자 및 기사 공통).
- **제한 원칙**: `TB_USER_CANCEL_MANAGE` 테이블의 `TRADE_RESTRICT_START_DT` ~ `TRADE_RESTRICT_END_DT` 기간 내에 현재 날짜가 포함되면 거래 정지 상태로 간주함.
- **체크 시점**:
    - **로그인**: 제한 기간 중에도 로그인은 허용하되, 사용자 정보에 제한 상태를 포함하여 UI에서 안내함.
    - **거래 행위**: 신규 예약 등록(여행자) 및 입찰 참여(기사) 등 실제 거래 시 서버에서 차단(`403 Forbidden`).
- **제한 내용**: 새로운 거래 행위 불가 및 UI 버튼 비활성화.
- **관련 테이블**: `TB_USER_CANCEL_MANAGE`
    - 여행자: `CANCEL_TRAVELER_ALL_CNT` 기록 및 날짜 체크.
    - 버스기사: `CANCEL_BUS_DRIVER_CNT` 기록 및 날짜 체크.
