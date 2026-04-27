# BusTaams 프로젝트 테이블 설계 (Full Schema)


## TB_AUCTION_REQ

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  |
| **TRAVELER_ID** | varchar(10) | NO |  | NULL |  |
| **TRIP_TITLE** | varchar(256) | YES |  | NULL |  |
| **START_ADDR** | varchar(256) | NO |  | NULL |  |
| **END_ADDR** | varchar(256) | NO |  | NULL |  |
| **START_DT** | datetime | NO |  | NULL |  |
| **END_DT** | datetime | NO |  | NULL |  |
| **BUS_CHANG_CNT** | int | NO |  | 0 |  |
| **PASSENGER_CNT** | int | YES |  | 0 |  |
| **REQ_AMT** | decimal(13,0) | NO |  | 0 |  |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL','OTHER') | YES |  | AUCTION |  |
| **EXPIRE_DT** | datetime | NO |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_AUCTION_REQ_BUS

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  |
| **REQ_BUS_SEQ** | int | NO | PRI | NULL |  |
| **BUS_TYPE_CD** | varchar(30) | NO |  | NULL |  |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL') | YES |  | AUCTION |  |
| **TOLLS_AMT** | decimal(13,0) | YES |  | NULL |  |
| **FUEL_COST** | decimal(13,0) | YES |  | NULL |  |
| **RES_BUS_AMT** | decimal(13,0) | YES |  | NULL |  |
| **RES_FEE_TOTAL_AMT** | decimal(13,0) | YES |  | NULL |  |
| **RES_FEE_REFUND_AMT** | decimal(13,0) | YES |  | NULL |  |
| **RES_FEE_ATTRIBUTION_AMT** | decimal(18,3) | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_AUCTION_REQ_VIA

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ_ID** | varchar(10) | NO | PRI | NULL |  |
| **VIA_SEQ** | int | NO | PRI | NULL |  |
| **VIA_TYPE** | enum('START_NODE','START_WAY','ROUND_TRIP','END_WAY','END_NODE') | NO |  | START_WAY |  |
| **VIA_ADDR** | varchar(255) | NO |  | NULL |  |
| **LAT** | decimal(10,8) | YES |  | NULL |  |
| **LNG** | decimal(11,8) | YES |  | NULL |  |
| **DIST_FROM_PREV** | decimal(10,2) | YES |  | 0.00 |  |
| **TIME_FROM_PREV** | int | YES |  | 0 |  |
| **STOP_TIME_MIN** | int | YES |  | 0 |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |
| **VIA_ORD** | int | NO |  | 1 |  |

## TB_BUS_DRIVER_VEHICLE

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUS_ID** | varchar(10) | NO | PRI | NULL |  |
| **CUST_ID** | varchar(10) | NO | MUL | NULL |  |
| **VEHICLE_NO** | varchar(20) | NO |  | NULL |  |
| **MODEL_NM** | varchar(100) | NO |  | NULL |  |
| **MANUFACTURE_YEAR** | varchar(10) | YES |  | NULL |  |
| **MILEAGE** | int | YES |  | 0 |  |
| **SERVICE_CLASS** | varchar(50) | NO |  | NULL |  |
| **AMENITIES** | json | YES |  | NULL |  |
| **HAS_ADAS** | char(1) | NO |  | N |  |
| **LAST_INSPECT_DT** | date | YES |  | NULL |  |
| **INSURANCE_EXP_DT** | date | YES |  | NULL |  |
| **VEHICLE_PHOTOS_JSON** | json | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_BUS_DRIVER_VEHICLE_FILE_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HIST_ID** | varchar(255) | NO | PRI | NULL |  |
| **BUS_ID** | varchar(255) | NO | MUL | NULL |  |
| **FILE_ID** | varchar(255) | NO | MUL | NULL |  |
| **FILE_CATEGORY** | varchar(50) | NO |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

## TB_BUS_RESERVATION

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RES_ID** | varchar(10) | NO | PRI | NULL |  |
| **REQ_ID** | varchar(10) | NO |  | NULL |  |
| **REQ_BUS_ID** | varchar(10) | NO |  | NULL |  |
| **DRIVER_ID** | varchar(10) | YES |  | NULL |  |
| **BUS_ID** | varchar(10) | YES |  | NULL |  |
| **DRIVER_BIDDING_PRICE** | decimal(13,0) | NO |  | NULL |  |
| **RES_FEE_TOTAL_AMT** | decimal(13,0) | YES |  | NULL |  |
| **RES_FEE_REFUND_AMT** | decimal(13,0) | YES |  | NULL |  |
| **RES_FEE_ATTRIBUTION_AMT** | decimal(13,0) | YES |  | NULL |  |
| **DATA_STAT** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL','OTHER') | YES |  | AUCTION |  |
| **CONFIRM_DT** | datetime | YES |  | NULL |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_CHAT_LOG

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHAT_LOG_UUID** | binary(16) | NO |  | NULL |  |
| **CHAT_SEQ** | int | NO | PRI | NULL | auto_increment |
| **ROOM_KIND** | enum('TRAVELER','DRIVER','PARTNER','EMPL','OTHER') | NO | MUL | NULL |  |
| **CHAT_TITLE** | varchar(200) | YES |  | NULL |  |
| **CHAT_COVER_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **REQ_ID** | varchar(10) | YES | MUL | NULL |  |
| **RES_ID** | varchar(10) | YES |  | NULL |  |
| **CREATED_BY_CUST_ID** | varchar(10) | NO | MUL | NULL |  |
| **LAST_MSG_DT** | datetime | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |
| **REQ_UUID** | binary(16) | YES | MUL | NULL |  |
| **RES_UUID** | binary(16) | YES |  | NULL |  |
| **TRAVELER_UUID** | binary(16) | YES |  | NULL |  |
| **DRIVER_UUID** | binary(16) | YES | MUL | NULL |  |
| **SENDER_UUID** | binary(16) | YES |  | NULL |  |
| **SENDER_ROLE** | enum('TRAVELER','DRIVER','SYSTEM') | YES |  | NULL |  |
| **MSG_KIND** | varchar(20) | NO |  | TEXT |  |
| **MSG_BODY** | text | YES |  | NULL |  |
| **FILE_UUID** | binary(16) | YES |  | NULL |  |

## TB_CHAT_LOG_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HIST_SEQ** | int | NO | PRI | NULL | auto_increment |
| **CHAT_SEQ** | int | NO | MUL | NULL |  |
| **SENDER_CUST_ID** | varchar(10) | NO | MUL | NULL |  |
| **SENDER_ROLE** | enum('TRAVELER','DRIVER','PARTNER','EMPL','SYSTEM') | NO |  | NULL |  |
| **MSG_KIND** | varchar(20) | NO |  | TEXT |  |
| **MSG_BODY** | text | YES |  | NULL |  |
| **FILE_ID** | varchar(20) | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

## TB_CHAT_LOG_PART

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHAT_SEQ** | int | NO | PRI | NULL |  |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **PART_TYPE** | enum('TRAVELER','DRIVER','PARTNER','EMPL') | NO |  | NULL |  |
| **JOINED_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **INVITER_CUST_ID** | varchar(10) | YES |  | NULL |  |

## TB_COMMON_CODE

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GRP_CD** | varchar(30) | NO | PRI | NULL |  |
| **DTL_CD** | varchar(30) | NO | PRI | NULL |  |
| **CD_NM_KO** | varchar(100) | NO |  | NULL |  |
| **CD_NM_EN** | varchar(100) | YES |  | NULL |  |
| **CD_FNUM** | decimal(13,3) | YES |  | 0.000 |  |
| **CD_TNUM** | decimal(13,3) | YES |  | 0.000 |  |
| **USE_YN** | enum('Y','N') | YES |  | Y |  |
| **DISP_ORD** | int | YES |  | 0 |  |
| **CD_DESC** | text | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(30) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(30) | YES |  | NULL |  |

## TB_DRIVER_DETAIL

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **USER_ID** | varchar(255) | NO | PRI | NULL |  |
| **BIRTH_YMD** | varchar(6) | YES |  | NULL |  |
| **SEX** | varchar(1) | YES |  | NULL |  |
| **ADDR_TYPE** | enum('HOME','OFFICE','OTHER') | NO | MUL | HOME |  |
| **ADDR_NAME** | varchar(40) | YES |  | NULL |  |
| **ZIPCODE** | varchar(10) | YES |  | NULL |  |
| **ADDRESS** | varchar(255) | YES |  | NULL |  |
| **DETAIL_ADDRESS** | varchar(255) | YES |  | NULL |  |
| **FEE_POLICY** | varchar(30) | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(30) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(30) | YES |  | NULL |  |

## TB_DRIVER_DOCS

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **DOC_TYPE** | enum('LICENSE','QUALIFICATION','APTITUDE','BIZ_REG','TRANSPORT_PERMIT','INSURANCE') | NO | PRI | NULL |  |
| **DOC_TYPE_SEQ** | int unsigned | NO | PRI | NULL |  |
| **FILE_ID** | varchar(20) | NO | UNI | NULL |  |
| **GCS_BUCKET_NM** | varchar(100) | YES |  | bustaams-secure-data |  |
| **GCS_PATH** | varchar(255) | NO |  | NULL |  |
| **ORG_FILE_NM** | varchar(255) | YES |  | NULL |  |
| **ORG_FILE_EXT** | char(5) | YES |  | png |  |
| **FILE_SIZE** | bigint | YES |  | NULL |  |
| **LICENSE_TYPE_CD** | varchar(30) | YES |  | NULL |  |
| **DOC_NO_ENC** | varchar(255) | YES |  | NULL |  |
| **ISSUE_DT** | date | YES |  | NULL |  |
| **EXP_DT** | date | YES |  | NULL |  |
| **INFO_STAT_CD** | varchar(300) | YES |  | NULL |  |
| **APPROVE_STAT** | enum('WAIT','APPROVE','REJECT') | YES |  | WAIT |  |
| **REJECT_REASON** | text | YES |  | NULL |  |
| **APPROVER_ID** | varchar(10) | YES |  | NULL |  |
| **APPROVE_DT** | datetime | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(30) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(30) | YES |  | NULL |  |

## TB_DRIVER_INFO

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **USER_ID** | varchar(256) | NO | PRI | NULL |  |
| **RRN_ENC** | varchar(512) | NO |  | NULL |  |
| **LICENSE_TYPE** | varchar(50) | YES |  | NULL |  |
| **LICENSE_NO** | varchar(100) | YES |  | NULL |  |
| **LICENSE_SERIAL_NO** | varchar(100) | YES |  | NULL |  |
| **LICENSE_ISSUE_DT** | date | YES |  | NULL |  |
| **LICENSE_EXPIRY_DT** | date | YES |  | NULL |  |
| **QUAL_CERT_NO** | varchar(100) | YES |  | NULL |  |
| **QUAL_CERT_VERIFY_STATUS** | varchar(20) | NO |  | UNVERIFIED |  |
| **QUAL_CERT_VERIFY_DT** | datetime | YES |  | NULL |  |
| **QUAL_CERT_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **PROFILE_PHOTO_ID** | varchar(20) | YES |  | NULL |  |
| **BIO_TEXT** | text | YES |  | NULL |  |
| **CREATE_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **UPDATE_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

## TB_FILE_MASTER

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FILE_ID** | varchar(20) | NO | PRI | NULL |  |
| **FILE_CATEGORY** | varchar(50) | NO |  | NULL |  |
| **GCS_BUCKET_NM** | varchar(100) | YES |  | bustaams-secure-data |  |
| **GCS_PATH** | varchar(255) | NO |  | NULL |  |
| **ORG_FILE_NM** | varchar(255) | YES |  | NULL |  |
| **FILE_EXT** | char(5) | YES |  | png |  |
| **FILE_SIZE** | bigint | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_INQUIRY

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **INQ_SEQ** | int | NO | PRI | NULL |  |
| **INQ_CATEGORY** | enum('BID_RES','PAY_REFUND','CANCEL_RULE','BUS_STAT','SUGGESTION') | NO |  | NULL |  |
| **TITLE** | varchar(255) | NO |  | NULL |  |
| **CONTENT** | text | NO |  | NULL |  |
| **ATTACH_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **REPLY_CONTENT** | text | YES |  | NULL |  |
| **REPLY_DT** | datetime | YES |  | NULL |  |
| **INQ_STAT** | enum('WAITING','COMPLETED') | YES |  | WAITING |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_PAYMENT_CARD

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **CARD_SEQ** | int | NO | PRI | NULL |  |
| **CARD_NICKNAME** | varchar(50) | YES |  | NULL |  |
| **CARD_NO_ENC** | varchar(255) | NO |  | NULL |  |
| **EXP_MONTH** | char(2) | NO |  | NULL |  |
| **EXP_YEAR** | char(2) | NO |  | NULL |  |
| **IS_PRIMARY** | enum('Y','N') | YES |  | N |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_SMS_LOG

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG_SEQ** | int | NO | PRI | NULL | auto_increment |
| **REQ_ID** | varchar(10) | YES |  | NULL |  |
| **SEND_CATEGORY** | enum('AUCTION','BIDDING','CONFIRM','DONE','TRAVELER_CANCEL','DRIVER_CANCEL','BUS_CHANGE','BUS_CANCEL','SIGN_UP','NEW_PASSWORD','OTHER','REQ_REG','NEW_BID','RES_CANCEL','ETC','JOIN','NEWPW') | NO |  | ETC |  |
| **SENDER_ID** | varchar(10) | YES |  | NULL |  |
| **RECEIVER_ID** | varchar(10) | YES |  | NULL |  |
| **RECEIVER_PHONE** | varchar(20) | NO |  | NULL |  |
| **MSG_CONTENT** | text | NO |  | NULL |  |
| **MSG_TYPE** | varchar(20) | NO |  | SMS |  |
| **SEND_STAT** | varchar(20) | NO |  | PENDING |  |
| **ERROR_MSG** | text | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |

## TB_SUBSCRIPTION

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **YYYYMM** | varchar(6) | NO | PRI | NULL |  |
| **FEE_POLICY** | enum('DRIVER_GENERAL','DRIVER_MIDDLE','DRIVER_HIGH') | NO |  | NULL |  |
| **BASIC_CNT** | int | NO |  | 0 |  |
| **USE_CNT** | int | NO |  | 0 |  |
| **REMAINING_CNT** | int | NO |  | 0 |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_TERMS_MASTER

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TERMS_SEQ** | int | NO | PRI | NULL | auto_increment |
| **TERMS_TYPE** | varchar(20) | NO |  | NULL |  |
| **TERMS_VERSION** | varchar(10) | NO |  | NULL |  |
| **REQUIRE_YN** | char(1) | YES |  | Y |  |
| **CONTENT_URL** | varchar(500) | YES |  | NULL |  |
| **ENFORCE_DT** | date | NO |  | NULL |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_TRIP_REVIEW

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RES_ID** | varchar(10) | NO | PRI | NULL |  |
| **REVIEW_SEQ** | int | NO | PRI | NULL |  |
| **WRITER_ID** | varchar(10) | NO |  | NULL |  |
| **DRIVER_ID** | varchar(10) | NO |  | NULL |  |
| **STAR_RATING** | tinyint | YES |  | 5 |  |
| **COMMENT_TEXT** | text | YES |  | NULL |  |
| **REPLY_TEXT** | text | YES |  | NULL |  |
| **REPLY_DT** | datetime | YES |  | NULL |  |
| **REG_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_USER

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **USER_ID** | varchar(256) | NO | UNI | NULL |  |
| **EMAIL** | varchar(100) | YES |  | NULL |  |
| **SNS_TYPE** | enum('NONE','KAKAO','NAVER') | YES |  | NONE |  |
| **USER_TYPE** | enum('TRAVELER','DRIVER','PARTNER') | NO |  | NULL |  |
| **PASSWORD** | varchar(255) | NO |  | NULL |  |
| **USER_NM** | varchar(255) | YES |  | NULL |  |
| **RESIDENT_NO_ENC** | varchar(255) | YES |  | NULL |  |
| **HP_NO** | varchar(255) | YES |  | NULL |  |
| **USER_IMAGE** | varchar(255) | YES |  | NULL |  |
| **PROFILE_IMG_PATH** | varchar(512) | YES |  | NULL |  |
| **PROFILE_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **SMS_AUTH_YN** | enum('Y','N') | YES |  | N |  |
| **RECOM_CODE** | varchar(20) | YES |  | NULL |  |
| **JOIN_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **USER_STAT** | enum('ACTIVE','LEAVE','BANNED','TEMPORARY') | YES |  | ACTIVE |  |
| **MOD_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |
| **RRN_ENC** | varchar(512) | YES |  | NULL |  |
| **LICENSE_TYPE** | varchar(50) | YES |  | NULL |  |
| **LICENSE_NO** | varchar(100) | YES |  | NULL |  |
| **LICENSE_SERIAL_NO** | varchar(100) | YES |  | NULL |  |
| **LICENSE_ISSUE_DT** | date | YES |  | NULL |  |
| **LICENSE_EXPIRY_DT** | date | YES |  | NULL |  |
| **QUAL_CERT_NO** | varchar(100) | YES |  | NULL |  |
| **QUAL_CERT_VERIFY_STATUS** | varchar(20) | NO |  | UNVERIFIED |  |
| **QUAL_CERT_VERIFY_DT** | datetime | YES |  | NULL |  |
| **QUAL_CERT_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **DRIVER_BIO** | text | YES |  | NULL |  |

## TB_USER_CANCEL_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **HIST_SEQ** | int | NO | PRI | NULL |  |
| **CANCEL_REASON_GRP_CD** | varchar(50) | NO |  | CANCEL_REASON |  |
| **CANCEL_REASON_DTL_CD** | varchar(50) | NO |  | NULL |  |
| **CANCEL_REASON_TEXT** | text | YES |  | NULL |  |
| **REASON_DOC_FILE_NM** | varchar(500) | YES |  | NULL |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_USER_CANCEL_MANAGE

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **CANCEL_CNT** | int | NO |  | 0 |  |
| **CANCEL_BUS_DRIVER_CNT** | int | NO |  | 0 |  |
| **CANCEL_TRAVELER_ALL_CNT** | int | NO |  | 0 |  |
| **CANCEL_TRAVELER_PARTIAL_BUS_CNT** | int | NO |  | 0 |  |
| **TRADE_RESTRICT_YN** | char(1) | NO |  | N |  |
| **TRADE_RESTRICT_START_DT** | datetime | YES |  | NULL |  |
| **TRADE_RESTRICT_END_DT** | datetime | YES |  | NULL |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_USER_DEVICE_TOKEN

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **FCM_TOKEN** | varchar(512) | NO |  | NULL |  |
| **CLIENT_KIND** | varchar(20) | NO |  | web |  |
| **REG_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| **REG_ID** | varchar(10) | YES |  | NULL |  |
| **MOD_DT** | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| **MOD_ID** | varchar(10) | YES |  | NULL |  |

## TB_USER_TERMS_HIST

| 컬럼명 | 타입 | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CUST_ID** | varchar(10) | NO | PRI | NULL |  |
| **TERMS_HIST_SEQ** | int | NO | PRI | NULL |  |
| **TERMS_TYPE** | enum('SERVICE','TRAVELER_SERVICE','DRIVER_SERVICE','PRIVACY','MARKETING','PARTNER_CONTRACT') | NO |  | NULL |  |
| **TERMS_VER** | varchar(10) | NO |  | NULL |  |
| **AGREE_YN** | enum('Y','N') | YES |  | Y |  |
| **MKT_SMS_YN** | enum('Y','N') | YES |  | N |  |
| **MKT_PUSH_YN** | enum('Y','N') | YES |  | N |  |
| **MKT_EMAIL_YN** | enum('Y','N') | YES |  | N |  |
| **MKT_TEL_YN** | enum('Y','N') | YES |  | N |  |
| **SIGN_FILE_ID** | varchar(20) | YES |  | NULL |  |
| **AGREE_DT** | datetime | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

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
- **제한**: 누적 취소 횟수가 **3회** 이상일 경우 서비스 이용 제한.
- **체크 시점**: 로그인 시 및 주요 서비스(여행 등록, 입찰 참여) 진입 시.
- **제한 내용**:
  - **여행자**: 새로운 여행 예약 등록 불가.
  - **버스기사**: 실시간 입찰 참여 불가.
- **관련 테이블**: `TB_USER_CANCEL_MANAGE`
  - 여행자: `CANCEL_TRAVELER_ALL_CNT` 체크.
  - 버스기사: `CANCEL_BUS_DRIVER_CNT` 체크.
