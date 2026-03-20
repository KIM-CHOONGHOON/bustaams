# bustaams 홈페이지 설계 및 구현 문서

React를 기반으로 구축된 `busTaams_web` 프론트엔드의 메인 홈페이지 구성 내역입니다. **[`ARCHITECTURE.md` - DESIGN 표준 (Web & App 공통)]** 가이드라인("The Radiant Traveler")을 완벽히 엄수하여 디자인 구조가 전면 개편되었습니다.

## 1. 프론트엔드 환경 및 기술 스택
- **기반 환경:** React (Vite 빌드 도구 사용)
- **스타일링:** Tailwind CSS v3
- **글꼴 (Typography):** `Plus Jakarta Sans` (Display/Headlines), `Pretendard`/`Manrope` (Body/Labels)

## 2. 디자인 표준 (Design System) 반영 내역
- **No-Line Rule 적용:** 1px의 솔리드 테두리(Border) 레이아웃을 전면 금지하고, 대신 `surface`, `surface-container-low`, `surface-lowest` 등 명도 차이를 이용한 표면(Surface) 계층화로 UI의 깊이(Depth)를 표현했습니다.
- **색상 토큰 (Color Strategy):** Primary(Teal 계열: `#00685f`), Secondary(Orange 계열: `#9d4300`) 기반의 전문적이고 활기찬 톤 앤 매너(Tonal Energy)를 적용했습니다. CTA(주요 동작 버튼) 등에는 입체감을 위해 135도 그라데이션이 적용되었습니다.
- **Glass & Gradient:** 투명도 80%와 백드롭 블러(`backdrop-blur`)를 활용한 최상단 내비게이션 바(Header)를 구현했습니다.
- **Ambient Shadow:** 부드럽고 퍼지는 커스텀 그림자(`shadow-ambient`)를 모든 카드 및 버튼 레이아웃에 일괄 적용했습니다.

## 3. React 컴포넌트 구조 (`src/App.jsx`)
1. **`Header`**: 글래스모피즘(Glassmorphism) 효과 시스템 적용. "이용 고객 전용", "기사님 전용" 등의 메뉴 분기 처리가 포함된 최상단 고정 네비게이션.
2. **`Hero`**: 홈 화면 진입 시 노출되는 메인 배너 (`display-lg`급 다이나믹 타이포그래피 적용).
3. **`Features`**: 카드형(`surface-lowest`) 컨테이너를 바탕색(`surface`) 위에 띄워 입체감을 강조한 강점 소개 영역.
4. **`SpringSpecial`**: 그라데이션 CTA 버튼 및 라벨 뱃지를 활용한 프로모션 영역.
5. **`Footer`**: 여백(Whitespace)을 적극 활용해 구분선 없이도 시각적 분리를 이루어낸 하단 정보 영역.

## 4. 로컬 구동 방법
```bash
cd busTaams_web
npm run dev
```

## 5. 회사 로고(정적 에셋) 연동 및 구조 개편
- **로고 분할 출력 최적화**: 단순히 하나의 통짜 이미지를 쓰던 구조에서 벗어나, 심볼 마크인 `bustaams_bus_logo.png`를 왼쪽에 큼직하게 띄우고 그 우측에 회사명 `bustaams_name_logo.png`를 나란히 연결하여 전문적인 브랜드 로고 형태를 갖추었습니다.
- **`src/assets/images/` 에셋 재활용**: 아이콘 로고는 1.5배 확대한 시원한 크기(데스크탑 72px)로 출력시키면서, 우측 텍스트 네임 로고(`h-[40px]`)와 완벽한 중앙 정렬 조화를 이루도록 프론트엔드 스타일을 고도화했습니다.
