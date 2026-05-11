-- TB_COMMON_CODE — 회원등급·월 회비 표시 (GRP_CD=FEE_POLICY, DTL_CD 기사 등급)
-- 기사 프로필 모달 콤보(`GET /api/driver/fee-policy-options`)와 월회비 산정에 사용.
-- CD_FNUM: 월 회비 금액(원) 참고값. FEE_POLICY_CNT 의 동일 DTL_CD 와 짝을 이룸.

SET NAMES utf8mb4;

INSERT IGNORE INTO `TB_COMMON_CODE` (`GRP_CD`, `DTL_CD`, `CD_NM_KO`, `CD_DESC`, `USE_YN`, `DISP_ORD`, `CD_FNUM`) VALUES
('FEE_POLICY', 'DRIVER',           '기본(미분류)', '월 회비(참고)', 'Y', 1, 33000),
('FEE_POLICY', 'DRIVER_GENERAL',   '일반',         '월 회비(참고)', 'Y', 2, 33000),
('FEE_POLICY', 'DRIVER_MIDDLE',    '중급',         '월 회비(참고)', 'Y', 3, 55000),
('FEE_POLICY', 'DRIVER_HIGH',      '상급',         '월 회비(참고)', 'Y', 4, 77000);
