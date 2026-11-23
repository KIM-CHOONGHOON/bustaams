-- API 멱등성(중복 재시도 방지) 관리 테이블 생성
-- 서버 재시작 및 다중 프로세스 환경에서도 동일 요청 식별 키(Idempotency-Key)와 요청 본문 해시(SHA-256)를 DB 트랜잭션 단위로 보장

CREATE TABLE IF NOT EXISTS `TB_API_IDEMPOTENCY` (
  `CUST_ID` varchar(10) NOT NULL COMMENT '요청 사용자 CUST_ID',
  `API_NAME` varchar(50) NOT NULL COMMENT 'API 구분명 (예: DRIVER_QUICK_SETUP)',
  `IDEMPOTENCY_KEY` varchar(100) NOT NULL COMMENT '클라이언트 요청 식별 키',
  `REQUEST_HASH` char(64) NOT NULL COMMENT '요청 입력값 및 파일 버퍼 SHA-256 해시',
  `RESPONSE_JSON` json NOT NULL COMMENT '저장된 응답 JSON',
  `REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '처리 완료 일시',
  PRIMARY KEY (`CUST_ID`, `API_NAME`, `IDEMPOTENCY_KEY`),
  KEY `IDX_IDEMPOTENCY_REG_DT` (`REG_DT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 멱등성(중복 재시도 방지) 관리 테이블';
