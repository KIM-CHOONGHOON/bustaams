-- TB_PAYMENT_CARD: 빌링키·발급 카드 명칭 컬럼 추가 (1회 실행)
-- 이미 일부 컬럼만 있는 경우: 해당 ADD 줄만 남기거나, 중복 오류 나는 줄은 제거 후 실행.

SET NAMES utf8mb4;

ALTER TABLE `TB_PAYMENT_CARD`
  ADD COLUMN `CARD_BILLING_KEY_ENC` varchar(512) DEFAULT NULL
    COMMENT 'PG 빌링키·결제토큰 등 AES-GCM 암호문 (미연동·레거시 카드만 저장 시 NULL)'
    AFTER `CARD_NO_ENC`,
  ADD COLUMN `ORIGINAL_CARD_NAME` varchar(50) DEFAULT NULL
    COMMENT '발급 카드 명칭'
    AFTER `CARD_BILLING_KEY_ENC`;
