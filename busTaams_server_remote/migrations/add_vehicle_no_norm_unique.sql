-- TB_BUS_DRIVER_VEHICLE 정규화 차량번호(공백/하이픈 제거) 자동 생성 컬럼 및 UNIQUE 제약 추가
-- 적용 대상: MySQL 8.0+ (bustaams_db)

ALTER TABLE `TB_BUS_DRIVER_VEHICLE`
  ADD COLUMN `VEHICLE_NO_NORM` varchar(20)
  GENERATED ALWAYS AS (
    NULLIF(REPLACE(REPLACE(REPLACE(TRIM(`VEHICLE_NO`), ' ', ''), '-', ''), '\t', ''), '')
  ) STORED COMMENT '공백/하이픈 제거 정규화 차량번호 (중복 방지 UNIQUE 키)'
  AFTER `VEHICLE_NO`,
  ADD UNIQUE KEY `UK_BUS_VEHICLE_NO_NORM` (`VEHICLE_NO_NORM`);
