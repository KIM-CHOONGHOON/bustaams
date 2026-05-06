-- =============================================================================
-- TB_DRIVER_DOCS.DOC_TYPE ENUM 확장 (약관·계약류 추가)
-- 실행 전 백업·스테이징 검증 권장.
-- 문자셋·콜레이션: 스키마가 utf8mb4일 때 그대로 사용.
--
-- MySQL ENUM 멤버에는 DDL상 개별 COMMENT를 붙일 수 없으므로, COLUMN COMMENT와
-- 본 헤더에 ENUM 값별 한글 설명을 전부 명시함.
-- =============================================================================
--
-- [DOC_TYPE ENUM — 값별 한글 설명]
--
-- LICENSE               운전면허증
-- QUALIFICATION         버스운전 자격증(운송종사 자격 증빙)
-- APTITUDE              운전적성 정밀검사 등 적성 관련 증빙
-- BIZ_REG               사업자등록증
-- TRANSPORT_PERMIT      여객자동차운송사업 허가 증빙
-- INSURANCE             보험 가입 증명(보험 증명서류)
-- DRIVER_PHOTO          기사(운전자) 프로필·신원 사진
-- VEHICLE_PHOTO         차량 외관·등록 차량 관련 사진 자료
-- TERMS_OF_USE          이용약관(서비스 이용 약관 문서)
-- PRIVACY_CONSENT       개인정보 수집·이용 및 동의(개인정보수집 및 동의)
-- MARKETING_CONSENT    마케팅 정보 수신 동의(마케팅수신정보 관련 동의)
-- DRIVER_CONTRACT       버스기사(운전원) 회원 계약서
-- TRAVELER_CONTRACT     여행자 회원 가입 계약서
-- PARTNER_CONTRACT      영업회원 회원 계약서(파트너·판매)
-- TERMS_INTEGRATED      통합이용약관(서비스·버전 통합 약관)
--
-- =============================================================================

ALTER TABLE `TB_DRIVER_DOCS`
  MODIFY COLUMN `DOC_TYPE` ENUM(
    'LICENSE',
    'QUALIFICATION',
    'APTITUDE',
    'BIZ_REG',
    'TRANSPORT_PERMIT',
    'INSURANCE',
    'DRIVER_PHOTO',
    'VEHICLE_PHOTO',
    'TERMS_OF_USE',
    'PRIVACY_CONSENT',
    'MARKETING_CONSENT',
    'DRIVER_CONTRACT',
    'TRAVELER_CONTRACT',
    'PARTNER_CONTRACT',
    'TERMS_INTEGRATED'
  ) NOT NULL COMMENT
  '[DOC_TYPE 한글] LICENSE→운전면허증; QUALIFICATION→버스운전 자격증(운송종사); APTITUDE→운전적성 검사 등 증빙; BIZ_REG→사업자등록증; TRANSPORT_PERMIT→여객운송사업허가; INSURANCE→보험가입증명; DRIVER_PHOTO→기사 프로필·신원 사진; VEHICLE_PHOTO→차량 사진; TERMS_OF_USE→이용약관; PRIVACY_CONSENT→개인정보 수집·이용 동의(개인정보수집및동의); MARKETING_CONSENT→마케팅 수신 동의(마케팅수신정보); DRIVER_CONTRACT→버스기사 계약서; TRAVELER_CONTRACT→여행자 가입 계약서; PARTNER_CONTRACT→영업 회원 계약서; TERMS_INTEGRATED→통합 이용약관';
-- TB_COMMON_CODE(GRP_CD=DOC_TYPE, DTL_CD=위 ENUM 상수와 동일) 시드는 별도 INSERT로 반영.
