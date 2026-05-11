-- TB_MOM_MEMBER.FEE_POLICY — ENUM 에 'DRIVER' 추가
-- 기존 값 DRIVER_GENERAL / DRIVER_MIDDLE / DRIVER_HIGH 는 새定의에 포함되어 행 데이터는 그대로 유효합니다.
--
-- 참고: 프로젝트 설계 문서 테이블명은 TB_MON_MEMBER 입니다.
--       실제 스키마가 TB_MON_MEMBER 이면 아래 첫 줄의 테이블명만 교체하세요.

ALTER TABLE TB_MOM_MEMBER
  MODIFY COLUMN FEE_POLICY ENUM(
    'DRIVER',
    'DRIVER_GENERAL',
    'DRIVER_MIDDLE',
    'DRIVER_HIGH'
  ) NOT NULL COMMENT '요금 정책';
