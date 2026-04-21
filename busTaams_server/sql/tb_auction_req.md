# TB_AUCTION_REQ

역경매(견적 요청) 마스터 테이블. DDL 원본은 동일 디렉터리의 `tb_auction_req.sql`을 참고합니다.

## DATA_STAT (여행자 견적 요청 데이터 상태)

| DB 값 | 의미 |
|--------|------|
| `AUCTION` | 여행자 경매 등록 (입찰 가능 구간의 시작) |
| `BIDDING` | 버스기사 입찰 등록 |
| `CONFIRM` | 예약 금액 결제 완료 |
| `DONE` | 버스 운행 정상 종료 |
| `TRAVELER_CANCEL` | 여행자 경매 취소 |
| `DRIVER_CANCEL` | 버스기사 입찰 취소 |

### DDL 발췌

```sql
`DATA_STAT` ENUM(
  'AUCTION',
  'BIDDING',
  'CONFIRM',
  'DONE',
  'TRAVELER_CANCEL',
  'DRIVER_CANCEL'
) NOT NULL DEFAULT 'BIDDING' COMMENT '여행자 견적 요청 데이터 상태',
```

## 기존 DB 마이그레이션 참고

컬럼명이 `REQ_STAT` 등이던 환경에서는 `ALTER TABLE TB_AUCTION_REQ RENAME COLUMN REQ_STAT TO DATA_STAT`(MySQL 8+) 또는 `CHANGE COLUMN` 으로 맞춘 뒤 ENUM·기본값을 적용한다.
