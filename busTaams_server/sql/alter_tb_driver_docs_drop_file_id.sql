-- TB_DRIVER_DOCS: FILE_ID 컬럼 및 UNIQUE 인덱스 UK_DOCS_FILE_ID 제거
-- 실행 전: 다른 테이블·뷰·FK가 FILE_ID 또는 본 UNIQUE를 참조하는지 확인 필요.
--
-- 인덱스를 먼저 제거한 뒤 컬럼 삭제(MySQL 단일 ALTER에서 순서 처리).

ALTER TABLE `TB_DRIVER_DOCS`
  DROP INDEX `UK_DOCS_FILE_ID`,
  DROP COLUMN `FILE_ID`;
