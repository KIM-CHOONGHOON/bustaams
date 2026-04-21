-- TB_COMMON_CODE — 취소사유 코드 (GRP_CD=CANCEL_REASON)
-- 선행: TB_COMMON_CODE 테이블 존재 (server.js ensureTbCommonCodeTable 등)
-- TB_USER_CANCEL_HIST.CANCEL_REASON_GRP_CD / CANCEL_REASON_DTL_CD 가 이 행들을 논리적으로 참조함.

SET NAMES utf8mb4;

INSERT INTO `TB_COMMON_CODE` (`GRP_CD`, `DTL_CD`, `CD_NM_KO`, `CD_DESC`, `USE_YN`, `DISP_ORD`) VALUES
('CANCEL_REASON', '01', '본인 사망', NULL, 'Y', 1),
('CANCEL_REASON', '02', '차량 파손 (운행 불가)', NULL, 'Y', 2),
('CANCEL_REASON', '03', '법정 구속 (경찰서 및 검찰청 구인 포함)', NULL, 'Y', 3),
('CANCEL_REASON', '04', '직계존비속(본인 및 배우자 부모, 자녀 및 친 손자녀 포함) 및 배우자 사망', NULL, 'Y', 4),
('CANCEL_REASON', '05', '질병 또는 사고에 의한 입원', NULL, 'Y', 5),
('CANCEL_REASON', '06', '사고에 의한 당일 통원치료', NULL, 'Y', 6)
ON DUPLICATE KEY UPDATE
  `CD_NM_KO` = VALUES(`CD_NM_KO`),
  `CD_DESC` = VALUES(`CD_DESC`),
  `USE_YN` = VALUES(`USE_YN`),
  `DISP_ORD` = VALUES(`DISP_ORD`);
