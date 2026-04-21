-- 기존 TB_COMMON_CODE가 utf8mb4_0900_ai_ci 등으로 생성된 경우,
-- GRP_CD/DTL_CD를 utf8mb4_unicode_ci로 맞춤 (신규 server.js ensureTbCommonCodeTable 정의와 동일).
-- 다른 테이블이 TB_COMMON_CODE(GRP_CD,DTL_CD)를 FK로 참조하면 이 ALTER는 실패할 수 있음 — 현재 프로젝트 DDL 기준으로는 없음.

SET NAMES utf8mb4;

ALTER TABLE `TB_COMMON_CODE`
  MODIFY `GRP_CD` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `DTL_CD` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
