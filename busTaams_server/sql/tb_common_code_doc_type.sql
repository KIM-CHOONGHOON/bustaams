-- TB_COMMON_CODE — 서류 구분 (TB_DRIVER_DOCS.DOC_TYPE 등 참조)
-- GRP_CD: DOC_TYPE
-- DTL_CD: LICENSE, QUALIFICATION, APTITUDE, BIZ_REG, TRANSPORT_PERMIT, INSURANCE
-- COMMENT 요지: 서류 구분 (LICENSE:운전면허증, QUALIFICATION:버스운전자격증, APTITUDE:운전적성정밀검사, BIZ_REG:사업자등록증, TRANSPORT_PERMIT:여객자동차운송사업허가증, INSURANCE:보험가입증명서)

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
  ('DOC_TYPE', 'LICENSE',           '운전면허증',                    'Driver license',                0.000, 0.000, 'Y', 1,
   'LICENSE — 운전면허증'),
  ('DOC_TYPE', 'QUALIFICATION',     '버스운전자격증',                'Bus driver qualification',      0.000, 0.000, 'Y', 2,
   'QUALIFICATION — 버스운전자격증'),
  ('DOC_TYPE', 'APTITUDE',          '운전적성정밀검사',              'Driving aptitude test',         0.000, 0.000, 'Y', 3,
   'APTITUDE — 운전적성정밀검사'),
  ('DOC_TYPE', 'BIZ_REG',           '사업자등록증',                  'Business registration',         0.000, 0.000, 'Y', 4,
   'BIZ_REG — 사업자등록증'),
  ('DOC_TYPE', 'TRANSPORT_PERMIT',  '여객자동차운송사업허가증',      'Passenger transport permit',    0.000, 0.000, 'Y', 5,
   'TRANSPORT_PERMIT — 여객자동차운송사업허가증'),
  ('DOC_TYPE', 'INSURANCE',         '보험가입증명서',                'Insurance certificate',         0.000, 0.000, 'Y', 6,
   'INSURANCE — 보험가입증명서');
