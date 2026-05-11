-- TB_COMMON_CODE — 월 청약 기본 건수 (GRP_CD=FEE_POLICY_CNT, DTL_CD=TB_MOM_MEMBER.FEE_POLICY)
-- 선행: TB_COMMON_CODE 테이블 존재, CD_FNUM 컬럼 있음

SET NAMES utf8mb4;

INSERT IGNORE INTO `TB_COMMON_CODE` (`GRP_CD`, `DTL_CD`, `CD_NM_KO`, `CD_DESC`, `USE_YN`, `DISP_ORD`, `CD_FNUM`) VALUES
('FEE_POLICY_CNT', 'DRIVER',           '기본(미분류)', '월 청약 기본 건수', 'Y', 1, 5),
('FEE_POLICY_CNT', 'DRIVER_GENERAL',   '일반',         '월 청약 기본 건수', 'Y', 2, 5),
('FEE_POLICY_CNT', 'DRIVER_MIDDLE',    '중급',         '월 청약 기본 건수', 'Y', 3, 10),
('FEE_POLICY_CNT', 'DRIVER_HIGH',      '상급',         '월 청약 기본 건수', 'Y', 4, 15);
