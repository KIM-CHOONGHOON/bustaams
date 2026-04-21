/** TB_AUCTION_REQ_BUS.BUS_TYPE_CD → 표시 라벨 (공통코드 BUS_TYPE) */
export function getVehicleLabel(type) {
  if (!type) return '—';
  const map = {
    STANDARD_28: '일반 고속 (45인승)',
    STANDARD_45: '일반 고속 (45인승)',
    PREMIUM_45: '우등 고속 (28인승)',
    PREMIUM_28: '우등 고속 (28인승)',
    GOLD_21: '프리미엄 골드 (21인승)',
    VVIP_16: 'V-VIP (16인승)',
    MINI_25: '중형/미니 (25인승)',
    VAN_11: '대형 밴 (11인승)',
  };
  return map[type] || type;
}

/** 목록·요약 한 줄 */
export function formatAuctionReqBusesLine(buses) {
  if (!Array.isArray(buses) || buses.length === 0) return '—';
  return buses
    .map((b) => {
      const label = getVehicleLabel(b.busTypeCd);
      const n = Number(b.reqBusCnt) || 0;
      return `${label} ${n}대`;
    })
    .join(', ');
}
