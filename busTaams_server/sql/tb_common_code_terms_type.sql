-- TB_COMMON_CODE — TB_TERMS_MASTER / TB_USER_TERMS_HIST 의 TERMS_TYPE ENUM 값과 동일한 상세코드 등록
-- GRP_CD: TERMS_TYPE / DTL_CD: ENUM 리터럴과 동일 (앱·서버에서 코드명·정렬 참조용)
-- 중복 등록 방지: INSERT IGNORE (이미 있으면 건너뜀)

INSERT IGNORE INTO `TB_COMMON_CODE` (
  `GRP_CD`,
  `DTL_CD`,
  `CD_NM_KO`,
  `CD_NM_EN`,
  `CD_FNUM`,
  `CD_TNUM`,
  `USE_YN`,
  `DISP_ORD`,
  `CD_DESC`
) VALUES
  ('TERMS_TYPE', 'SERVICE',           '서비스 이용(공통)',           'Service (common)',           0.000, 0.000, 'Y', 1,
   'TB_TERMS_MASTER·TB_USER_TERMS_HIST.TERMS_TYPE — 전 회원 공통 서비스 이용약관'),
  ('TERMS_TYPE', 'TRAVELER_SERVICE',  '여행자 회원·서비스',          'Traveler service',           0.000, 0.000, 'Y', 2,
   '여행자 회원 대상 약관·서비스 조건'),
  ('TERMS_TYPE', 'DRIVER_SERVICE',  '버스기사(운전자) 서비스',     'Driver service',             0.000, 0.000, 'Y', 3,
   '버스기사(운전자) 회원 대상 약관·서비스 조건'),
  ('TERMS_TYPE', 'PRIVACY',           '개인정보 처리방침',          'Privacy policy',             0.000, 0.000, 'Y', 4,
   '개인정보 수집·이용·제공·파기 등'),
  ('TERMS_TYPE', 'MARKETING',         '마케팅·광고 수신 동의',       'Marketing consent',          0.000, 0.000, 'Y', 5,
   '이벤트·혜택·광고성 정보 수신(선택)'),
  ('TERMS_TYPE', 'PARTNER_CONTRACT',  '영업(파트너) 계약',          'Partner contract',           0.000, 0.000, 'Y', 6,
   '영업 회원·파트너 계약 조건');
