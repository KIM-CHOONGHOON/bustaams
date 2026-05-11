-- TB_TERMS_MASTER.TERMS_TYPE
-- MySQL은 ENUM 각 값마다 별도 COMMENT를 달 수 없고, 컬럼 COMMENT에 값별 의미를 적는 방식이 일반적입니다.

-- [권장] TERMS_TYPE이 ENUM('SERVICE',…,'PARTNER_CONTRACT')인 경우 — TB_USER_TERMS_HIST.TERMS_TYPE과 동일 권장
ALTER TABLE `TB_TERMS_MASTER`
  MODIFY COLUMN `TERMS_TYPE` enum(
    'SERVICE',
    'TRAVELER_SERVICE',
    'DRIVER_SERVICE',
    'PRIVACY',
    'MARKETING',
    'PARTNER_CONTRACT'
  ) NOT NULL COMMENT '약관 구분. SERVICE=서비스 이용(공통); TRAVELER_SERVICE=여행자 회원·서비스; DRIVER_SERVICE=버스기사(운전자) 서비스; PRIVACY=개인정보 처리방침; MARKETING=마케팅·광고 수신 동의; PARTNER_CONTRACT=영업(파트너) 계약';

-- 컬럼이 varchar(20)로만 쓰는 DB: ENUM으로 바꾸기 전, 기존 값이 위 6가지로 매핑 가능한지 먼저 점검
-- varchar 유지 + 설명만 갱신 예:
-- ALTER TABLE `TB_TERMS_MASTER`
--   MODIFY COLUMN `TERMS_TYPE` varchar(20) NOT NULL COMMENT
-- '약관 구분. SERVICE, TRAVELER_SERVICE, DRIVER_SERVICE, PRIVACY, MARKETING, PARTNER_CONTRACT — 각 값 의미는 동일';
