-- TB_COMMON_CODE — 기사(드라이버) 취소 사유 전용
-- GRP_CD: DRIVER_CANCEL_REASON (8건)
-- DTL_CD: 영문 식별자(varchar(30)) / CD_NM_KO: 한글명
-- 선행: TB_COMMON_CODE 테이블 존재 (server.js ensureTbCommonCodeTable 등)

SET NAMES utf8mb4;

INSERT INTO `TB_COMMON_CODE` (`GRP_CD`, `DTL_CD`, `CD_NM_KO`, `CD_DESC`, `USE_YN`, `DISP_ORD`) VALUES
('DRIVER_CANCEL_REASON', 'CHANGE_OF_MIND', '단순변심', NULL, 'Y', 1),
('DRIVER_CANCEL_REASON', 'DEATH_SELF', '본인 사망', NULL, 'Y', 2),
('DRIVER_CANCEL_REASON', 'VEHICLE_DAMAGE', '차량 파손 (운행 불가)', NULL, 'Y', 3),
('DRIVER_CANCEL_REASON', 'LEGAL_CUSTODY', '법정 구속 (경찰서 및 검찰청 구인 포함)', NULL, 'Y', 4),
('DRIVER_CANCEL_REASON', 'DEATH_KIN_SPOUSE', '직계존비속(본인 및 배우자 부모, 자녀 및 친 손자녀 포함) 및 배우자 사망', NULL, 'Y', 5),
('DRIVER_CANCEL_REASON', 'HOSPITALIZATION', '질병 또는 사고에 의한 입원', NULL, 'Y', 6),
('DRIVER_CANCEL_REASON', 'OUTPATIENT_SAME_DAY', '사고에 의한 당일 통원치료', NULL, 'Y', 7),
('DRIVER_CANCEL_REASON', 'OTHER', '이외', NULL, 'Y', 8)
ON DUPLICATE KEY UPDATE
  `CD_NM_KO` = VALUES(`CD_NM_KO`),
  `CD_DESC` = VALUES(`CD_DESC`),
  `USE_YN` = VALUES(`USE_YN`),
  `DISP_ORD` = VALUES(`DISP_ORD`),
  `MOD_DT` = CURRENT_TIMESTAMP;
