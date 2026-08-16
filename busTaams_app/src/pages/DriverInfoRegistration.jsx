import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import Swal from 'sweetalert2';
import { getDriverProfile, updateDriverProfile, request, sendAuthCode, verifyAuthCode } from '../api';
import { validateRRN } from '../utils/validation';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';
import { compressImage } from '../utils/image';

const TERMS_CONTENTS = {
    service: `버스탐스 서비스 이용 통합 이용약관

제1조 (목적)
본 약관은 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스탐스(BUSTAAMS)”(이하 “플랫폼”)를 통해 제공되는 버스 중개 서비스와 관련하여, 서비스를 이용하는 여행자(이하 “이용자”)와 플랫폼에 입점한 버스기사(이하 “파트너”) 및 “회사” 간의 권리, 의무, 책임사항, 서비스 이용 규칙 및 절차를 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. 플랫폼: “회사”가 버스 중개 서비스를 제공하기 위해 운영하는 웹사이트 및 모바일 애플리케이션을 말합니다.
2. 이용자(여행자): 플랫폼에서 버스 대여 및 운행 서비스를 이용하기 위해 여행 일정을 제시하고, 파트너(버스기사)의 여행 일정 수락 건에 대해 검토 및 최종 승인을 수행하는 회원을 말합니다. 단, 이용자는 여행 일정 승인 시 버스 이용 전체 금액의 일정 비율을 데이터 이용료로 결제하는 회원을 포함합니다.
3. 파트너(버스기사): 플랫폼의 엄격한 자격 검증을 거쳐 정회원으로 입점하여, 이용자의 청약을 확인하고 운행 서비스를 제공하는 회원을 말합니다.
4. 즉시 매칭 시스템: 이용자의 정보 이용료 결제 즉시 계약이 확정된 것으로 간주하고 푸시 메시지(Push Message)를 통해 상호 연락처가 실시간 공개되는 특허 기반의 프로세스를 말합니다.

제3조 (파트너 회원 체계 및 월회원 등급)
1. 파트너는 플랫폼 가입 시 버스타암스가 승인하는 멤버십 등급(클래스)을 선택하여 이용할 수 있으며, 등급에 따른 월회비 및 혜택은 다음과 같습니다.
[등급 (Class) | 월회비 (부가세 포함) | 월간 기본 청약 한도 | 한도 내 데이터 이용료 | 한도 초과 시 데이터 이용료]
- 브론즈 (Bronze): 300,000원 | 월 10건 | 2.2% | 6.6% (초과 건당)
- 골드 (Gold): 500,000원 | 월 20건 | 2.2% | 6.6% (초과 건당)
- 플래티넘 (Platinum): 700,000원 | 월 30건 | 2.2% | 6.6% (초과 건당)
2. 이용 기간: 모든 요금제는 매월 1일 선납을 원칙으로 하며, 중도 가입 시 일할 계산 정책은 적용되지 않습니다. (단, 신규 가입 파트너의 경우 3일까지 본사 승인을 거친 경우에 한해 가입 승인을 진행합니다.)
3. 초과 부과: 기본 입찰 참여 횟수를 초과한 건에 대해서는 건당 이용 금액 전체의 6.6%가 데이터 이용료로 추가 부과됩니다.
4. 중도 해지: 월중 해지 요청 시 잔여 일수를 계산하여 규정에 따라 정산 후 환불이 진행됩니다. 환불 잔여 일수당 금액은 다음과 같습니다. (브론즈 10,000원 | 골드 17,000원 | 플래티넘 27,000원)

제4조 (이용요금 결제 및 즉시 매칭 로직)
1. 청약 등록: 이용자가 플랫폼에 여행 코스, 탑승 인원, 일정 등을 업로드하여 운행 청약을 개시합니다.
2. 매칭 성립 및 결제: 파트너가 제시한 가격 제안 중 이용자가 하나를 선택하여 데이터 이용료 결제를 완료하는 시점에 즉시 매칭이 완료됩니다.
3. 연락처 즉시 공개: 결제 완료 즉시 양측에 연락처 및 채팅방이 실시간 공개됩니다. (시스템 배치 처리 등을 거치지 않는 즉각적인 연결을 보장합니다.)

제5조 (자동 서비스 완료 처리 및 정산)
1. 자동 완료 (Batch): 운행 완료 처리 기준, 운행 종료일 경과 후 1일 차 새벽(00:00:01)에 별도의 취소 요청이 없으면 시스템이 자동으로 '서비스 완료' 처리를 수행합니다.
2. 정산일: 모든 확정 대금은 월말 기준으로 정산하여 익월 5일(파트너)에 지정된 계좌로 지급됩니다.
3. 1원 인증 필수: 정산 계좌의 안전성과 도용 방지를 위하여 포트원(PortOne) 등 PG API 및 은행망을 통한 '1원 인증' 및 소유주 실명 검증이 완료된 계좌로만 정산이 가능합니다.

제6조 (계약 파기 위약금 및 이용자 보호 의무)
1. 파트너 귀책 취소: 계약 확정 후 파트너의 일방적인 변심으로 배차를 취소하거나 운행을 거부하는 경우, 파트너는 위약금 500,000원을 회사에 납부해야 합니다.
2. 이용자 보호 조치: 파트너의 노쇼(No-show) 또는 취소 발생 시, 회사는 이용자에게 계약금의 4배 전액을 위약금으로 즉시 지급하거나, 동급 이상의 대체 차량 수급을 이행합니다. (대체 차량 제공 완료 시 위약금 지급 의무는 면제됩니다.)
3. 취소 면제: 본인/가족 사망, 차량 파손, 법정 구속, 입원 등 관련 법령 및 특약에서 인정한 객관적 사유를 당일 기준 서류로 입증할 경우 패널티 및 위약금이 면제됩니다.

제7조 (품질 관리 및 패널티 정책)
1. 노쇼 및 패널티: 사유 없는 취소 및 노쇼 발생 시 1회 1주일, 2회 2주일간 신규 청약 입찰이 제한되며, 3회 누적 시 강제 탈퇴 및 계약 해지가 진행됩니다. (위약금 납부 또는 대체 차량 수급으로 이용자 보호 의무를 완료한 경우 패널티는 누적되지 않습니다.)
2. 직거래 제한: 수수료 회피를 위한 직거래 유도 적발 시 즉시 회원 자격이 상실됩니다.

제8조 (전자 서명 및 법적 효력)
1. 가입 시 서명: 이용자와 파트너는 가입 및 서비스 이용 전, 플랫폼에서 제공하는 전자서명 패드를 통해 서명을 마쳐야 합니다.
2. 법적 증빙: 해당 전자 서명은 전자문서법에 따라 공인인증서와 동일한 법적 효력을 지니며 계약 이행의 증빙 자료로 자동 보관됩니다.

제9조 (개인정보 보호 및 보안)
1. 1원 인증: 등록한 계좌의 실존 여부 및 소유주 실명 일치 여부를 실시간 검증합니다.
2. 전자서명 보안: 이용자와 파트너가 직접 입력한 서명 이미지는 고도로 암호화되어 저장됩니다.
3. 정보 접근 통제: 계약 미확정 상태에서 양측의 개인정보(연락처, 상세 주소 등) 접근이 차단됩니다.

제10조 (계약 기간 및 해지)
본 계약은 파트너의 가입 승인일로부터 효력이 발생하며, 회원 탈퇴 또는 강제 해지 시까지 유효합니다.

제11조 (권리 의무의 양도 금지)
회원은 본 계약상의 권리와 의무를 타인에게 양도하거나 담보로 제공할 수 없습니다.

제12조 (개인정보 보호 및 상호 정보 유출 금지)
서비스 과정에서 습득한 이용자 및 파트너의 개인 정보는 운행 목적 이외로 사용할 수 없으며 외부 유출 시 모든 책임을 집니다.

제13조 (신의성실 및 손해배상)
1. 양 당사자는 본 계약의 조항을 신의성실에 따라 이행하여야 합니다.
2. 일방의 귀책사유로 인해 상대방에게 손해가 발생한 경우 귀책사유 있는 당사자는 그 손해를 배상하여야 합니다.

제14조 (분쟁 해결 및 관할 법원)
1. 플랫폼 이용 및 운행 서비스와 관련하여 “회사”, “이용자”, “파트너” 간에 발생한 분쟁은 상호 신의성실의 원칙에 따라 원만히 해결하도록 노력합니다.
2. 본 약관 및 서비스 이용과 관련하여 발생한 소송 등 분쟁의 관할 법원은 “회사”(주식회사 청솔테크)의 소재지 관할 법원으로 합니다.

부칙 본 이용약관은 2026년 6월 25일부터 시행됩니다.`,
    privacy: `버스탐스 개인정보 처리방침

(주)청솔테크(이하 '회사')는 개인정보보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (개인정보의 처리 목적)
회사는 전세버스 중개 플랫폼 '버스탐스(BUSTAAMS)' 운영을 위해 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
1. 서비스 중개 및 계약 이행: 여행 일정 및 조건에 따른 여행자와 버스기사(파트너) 간의 매칭 서비스 제공, 연락처 상호 공개, 데이터 이용료 및 매칭 보증금 결제 처리, 결제대금예치(에스크로) 서비스 적용 및 대금 정산 확인.
2. 파트너 자격 검증: 버스운전자격증, 운전면허증, 운전적성정밀검사 결과 등 API 연동(한국교통안전공단, 경찰청, 국세청 등)을 통한 실시간 신원 및 운전자격 확인.
3. 영업 파트너 관리: 추천인 번호를 기반으로 한 영업 파트너(영업회원)의 실적 관리, 프리랜서 사업소득 세무 신고 및 배당 수수료 정산 처리.
4. 회원 관리 및 부정 이용 방지: 서비스 이용에 따른 본인 확인, 전자 서명 관리, 이용약관 위반 행위 제한, 무분별한 취소 및 노쇼(No-show) 회원의 단계별 서비스 이용 제한(패널티) 관리.
5. 소비자 불만 및 분쟁 처리: 통신판매중개 서비스 이용 과정에서 발생하는 여행자, 파트너, 영업 파트너 간의 취소·환불·노쇼 관련 분쟁 해결 및 민원 처리, 고지사항 전달.

제2조 (수집하는 개인정보 항목 및 방법)
회사는 서비스 제공, 통신판매중개 및 정산의 정확성을 위해 필요한 최소한의 개인정보를 수집하고 있습니다.
1. 여행자(이용자) 회원
• 필수: 성명, 휴대전화번호, 이메일 주소, 본인인증 정보(CI/DI), 전자 서명 데이터, 결제 정보(카드사명, 카드번호 일부, 승인번호 등 대금결제 기록).
• 선택: 여행 일정(출발지/경유지/목적지), 탑승 인원, 선호 차량 사양 및 버스 종류.
2. 버스기사 파트너 회원
• 필수: 성명, 연락처, 버스운전자격증 번호, 운전면허 번호, 사업자 정보(상호명, 사업자등록번호), 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.
• 증빙 서류(사진 업로드): 운전적성정밀검사 적합 판정표, 버스운전자격증 및 운전면허증 사본, 차량 등록 정보(차량 사진 및 등록증).
3. 영업 파트너(영업회원 / 프리랜서)
• 필수: 성명, 연락처, 주민등록번호(※ 소득세법 제145조, 지방세법 등 관련 세무 신고 의무 이행을 위한 필수 수집), 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.
4. 수집 방법
• 모바일 애플리케이션 및 웹사이트를 통한 회원가입, 서류 사진 업로드, 결제대행사(PG) API 및 유관기관 API 연동 검증, 서비스 이용 과정에서 생성되는 로그 데이터 자동 수집.

제3조 (개인정보의 제3자 제공)
회사는 원활한 통신판매중개 및 서비스 이행을 위해 필요한 범위 내에서 이용자의 동의를 얻어 개인정보를 제3자에게 제공합니다. 계약이 확정되지 않은 상태에서는 개인 식별 정보가 상호 노출되지 않습니다.
• 제공 시점: 여행자가 플랫폼에서 데이터 이용료를 최종 결제하고 파트너의 배정 확인을 통해 운행 계약이 성립된 즉시
• 제공받는 자: 매칭이 확정된 당해 거래의 계약 당사자 (해당 여행자 및 버스기사 파트너)
• 제공 항목: 상호 성명(또는 상호명), 연락처(휴대전화번호), 배차 및 차량 정보, 여행 일정 및 운행 조건
• 제공 목적: 특허 기반 즉시 매칭 시스템에 따른 상호 연락처 공개, 세부 운행 일정 협의, 차내 안전 매너 준수 등 서비스의 실질적 이행을 위한 상호 소통

제4조 (개인정보의 보유 및 이용 기간)
1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
2. 회원 탈퇴 시 또는 동의 철회 시 수집된 개인정보는 즉시 파기하는 것을 원칙으로 합니다. 단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 법령에서 명시한 기간 동안 회원 정보를 보관합니다.
• 표시·광고에 관한 기록: 6개월 (전자상거래법)
• 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)
• 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)
• 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)
• 웹사이트 접속 기록(로그인 기록): 3개월 (통신비밀보호법)
• 영업 파트너 세무 증빙 및 실적 보관: 마지막 실적 발생일 또는 배당금 정산일로부터 5년 (국세기본법, 소득세법)
• 이용약관에 따른 위약금 및 부당 취소·노쇼 패널티 기록: 분쟁 방지 및 정당한 패널티 적용을 위해 예약 취소일 또는 서비스 예정일로부터 5년 보존.

제5조 (보안 및 기술적·관리적 대책)
회사는 이용자의 개인정보를 취급함에 있어 분실·도난·유출·변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적/관리적 대책을 강구하고 있습니다.
1. 대금 결제 및 에스크로 보호: 결제대행사(PG)와의 정식 계약 및 에스크로(INIPAY) 시스템 연동을 통해 이용자의 금융 결제 정보는 철저히 암호화되어 처리되며, 회사는 카드번호 전체 등 민감한 결제 정보를 직접 저장하지 않습니다.
2. 1원 인증 및 계좌 검증: 금융 API를 통해 파트너 및 영업 파트너의 정산 계좌 실존 여부와 소유주 일치 여부를 실시간 검증하여 오송금 및 도용을 방지합니다.
3. 전자 서명 및 데이터 암호화: 이용자와 파트너가 직접 입력한 계약용 전자 서명 데이터는 고도의 암호화 알고리즘으로 저장되며, 운행 계약 성립 및 법적 증빙 목적 외의 용도로는 절대로 변형되거나 조회되지 않습니다.
4. 접근 통제: 개인정보를 처리하는 데이터베이스 시스템에 대한 접근권한의 부여, 변경, 말소를 통하여 개인정보에 대한 접근을 엄격히 통제하고 있습니다.

제6조 (이용자의 권리·의무 및 행사방법)
1. 이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.
2. 권리 행사는 플랫폼 내 [마이페이지 > 회원정보 수정] 메뉴를 이용하거나 개인정보 보호책임자에게 서면, 이메일 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치합니다.
3. 단, 전자상거래법 등 타 법령에서 보존 대상으로 명시한 거래 기록이나, 제3조에 따라 이미 결제가 완료되어 운행 계약이 성립되고 상대방에게 연락처가 공개된 경우에는 서비스의 성실한 이행 및 법적 의무 준수를 위하여 법정 기간이 경과하기 전까지 일부 정보의 삭제 또는 처리정지가 제한될 수 있습니다.

제7조 (개인정보 보호책임자)
회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
• 성명: 원동일
• 직책: 대표이사
• 연락처: 02-429-5459 / bustaams@gmail.com

부칙 본 개인정보 처리방침은 2026년 6월 25일부터 적용됩니다. 기존 방침은 본 방침으로 대체됩니다.`,
    traveler: `여행자(이용자) 가입 및 이용 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 가입을 신청한 여행자(이하 “이용자”)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “이용자”가 가입하여 특허 시스템 기반의 중개 프로세스(계약금 입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (가입 자격 및 승인)\n1. “이용자”는 가입 신청 시 본인 실명 인증 절차를 거쳐야 한다.\n2. [계약의 성립] 본 계약은 “이용자”가 플랫폼(웹/앱)상에서 제공하는 전자 서명(싸인)을 하고 동의 절차에 따라 버튼을 클릭함으로써 본 계약에 확정적으로 전자 서명한 것으로 간주하며, 신청 완료 시점부터 효력이 발생한다.\n\n제3조 (서비스 이용 및 계약 체결)\n1. [청약 등록] “이용자”는 플랫폼에서 요구하는 기본 조건(출발지, 도착지, 탑승 인원, 일시 등)을 완성한 후, 희망 이용요금을 직접 입력하여 청약을 등록한다.\n2. [계약금 결제] “이용자”는 청약 내용에 부합하는 파트너(버스기사)의 제안을 선택하거나 매칭되었을 때, 이용 금액의 6.6%(부가세 포함)를 계약금으로 결제(카드 또는 계좌이체)함으로써 계약을 완료한다.\n3. [연락처 즉시 공개] 계약금 결제 완료 후 파트너가 이를 승인하면 상호 연락처가 즉시 공개되며, 이때부터 자유로운 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (이용 요금 및 수수료)\n1. [가입 수수료] 플랫폼 가입 수수료는 11,000원(부가세 포함)이다. (단, “사업자”가 지정하는 일정 기간 가입 수수료를 면제할 수 있다.)\n2. [중개 수수료] “이용자”에게는 별도의 중개 수수료가 발생하지 않는다. (단, 제3조 2항의 계약금은 플랫폼 서비스 이용료 및 예약 보증금 성격을 포함한다.)\n\n제5조 (취소 및 이용자 보호 권리)\n1. [이용자 귀책 취소] 계약 체결 후 “이용자”가 특별한 사유 없이 일방적으로 취소할 경우, 기 납부한 계약금은 “사업자”에게 귀속되며 반환되지 않는다.\n2. [파트너 귀책 취소 및 보상] 계약 체결 후 파트너(버스기사)의 귀책으로 계약이 파기될 경우, “이용자”는 다음 중 하나의 보호 조치를 받을 권리가 있다.\n- 계약금 4배 환불: “사업자”는 이용자가 입금한 계약금의 4배 전액을 위약금으로 지급한다.\n- 대체 차량 제공: “사업자”가 원래의 계약 조건과 동일한 급 이상의 다른 차량을 수급하여 제공하는 경우, 위 위약금 지급을 대신할 수 있다.\n3. [위약 예외 사유] 다음 각 호의 사유로 인한 취소는 정확한 증빙이 제출되고 “사업자”가 인정한 경우에 한하여 위약 규정을 적용하지 않는다.\n1) 본인 사망 2) 차량 파손 (운행 불가) 3) 법정 구속 4) 직계존비속 및 배우자 사망 5) 질병 또는 사고에 의한 입원 6) 사고에 의한 당일 통원치료\n\n제6조 (패널티 및 품질 관리)\n시스템은 “이용자”의 취소 이력을 자동 모니터링하며, 제5조 3항의 특별한 사유 없이 결제 취소 또는 계약 파기가 반복될 경우 다음과 같이 이용을 제한한다.\n• 1회 발생 시: 3개월간 이용 제한\n• 2회 발생 시: 6개월간 이용 제한\n• 3회 발생 시: 9개월간 이용 제한\n• 4회 발생 시: 본 계약 해지 및 영구 가입 제한\n\n제7조 (관할 법원)\n본 계약과 관련한 분쟁의 관할 법원은 “사업자”의 소재지 관할 법원으로 한다.`,
    driver: `버스기사(파트너) 입점 및 서비스 이용 계약서

주식회사 청솔테크(이하 “회사”라 한다)와 버스탐스 플랫폼에 기사 회원으로 가입하여 운송 서비스를 제공하고자 하는 여객자동차 운수종사자(이하 “파트너”라 한다)는 회사가 운영하는 “버스탐스(BUSTAAMS)” 앱 및 웹 서비스를 이용함에 있어 상호 간의 권리와 의무, 책임 사항을 규정하기 위해 다음과 같이 계약을 체결합니다.

제 1 조 (목적)
본 계약은 “회사”가 제공하는 플랫폼을 통해 “파트너”가 이용자(여행자)와 운송 용역 계약을 체결하고 서비스를 제공하는 과정에서 발생하는 플랫폼 이용 요금, 정산 절차, 쌍방의 준수 사항 및 책임 요건을 명확히 규정하는 것을 목적으로 합니다.

제 2 조 (멤버십 상품 및 이용 요금)
“파트너”는 “회사”가 제공하는 버스탐스 멤버십 상품을 구매하여 입찰에 참여할 수 있으며, 상품의 세부 명세는 다음과 같습니다.
1. 멤버십 상품 구성 (월 요금 및 혜택)
• 브론즈 (Bronze): 월 300,000 원 | 월 10 회 입찰 참여권 제공 | 기본 정보 이용료 2.2% 부과
• 골드 (Gold): 월 500,000 원 | 월 20 회 입찰 참여권 제공 | 기본 정보 이용료 2.2% 부과
• 플래티넘 (Platinum): 월 800,000 원 | 월 30 회 입찰 참여권 제공 | 기본 정보 이용료 2.2% 부과
2. 이용 기간: 매월 1 일 결제 및 해당 결제월의 말일까지 제공하는 것을 원칙으로 하며, 원칙적으로 중도 회원 등록은 불가합니다. 단, 회비 결제 후 본사와 유선 통화를 거쳐 확인이 완료된 경우에 한해 예외적으로 매월 3 일 이내까지만 회원 가입 및 등록이 가능합니다.
3. 데이터 이용료 (초과 부과 정책): “파트너”가 가입한 멤버십 상품별 월 기본 입찰 참여권을 모두 소진한 후, 추가로 입찰에 참여하여 계약이 성사되거나 이용하는 건에 대해서는 해당 이용 금액 전체의 6.6%를 데이터 이용료로 “회사”에 지불하여야 합니다.
4. 취소 및 중도 환불 정책: “파트너”가 멤버십 중도 해지를 요청할 경우, 취소일 기준 잔여 일수에 아래의 금액을 곱하여 정산 후 환불합니다.
• 브론즈: 잔여 일수 x 10,000 원
• 골드: 잔여 일수 x 17,000 원
• 플래티넘: 잔여 일수 x 27,000 원

제 3 조 (파트너의 자격 선언 및 필수 등록 정보)
1. “파트너”는 관련 법령(여객자동차 운수사업법 등)에 의거하여 적법하게 운전면허 및 운수종사자 자격을 취득하고 유효하게 유지하고 있는 자여야 합니다.
2. “파트너”는 서비스 입점 및 심사를 위해 다음의 필수 정보를 “회사”에 제공 및 등록하여야 합니다.
• 성명 및 연락처, 운수종사자 자격번호
• 운행 차량 정보 (차량 번호, 차종, 보험 가입 증명서 등)

제 4 조 (플랫폼 내 거래의 책임과 의무)
1. “버스탐스”는 “파트너”와 이용자(여행자) 간의 운송 용역 거래를 중개하는 플랫폼으로서, 플랫폼 내에서 판매 및 계약되는 상품과 서비스에 대한 관리 책임은 원칙적으로 “회사”가 부담합니다.
2. “회사”는 원활한 서비스 운영을 위해 전담 민원 담당자를 지정하여 운영합니다.
• 상호명: (주) 청솔테크
• 민원 담당 연락처: 02-000-0000
• 전담 이메일: bustaams@gmail.com
3. “파트너”는 이용자(여행자)와의 운송 계약을 성실히 이행하여야 하며, 과실로 인한 안전사고, 불친절, 계약 미이행 등으로 발생한 분쟁의 1차적 책임은 “파트너” 본인에게 있습니다.

제 5 조 (계약의 해지 및 이용 제한)
“회사”는 “파트너”가 다음 각 호의 사유에 해당하는 경우, 별도의 사전 통지 없이 본 계약을 해지하거나 서비스 이용을 제한할 수 있습니다.
1. 타인의 명의나 도용된 계정(예: duser01 등 테스트 계정 포함)을 부정한 방법으로 사용하여 플랫폼 생태계를 교란한 경우
2. 운수종사자 자격이 정지되거나 취소되어 합법적인 운행이 불가능해진 경우
3. 플랫폼을 통하지 않고 이용자와 직거래를 유도하는 등 “회사”의 영업을 방해한 경우

제 6 조 (관할 법원)
본 계약과 관련하여 “회사”와 “파트너” 간에 발생한 분쟁에 대하여 소송이 제기될 경우, “회사”의 본점 소재지(서울특별시 송파구)를 관할하는 법원을 합의 관할 법원으로 합니다.

[계약 체결 확인] 본 계약의 체결을 증명하기 위해 “파트너”는 “버스탐스(BUSTAAMS)” 앱 내에서 회원 가입 및 멤버십 결제를 완료함으로써 본 계약서의 모든 조항에 동의한 것으로 간주합니다.

서비스 운영사 정보
• 상호명: (주) 청솔테크
• 대표자: 원동일
• 사업자등록번호: 212-81-45502
• 주소: 서울특별시 송파구 충민로 66, L-7145 호 (문정동, 가든파이브라이프)

부칙 본 방침은 2026 년 6 월 25 일부터 시행됩니다.`,
    marketing: `마케팅 정보 수신 및 활용 동의서 (선택)

본 동의서는 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스탐스(BUSTAAMS)”에서 제공하는 서비스의 홍보, 이벤트, 맞춤형 정보 제공을 위해 이용자의 개인정보를 수집 및 활용하는 것에 대한 동의를 구하는 내용입니다.

1. 수집 및 이용 목적
회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
• 공통: 신규 서비스 홍보 및 회원 맞춤형 서비스 제안, 이벤트 및 광고성 정보 안내, 경품 및 기념품 배송, 서비스 개선을 위한 통계 분석 및 만족도 설문조사.
• 버스기사(파트너) 전용: 신규 청약 발생 알림, 지역별/시즌별 배차 수요 정보 제공, 수수료 할인 프로모션 및 제휴 서비스 안내.
• 여행자(이용자) 전용: 맞춤형 여행 일정 및 버스 견적 정보 추천, 시즌별 할인 쿠폰 및 프로모션 알림.
• 영업 파트너(영업회원) 전용: 신규 입점 및 제휴 프로모션 안내, 목표 달성 추가 배당 수수료 이벤트 정보 및 영업 팁 제공.

2. 수집 항목
• 성명, 휴대전화 번호, 이메일 주소, 서비스 이용 기록(접속 로그, 쿠키 등), 기기 식별 정보(푸시 알림용 디바이스 토큰).

3. 보유 및 이용 기간
• 회원 탈퇴 시 또는 동의 철회 시까지 즉시 파기합니다.
• 단, 관련 법령(예: 전자상거래 등에서의 소비자보호에 관한 법률 등)의 규정에 의하여 보존할 필요가 있는 경우, 해당 법령이 정한 일정 기간 동안 개인정보를 안전하게 보존합니다.

4. 전송 방법 및 야간 발송 제한 고지
• 전송 채널: 서비스 내 푸시 알림(Push), SMS(LMS/MMS), 카카오 알림톡/친구톡, 이메일, 유선 전화 등.
• 야간 발송 제한: 관련 법령에 따라 오전 8시부터 오후 9시까지만 광고성 정보가 전송됩니다. 단, 앱 푸시(Push) 등 이용자가 야간 수신을 별도로 설정하거나 동의한 채널에 한해서는 야간에도 발송될 수 있습니다.

5. 동의 거부 권리 및 불이익
• 본 마케팅 정보 수신 동의는 필수 사항이 아닌 선택 사항입니다.
• 동의를 거부하시더라도 플랫폼의 기본 중개 서비스(청약 등록, 참여, 배차 신청, 영업 등록 등) 이용에는 일절 제한이 없습니다. 다만, 회사가 제공하는 회원 전용 할인 쿠폰, 수수료 프로모션, 실시간 배차 팁 및 각종 혜택 제공 대상에서 제외될 수 있습니다.

6. 동의 철회 및 수신 변경 방법
• 이용자는 본 동의를 언제든지 철회하거나 수신 채널을 변경할 수 있습니다.
• 변경 및 철회는 플랫폼 내 [마이페이지 > 설정 > 알림 설정] 메뉴에서 직접 변경하시거나, 고객센터를 통해 요청하실 수 있습니다.

부칙 본 방침은 2026 년 6 월 25 일부터 시행됩니다.`
};

// 한글 주석: 운전면허증 번호 자동 포맷팅 헬퍼 함수 (00-00-000000-00)
const formatLicenseNo = (value) => {
    if (!value) return '';
    const clean = value.replace(/[^0-9]/g, '').slice(0, 12);
    let formatted = '';
    if (clean.length > 0) {
        formatted += clean.substring(0, 2);
    }
    if (clean.length > 2) {
        formatted += '-' + clean.substring(2, 4);
    }
    if (clean.length > 4) {
        formatted += '-' + clean.substring(4, 10);
    }
    if (clean.length > 10) {
        formatted += '-' + clean.substring(10, 12);
    }
    return formatted;
};

const DriverInfoRegistration = () => {
    const navigate = useNavigate();
    // 공용 업로드용 Ref 및 상태 선언
    const commonAlbumInputRef = useRef(null); // 공용 앨범 선택 Ref
    const commonCameraInputRef = useRef(null); // 공용 카메라 촬영 Ref
    const residentNoBackRef = useRef(null); // 주민등록번호 뒷자리 Ref
    const [showPhotoBottomSheet, setShowPhotoBottomSheet] = useState(false); // 바텀 시트 노출 상태
    const [activeUploadType, setActiveUploadType] = useState(null); // 현재 업로드 중인 항목 ('profileImg' | 'licenseImg' | 'busLicenseImg' | 'careerCertImg')

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [postcodeOpen, setPostcodeOpen] = useState(false);
    const [licenseTypes, setLicenseTypes] = useState([]);

    const [formData, setFormData] = useState({
        userNm: '',
        hpNo: '',
        residentNoFront: '',
        residentNoBack: '',
        zipcode: '',
        address: '',
        detailAddress: '',
        addrType: 'HOME',
        sex: 'M',
        selfIntro: '',
        licenseType: '',
        licenseNo: '',
        licenseIssueDt: '',
        licenseValidity: 'Y',
        licenseApproveStat: '',
        busLicenseNo: '',
        qualAcquisitionDt: '',
        qualStatus: 'ACTIVE',
        qualApproveStat: '',
        careerCertApproveStat: '',
        bankBookApproveStat: '',
        bankNm: '',
        acctNo: '',
        acctHold: ''
    });

    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [idToken, setIdToken] = useState(null);
    const [originalPhone, setOriginalPhone] = useState('');

    // 마케팅 알림 동의 상태
    const [marketing, setMarketing] = useState({
        agree: false,
        sms: false,
        push: false,
        email: false,
        tel: false
    });
    // 알림 설정 바텀 시트 토글 상태
    const [showAlarmBottomSheet, setShowAlarmBottomSheet] = useState(false);
    // 약관 및 정책 동의 이력 상태
    const [termsConsent, setTermsConsent] = useState([]);
    // 약관 및 정책 바텀 시트 토글 상태
    const [showTermsBottomSheet, setShowTermsBottomSheet] = useState(false);

    const [previews, setPreviews] = useState({
        profileImg: '',
        licenseImg: '',
        busLicenseImg: '',
        careerCertImg: '',
        bankBookImg: ''
    });
    const [files, setFiles] = useState({
        profileImg: null,
        licenseImg: null,
        busLicenseImg: null,
        careerCertImg: null,
    });

    // 한글 주석: PDF 파일인지 판별하는 로컬 헬퍼 함수
    const isPdf = (key) => {
        return files[key]?.type === 'application/pdf' || 
               (previews[key] && previews[key].startsWith('data:application/pdf')) ||
               (previews[key] && previews[key].endsWith('.pdf'));
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // 1. 공통 코드 조회
            try {
                const codeRes = await request('/common/codes/LICENSE_TYPE');
                if (codeRes?.success && Array.isArray(codeRes.data)) {
                    setLicenseTypes(codeRes.data);
                }
            } catch (e) {
                console.error('Failed to fetch license types:', e);
            }

            // 2. 기사 프로필 조회
            try {
                const res = await getDriverProfile();
                if (res?.success && res.data) {
                    const { user, driver } = res.data;
                    const rawRrn = driver?.residentNo || '';
                    let rFront = '';
                    let rBack = '';
                    if (rawRrn) {
                        const cleaned = rawRrn.replace(/[^0-9*]/g, '');
                        if (cleaned.length >= 13) {
                            rFront = cleaned.substring(0, 6);
                            rBack = cleaned.substring(6, 13);
                        } else if (rawRrn.includes('-')) {
                            const parts = rawRrn.split('-');
                            if (parts[0] && parts[1]) {
                                rFront = parts[0];
                                rBack = parts[1];
                            }
                        } else {
                            rFront = rawRrn.substring(0, 6);
                            rBack = rawRrn.substring(6);
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        userNm: user?.name || '',
                        hpNo: user?.phone || '',
                        residentNoFront: rFront,
                        residentNoBack: rBack,
                        zipcode: driver?.zipcode || '',
                        address: driver?.address || '',
                        detailAddress: driver?.detailAddress || '',
                        addrType: driver?.addrType || 'HOME',
                        sex: driver?.sex || 'M',
                        selfIntro: driver?.selfIntro || '',
                        licenseType: driver?.licenseType || '',
                        licenseNo: driver?.licenseNo || '',
                        licenseIssueDt: driver?.licenseIssueDt || '',
                        licenseValidity: driver?.licenseValidity || 'Y',
                        licenseApproveStat: driver?.licenseApproveStat || '',
                        busLicenseNo: driver?.busLicenseNo || '',
                        qualAcquisitionDt: driver?.qualAcquisitionDt || '',
                        qualStatus: driver?.qualStatus || 'ACTIVE',
                        qualApproveStat: driver?.qualApproveStat || '',
                        careerCertApproveStat: driver?.careerCertApproveStat || '',
                        bankBookApproveStat: driver?.bankBookApproveStat || '',
                        bankNm: driver?.bankNm || '',
                        acctNo: driver?.acctNo || '',
                        acctHold: driver?.acctHold || ''
                    }));
                    setOriginalPhone(user?.phone || '');
                    if (user?.phone) setIsVerified(true); // 이미 번호가 있으면 인증된 것으로 간주 (변경 시 재인증 필요)
                    setPreviews({
                        profileImg: driver?.profileImg || '',
                        licenseImg: driver?.licenseImg || '',
                        busLicenseImg: driver?.busLicenseImg || '',
                        careerCertImg: driver?.careerCertImg || '',
                        bankBookImg: driver?.bankBookImg || ''
                    });

                    // 마케팅 동의 데이터 로드
                    if (user?.marketing) {
                        setMarketing({
                            agree: user.marketing.agree || false,
                            sms: user.marketing.sms || false,
                            push: user.marketing.push || false,
                            email: user.marketing.email || false,
                            tel: user.marketing.tel || false
                        });
                    }

                    // 약관 동의 이력 데이터 로드
                    if (user?.termsConsent) {
                        setTermsConsent(user.termsConsent);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
        } finally {
            setLoading(false);
        }
    };



    // SMS 인증번호 전송
    const handleSendSMS = async () => {
        if (!formData.hpNo) {
            notify.warn('번호 입력', '휴대폰 번호를 입력해주세요.');
            return;
        }

        try {
            const res = await sendAuthCode(formData.hpNo, 'verify');
            if (res.success) {
                setVerificationSent(true);
                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');
            } else {
                notify.error('발송 실패', res.error || '인증번호 발송 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Send SMS Error:', error);
            notify.error('발송 실패', '인증번호 발송 중 오류가 발생했습니다.');
        }
    };

    // 인증번호 확인
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            notify.warn('입력 필요', '인증번호를 입력해주세요.');
            return;
        }

        try {
            const res = await verifyAuthCode(formData.hpNo, verificationCode, 'verify');
            if (res.success) {
                setIdToken(res.verifyToken);
                setIsVerified(true);
                setVerificationSent(false);
                notify.success('인증 성공', '휴대폰 인증이 완료되었습니다.');
            } else {
                notify.error('인증 실패', res.error || '인증번호가 일치하지 않습니다.');
            }
        } catch (error) {
            console.error('Verify Code Error:', error);
            notify.error('인증 실패', '인증번호 확인 중 오류가 발생했습니다.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 마케팅 전체 동의 토글
    const handleMarketingAll = (checked) => {
        setMarketing({
            agree: checked,
            sms: checked,
            push: checked,
            email: checked,
            tel: checked
        });
    };

    const handleShowTerms = (title, content) => {
        Swal.fire({
            title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">BusTaams 정책</p><h2 class="text-xl font-black text-teal-900">${title}</h2></div>`,
            html: `
                <div class="text-left mt-6 font-body">
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto">
                        <p class="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">${content}</p>
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: '확인',
            confirmButtonColor: '#004e47',
            customClass: {
                popup: 'rounded-[2.5rem] p-6 sm:p-10 border-none shadow-2xl',
                actions: 'w-full flex justify-center mt-8',
                confirmButton: `
                    !w-[280px]
                    !h-16
                    rounded-xl
                    font-black
                    text-xl
                    bg-teal-700
                    text-white
                    flex
                    items-center
                    justify-center
                    shadow-lg
                    border-0
                `
            },
            buttonsStyling: false
        });
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (file) {
            // 한글 주석: 업로드 전 이미지 압축 수행
            const compressedFile = await compressImage(file);
            setFiles(prev => ({ ...prev, [type]: compressedFile }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(compressedFile) }));

            // 한글 주석: 통장 사본 업로드 시 백엔드 OCR API 호출
            if (type === 'bankBookImg') {
                Swal.fire({
                    title: '통장 사본 인식 중...',
                    text: '이미지에서 계좌 정보를 추출하고 있습니다. 잠시만 기다려 주세요.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const token = localStorage.getItem('accessToken');
                    const ocrFormData = new FormData();
                    ocrFormData.append('bankBookImg', compressedFile);

                    const response = await fetch('/api/app/driver/ocr/bankbook', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: ocrFormData
                    });

                    if (!response.ok) throw new Error('OCR API 호출 실패');
                    const resJson = await response.json();

                    if (resJson.success && resJson.data) {
                        const { bankName, accountNumber, accountHolder } = resJson.data;
                        setFormData(prev => ({
                            ...prev,
                            bankNm: bankName || '',
                            acctNo: accountNumber || '',
                            acctHold: accountHolder || ''
                        }));
                        Swal.fire({
                            icon: 'success',
                            title: '인식 완료',
                            text: '통장 사본 정보가 자동으로 추출되었습니다. 정보를 확인해 주세요!',
                            confirmButtonColor: '#004e47'
                        });
                    } else {
                        throw new Error(resJson.error || '분석 실패');
                    }
                } catch (ocrErr) {
                    console.error('[OCR Bankbook Front] Error:', ocrErr);
                    Swal.fire({
                        icon: 'warning',
                        title: '인식 실패',
                        text: '계좌 정보를 자동으로 추출하지 못했습니다. 수동으로 입력해 주세요.',
                        confirmButtonColor: '#004e47'
                    });
                }
            }
        }
    };

    const handlePostcodeComplete = (data) => {
        setFormData(prev => ({
            ...prev,
            zipcode: data.zonecode,
            address: data.address
        }));
        setPostcodeOpen(false);
    };

    const handleSubmit = async () => {
        const combinedRrn = `${formData.residentNoFront}-${formData.residentNoBack}`;
        if (!validateRRN(combinedRrn)) {
            notify.error('입력 오류', '유효하지 않은 주민등록번호입니다.');
            return;
        }

        if (formData.hpNo !== originalPhone && !isVerified) {
            notify.warn('인증 필요', '휴대폰 번호 인증이 필요합니다.');
            return;
        }

        if (!formData.licenseIssueDt) {
            notify.error('입력 오류', '면허 발급일을 입력해주세요.');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (formData.licenseIssueDt && formData.licenseIssueDt > today) {
            notify.error('입력 오류', '면허 발급일은 오늘 이전 날짜여야 합니다.');
            return;
        }
        if (!formData.qualAcquisitionDt) {
            notify.error('입력 오류', '자격 취득일을 입력해주세요.');
            return;
        }
        if (!files.licenseImg && !previews.licenseImg) {
            notify.error('입력 오류', '운전면허증 사진을 업로드해주세요.');
            return;
        }
        if (!files.busLicenseImg && !previews.busLicenseImg) {
            notify.error('입력 오류', '버스운전자격증 사본을 업로드해주세요.');
            return;
        }
        if (!files.careerCertImg && !previews.careerCertImg) {
            notify.error('입력 오류', '운전경력증명서(경찰청 발급)를 업로드해주세요.');
            return;
        }

        try {
            setSubmitting(true);
            const data = new FormData();

            data.append('name', formData.userNm);
            data.append('phone', formData.hpNo);
            if (formData.hpNo !== originalPhone) {
                data.append('firebaseToken', idToken);
            }
            data.append('residentNo', `${formData.residentNoFront}-${formData.residentNoBack}`);
            data.append('zipcode', formData.zipcode);
            data.append('address', formData.address);
            data.append('detailAddress', formData.detailAddress);
            data.append('addrType', formData.addrType);
            data.append('sex', formData.sex);
            data.append('selfIntro', formData.selfIntro);
            data.append('licenseType', formData.licenseType);
            data.append('licenseNo', formData.licenseNo);
            data.append('licenseIssueDt', formData.licenseIssueDt);
            data.append('licenseValidity', formData.licenseValidity);
            data.append('busLicenseNo', formData.busLicenseNo);
            data.append('qualAcquisitionDt', formData.qualAcquisitionDt);
            data.append('qualStatus', formData.qualStatus);
            data.append('marketing', JSON.stringify(marketing)); // 마케팅 알림 동의 데이터 추가
            data.append('bankNm', formData.bankNm);
            data.append('acctNo', formData.acctNo);
            data.append('acctHold', formData.acctHold);

            if (files.profileImg) data.append('profileImg', files.profileImg);
            if (files.licenseImg) data.append('licenseImg', files.licenseImg);
            if (files.busLicenseImg) data.append('busLicenseImg', files.busLicenseImg);
            if (files.careerCertImg) data.append('careerCertImg', files.careerCertImg);
            if (files.bankBookImg) data.append('bankBookImg', files.bankBookImg);

            const res = await updateDriverProfile(data);
            if (res.success) {
                if (res.warning) {
                    await Swal.fire({
                        title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">자격 확인 안내</p><h2 class="text-xl font-black text-teal-900">자격 정보 검증 안내</h2></div>`,
                        html: `
                            <div class="text-left mt-4 font-body">
                                <div class="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                    <p class="text-sm text-amber-900 leading-relaxed font-semibold">
                                        ${res.warning}
                                    </p>
                                </div>
                                <p class="text-xs text-slate-500 mt-3 ml-1 font-medium">
                                    * 입력하신 면허 및 자격 정보는 정상 저장되었습니다. 운영팀이 수동으로 최종 승인을 진행할 예정입니다.
                                </p>
                            </div>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: '확인',
                        confirmButtonColor: '#004e47',
                        customClass: {
                            popup: 'rounded-[2rem] p-6 sm:p-8 border-none shadow-2xl',
                            actions: 'w-full flex justify-center mt-6',
                            confirmButton: `
                                !w-[200px]
                                !h-12
                                rounded-xl
                                font-bold
                                text-base
                                bg-teal-700
                                text-white
                                flex
                                items-center
                                justify-center
                                shadow-lg
                                border-0
                            `
                        },
                        buttonsStyling: false
                    });
                } else {
                    notify.success('저장 완료', '기사 정보 등록이 완료되었습니다.');
                }
                navigate('/driver-dashboard');
            }
        } catch (err) {
            notify.error('오류', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
            <div className="w-12 h-12 border-4 border-[#004e47] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] font-body min-h-screen pb-40 text-left">
            {/* Postcode Modal */}
            {postcodeOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg relative shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                            <h3 className="font-bold text-teal-900">주소 검색</h3>
                            <button onClick={() => setPostcodeOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="h-[450px]">
                            <DaumPostcodeEmbed onComplete={handlePostcodeComplete} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-teal-900/5 h-16 flex items-center">
                <div className="flex items-center justify-between px-6 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors active:scale-90">
                            <span className="material-symbols-outlined text-teal-800">arrow_back</span>
                        </button>
                        <h1 className="text-teal-900 font-extrabold tracking-tight font-headline text-lg">기사정보 등록</h1>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {previews.profileImg ? (
                            <img alt="Driver Profile" src={previews.profileImg} className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
                    <div className="col-span-12 md:col-span-8">
                        {/* 한글 주석: 홍보 문구 영역을 지정된 이미지로 교체 */}
                        <img 
                            src="/app/assets/회원정보등록.png" 
                            alt="회원정보 등록하고 단독 운송 기회를 선점하세요! 여행 정보 확인 후 선착순 1인 단독 청약 진행" 
                            className="max-w-full h-auto object-contain rounded-xl"
                        />
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column: Profile Photo */}
                    <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)]">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group cursor-pointer" onClick={() => {
                                    setActiveUploadType('profileImg');
                                    setShowPhotoBottomSheet(true);
                                }}>
                                    <div className="w-40 h-40 rounded-xl bg-[#f2f4f6] flex items-center justify-center overflow-hidden border-4 border-white shadow-inner mb-6 transition-transform group-hover:scale-105 duration-500">
                                        {previews.profileImg ? (
                                            <img src={previews.profileImg} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-6xl text-[#bec9c6]">account_circle</span>
                                        )}
                                        <div className="absolute inset-0 bg-[#004e47]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-headline font-bold text-xl text-[#191c1e] mb-2">프로필 사진</h3>
                                <p className="text-sm text-[#3e4947] mb-6 px-4 leading-relaxed">기사 ID 카드를 위한 선명하고 전문적인 정면 사진을 제공해 주세요.</p>
                                <button onClick={() => {
                                    setActiveUploadType('profileImg');
                                    setShowPhotoBottomSheet(true);
                                }} className="w-full py-3 rounded-xl border-2 border-[#bec9c6] text-[#191c1e] font-bold text-sm hover:bg-[#f2f4f6] transition-colors active:scale-95 duration-200">
                                    이미지 업로드
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Right Column: Registration Sections */}
                    <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-8">
                        {/* Section 1: Personal Information */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
                            <h4 className="font-headline font-extrabold text-2xl text-[#191c1e] mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">01</span>
                                신원 정보
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">성명 (실명)</label>
                                    <input name="userNm" value={formData.userNm} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-[#004e47]/20 transition-all text-[#191c1e] placeholder:text-[#6e7977]" placeholder="홍길동" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">주민등록번호</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            name="residentNoFront" 
                                            value={formData.residentNoFront} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                                setFormData(prev => ({ ...prev, residentNoFront: val }));
                                                if (val.length === 6 && residentNoBackRef.current) {
                                                    residentNoBackRef.current.focus();
                                                }
                                            }} 
                                            maxLength="6"
                                            pattern="[0-9]*"
                                            inputMode="numeric"
                                            className="w-1/2 bg-[#e6e8ea] border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-[#004e47]/20 transition-all text-[#191c1e] placeholder:text-[#6e7977] text-center" 
                                            placeholder="YYMMDD" 
                                        />
                                        <span className="text-[#3e4947] font-bold">-</span>
                                        <input 
                                            ref={residentNoBackRef}
                                            name="residentNoBack" 
                                            value={formData.residentNoBack} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9*]/g, '').slice(0, 7);
                                                setFormData(prev => ({ ...prev, residentNoBack: val }));
                                            }} 
                                            maxLength="7"
                                            className="w-1/2 bg-[#e6e8ea] border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-[#004e47]/20 transition-all text-[#191c1e] placeholder:text-[#6e7977] text-center" 
                                            placeholder="C******" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4 md:col-span-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">성별 구분</label>
                                    <div className="flex gap-8 px-1">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" name="sex" value="M" checked={formData.sex === 'M'} onChange={handleInputChange} className="w-6 h-6 text-[#004e47] focus:ring-[#004e47] border-[#bec9c6]" />
                                            <span className="font-bold text-[#3e4947] group-hover:text-[#004e47] transition-colors">남성</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" name="sex" value="F" checked={formData.sex === 'F'} onChange={handleInputChange} className="w-6 h-6 text-[#004e47] focus:ring-[#004e47] border-[#bec9c6]" />
                                            <span className="font-bold text-[#3e4947] group-hover:text-[#004e47] transition-colors">여성</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">휴대전화 번호</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <input name="hpNo" value={formData.hpNo} onChange={handleInputChange} className="flex-1 min-w-0 bg-[#e6e8ea] border-none rounded-xl px-4 py-4 text-[#191c1e]" placeholder="010-0000-0000" />
                                            <button
                                                type="button"
                                                onClick={handleSendSMS}
                                                className="w-[110px] shrink-0 whitespace-nowrap bg-[#004e47] text-white font-bold rounded-xl px-3 py-4 hover:bg-[#00685f] transition-all text-sm active:scale-95"
                                            >
                                                {verificationSent ? '재발송' : '인증요청'}
                                            </button>
                                        </div>

                                        {verificationSent && (
                                            <div className="flex gap-3">
                                                <input
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                    className="flex-1 min-w-0 bg-[#e6e8ea] border-none rounded-xl px-4 py-4 text-[#191c1e]"
                                                    maxLength="6"
                                                    placeholder="6자리 인증번호"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleVerifyCode}
                                                    className="w-[110px] shrink-0 whitespace-nowrap border-2 border-[#004e47] text-[#004e47] font-bold rounded-xl px-3 py-4 hover:bg-[#004e47]/5 transition-all text-sm active:scale-95"
                                                >
                                                    인증확인
                                                </button>
                                            </div>
                                        )}
                                        {isVerified && formData.hpNo !== originalPhone && (
                                            <p className="text-xs text-teal-600 font-bold px-1">✓ 인증되었습니다.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">주소</label>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-[#6e7977] ml-1 uppercase tracking-widest">주소 구분</label>
                                                <select name="addrType" value={formData.addrType} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-3 text-[#191c1e] font-bold text-sm appearance-none cursor-pointer">
                                                    <option value="HOME">자택 (Home)</option>
                                                    <option value="OFFICE">회사 (Office)</option>
                                                    <option value="OTHER">이외 (Other)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <input value={formData.zipcode} className="w-1/3 bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="우편번호" readOnly />
                                            <button onClick={() => setPostcodeOpen(true)} className="flex-1 bg-[#004e47] text-white font-bold rounded-xl px-6 py-4 hover:bg-[#00685f] transition-all">주소 검색</button>
                                        </div>
                                        <input value={formData.address} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="주소" readOnly />
                                        <input name="detailAddress" value={formData.detailAddress} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="상세 주소" />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">운전기사 자기소개</label>
                                    <textarea name="selfIntro" value={formData.selfIntro} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e] min-h-[120px] resize-none" placeholder="경력, 운행 스타일 등 여행자에게 신뢰를 줄 수 있는 소개를 작성해 주세요." />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Driver's License Information */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
                            <h4 className="font-headline font-extrabold text-2xl text-[#191c1e] mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">02</span>
                                운전면허 정보
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">면허 종류 <span className="text-[#ba1a1a] text-xs font-normal ml-2">*1종 대형 필수</span></label>
                                    <select name="licenseType" value={formData.licenseType} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-[#004e47]/20 transition-all text-[#191c1e] appearance-none">
                                        <option value="">선택해주세요</option>
                                        {licenseTypes.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">면허번호</label>
                                    <input 
                                        name="licenseNo" 
                                        value={formData.licenseNo} 
                                        onChange={(e) => {
                                            const formatted = formatLicenseNo(e.target.value);
                                            setFormData(prev => ({ ...prev, licenseNo: formatted }));
                                        }} 
                                        maxLength="15"
                                        className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" 
                                        placeholder="00-00-000000-00" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">면허 발급일</label>
                                    <input type="date" name="licenseIssueDt" value={formData.licenseIssueDt} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">면허 유효 여부</label>
                                    <div className="flex items-center gap-6 py-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="licenseValidity" value="Y" checked={formData.licenseValidity === 'Y'} onChange={handleInputChange} className="w-5 h-5 text-[#004e47] border-[#bec9c6] focus:ring-[#004e47]" />
                                            <span className="text-sm font-medium text-[#191c1e]">유효</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="licenseValidity" value="N" checked={formData.licenseValidity === 'N'} onChange={handleInputChange} className="w-5 h-5 text-[#004e47] border-[#bec9c6] focus:ring-[#004e47]" />
                                            <span className="text-sm font-medium text-[#191c1e]">만료/정지</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Transport Qualification */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
                            <h4 className="font-headline font-extrabold text-2xl text-[#191c1e] mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">03</span>
                                운수종사자 자격 정보
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">버스운전자격증 번호</label>
                                    <input name="busLicenseNo" value={formData.busLicenseNo} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="12-34-567890" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">자격 취득일</label>
                                    <input type="date" name="qualAcquisitionDt" value={formData.qualAcquisitionDt} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="font-headline font-bold text-sm text-[#191c1e] ml-1">자격 유지 상태</label>
                                    <div className="flex flex-wrap items-center gap-6 py-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="qualStatus" value="ACTIVE" checked={formData.qualStatus === 'ACTIVE'} onChange={handleInputChange} className="w-5 h-5 text-[#004e47] border-[#bec9c6] focus:ring-[#004e47]" />
                                            <span className="text-sm font-medium text-[#191c1e]">정상 (Active)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="qualStatus" value="SUSPENDED" checked={formData.qualStatus === 'SUSPENDED'} onChange={handleInputChange} className="w-5 h-5 text-[#004e47] border-[#bec9c6] focus:ring-[#004e47]" />
                                            <span className="text-sm font-medium text-[#191c1e]">정지 (Suspension)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="qualStatus" value="CANCELLED" checked={formData.qualStatus === 'CANCELLED'} onChange={handleInputChange} className="w-5 h-5 text-[#004e47] border-[#bec9c6] focus:ring-[#004e47]" />
                                            <span className="text-sm font-medium text-[#191c1e]">취소 (Cancellation)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 인증 서류 보관함 */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] text-left">
                            <h3 className="font-headline font-extrabold text-2xl text-[#004e47] mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">
                                    <span className="material-symbols-outlined text-lg">inventory_2</span>
                                </span>
                                인증 서류 보관함
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* License Card */}
                                <div onClick={() => {
                                    setActiveUploadType('licenseImg');
                                    setShowPhotoBottomSheet(true);
                                }} className="p-6 rounded-xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">운전면허증 <span className="text-red-500">*필수</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.licenseApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.licenseApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.licenseApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.licenseApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span>
                                            {!formData.licenseApproveStat ? '미등록' : formData.licenseApproveStat === 'WAIT' ? '확인 중' : formData.licenseApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.licenseImg ? (
                                                isPdf('licenseImg') ? (
                                                    <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
                                                ) : (
                                                    <img src={previews.licenseImg} className="w-full h-full object-cover" />
                                                )
                                            ) : (
                                                <span className="material-symbols-outlined text-3xl">badge</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">면허증 앞면</p>
                                            <p className="text-xs text-[#3e4947]">이미지를 업로드하세요</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Certificate Card */}
                                <div onClick={() => {
                                    setActiveUploadType('busLicenseImg');
                                    setShowPhotoBottomSheet(true);
                                }} className="p-6 rounded-xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">버스운전자격증 <span className="text-red-500">*필수</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.qualApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.qualApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.qualApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.qualApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span>
                                            {!formData.qualApproveStat ? '미등록' : formData.qualApproveStat === 'WAIT' ? '확인 중' : formData.qualApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.busLicenseImg ? (
                                                isPdf('busLicenseImg') ? (
                                                    <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
                                                ) : (
                                                    <img src={previews.busLicenseImg} className="w-full h-full object-cover" />
                                                )
                                            ) : (
                                                <span className="material-symbols-outlined text-3xl">description</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">자격증 사본</p>
                                            <p className="text-xs text-[#3e4947]">{formData.qualApproveStat === 'WAIT' ? '파일 검토 중 (24h)' : '이미지를 업로드하세요'}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Career Certificate Card - New Added */}
                                <div onClick={() => {
                                    setActiveUploadType('careerCertImg');
                                    setShowPhotoBottomSheet(true);
                                }} className="p-6 rounded-xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">운전경력증명서 <span className="text-red-500">*필수</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.careerCertApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.careerCertApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.careerCertApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.careerCertApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span>
                                            {!formData.careerCertApproveStat ? '미등록' : formData.careerCertApproveStat === 'WAIT' ? '확인 중' : formData.careerCertApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.careerCertImg ? (
                                                isPdf('careerCertImg') ? (
                                                    <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
                                                ) : (
                                                    <img src={previews.careerCertImg} className="w-full h-full object-cover" />
                                                )
                                            ) : (
                                                <span className="material-symbols-outlined text-3xl">history_edu</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">경력증명서</p>
                                            <p className="text-xs text-[#3e4947]">이미지를 업로드하세요</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Bankbook Copy Card - Added (Optional) */}
                                <div onClick={() => {
                                    setActiveUploadType('bankBookImg');
                                    setShowPhotoBottomSheet(true);
                                }} className="p-6 rounded-xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">통장 사본 <span className="text-slate-400 font-normal">(선택)</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.bankBookApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.bankBookApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.bankBookApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.bankBookApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span>
                                            {!formData.bankBookApproveStat ? '미등록' : formData.bankBookApproveStat === 'WAIT' ? '확인 중' : formData.bankBookApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.bankBookImg ? (
                                                isPdf('bankBookImg') ? (
                                                    <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
                                                ) : (
                                                    <img src={previews.bankBookImg} className="w-full h-full object-cover" />
                                                )
                                            ) : (
                                                <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">통장 사본</p>
                                            <p className="text-xs text-[#3e4947]">입금받으실 통장 입니다.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 한글 주석: 계좌 정보 확인 및 수동 입력 영역 추가 */}
                                <div className="col-span-1 md:col-span-2 p-6 rounded-xl bg-teal-50/40 border border-teal-100/50 space-y-4">
                                    <h5 className="font-headline font-bold text-[#004e47] text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-teal-800 text-lg">payments</span>
                                        정산 계좌 정보 확인
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#3e4947] ml-1">은행명</label>
                                            <input 
                                                name="bankNm" 
                                                value={formData.bankNm} 
                                                onChange={handleInputChange} 
                                                className="w-full bg-white border border-[#bec9c6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e47]/20 text-[#191c1e] placeholder:text-slate-400 font-bold" 
                                                placeholder="예: 신한은행" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#3e4947] ml-1">계좌번호</label>
                                            <input 
                                                name="acctNo" 
                                                value={formData.acctNo} 
                                                onChange={handleInputChange} 
                                                className="w-full bg-white border border-[#bec9c6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e47]/20 text-[#191c1e] placeholder:text-slate-400 font-bold" 
                                                placeholder="하이픈(-) 포함 입력 가능" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-[#3e4947] ml-1">예금주</label>
                                            <input 
                                                name="acctHold" 
                                                value={formData.acctHold} 
                                                onChange={handleInputChange} 
                                                className="w-full bg-white border border-[#bec9c6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e47]/20 text-[#191c1e] placeholder:text-slate-400 font-bold" 
                                                placeholder="실명 입력" 
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-teal-700/80 font-medium">
                                        * 통장 사본 이미지를 등록하면 위의 정보가 자동으로 입력됩니다. 정보가 올바른지 반드시 확인 후 수정해 주세요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Preferences Section (환경 설정) */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] text-left space-y-6">
                            <h3 className="font-headline font-extrabold text-2xl text-[#004e47] flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">
                                    <span className="material-symbols-outlined text-lg">settings</span>
                                </span>
                                환경 설정
                            </h3>
                            <div className="bg-[#f7f9fb] rounded-2xl overflow-hidden border border-[#bec9c6]/30">
                                <div 
                                    onClick={() => setShowAlarmBottomSheet(true)}
                                    className="flex items-center justify-between p-5 hover:bg-slate-100 transition-colors cursor-pointer group border-b border-[#bec9c6]/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="material-symbols-outlined text-teal-800">notifications</span>
                                        <span className="font-bold text-sm text-[#191c1e]">알림 설정</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[#6e7977] group-hover:translate-x-1 transition-transform">chevron_right</span>
                                </div>
                                <div 
                                    onClick={() => setShowTermsBottomSheet(true)}
                                    className="flex items-center justify-between p-5 hover:bg-slate-100 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="material-symbols-outlined text-teal-800">policy</span>
                                        <span className="font-bold text-sm text-[#191c1e]">약관 및 정책</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[#6e7977] group-hover:translate-x-1 transition-transform">chevron_right</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 text-left">
                            <div className="flex items-start gap-3 text-[#3e4947]">
                                <span className="material-symbols-outlined text-[#00685f] mt-1">info</span>
                                <div className="text-xs font-bold max-w-md leading-relaxed">
                                    <p className="text-red-600">면허증.자격증.경력증명서 사진은 필수 등록해야 합니다.</p>
                                    <p className="text-[#3e4947] mt-1">등록한 사진은 운영팀에서 48시간내에 검토 완료 합니다.</p>
                                    <p className="text-[#3e4947]">검토 완료 안내를 PUSH MESSAGE로 보내 드립니다.</p>
                                </div>
                            </div>
                            <button onClick={handleSubmit} disabled={submitting} className="w-full md:w-auto px-12 py-4 rounded-xl bg-gradient-to-br from-[#004e47] to-[#00685f] text-white font-headline font-extrabold text-lg shadow-[0_20px_40px_-10px_rgba(0,104,95,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,104,95,0.4)] active:scale-95 transition-all duration-300">
                                {submitting ? '처리 중...' : '검토 요청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* 공용 앨범 선택용 hidden input (한글 주석: 프로필 사진이 아닐 땐 PDF도 선택 가능하게 설정) */}
            <input 
                type="file" 
                ref={commonAlbumInputRef} 
                className="hidden" 
                onChange={(e) => handleFileChange(e, activeUploadType)} 
                accept={activeUploadType === 'profileImg' ? 'image/*' : 'image/*,application/pdf'} 
            />
            {/* 공용 카메라 촬영용 hidden input */}
            <input 
                type="file" 
                ref={commonCameraInputRef} 
                className="hidden" 
                onChange={(e) => handleFileChange(e, activeUploadType)} 
                accept="image/*" 
                capture="environment" 
            />

            {/* 공용 사진/서류 업로드 바텀 시트 */}
            {showPhotoBottomSheet && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowPhotoBottomSheet(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center text-[#191c1e]">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        <div className="space-y-2 text-left">
                            <h3 className="font-extrabold text-xl text-teal-900">서류 및 사진 등록</h3>
                            <p className="text-sm text-slate-500 font-semibold">업로드할 방식을 선택해 주세요.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => {
                                    setShowPhotoBottomSheet(false);
                                    commonCameraInputRef.current.click();
                                }}
                                className="flex flex-col items-center justify-center p-5 bg-teal-50 hover:bg-teal-100/70 text-[#004e47] rounded-xl border border-teal-100/50 active:scale-95 transition-all space-y-2 font-bold"
                            >
                                <span className="material-symbols-outlined text-4xl text-teal-800">photo_camera</span>
                                <span className="text-sm">카메라로 촬영</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setShowPhotoBottomSheet(false);
                                    commonAlbumInputRef.current.click();
                                }}
                                className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-100/50 active:scale-95 transition-all space-y-2 font-bold"
                            >
                                <span className="material-symbols-outlined text-4xl text-slate-500">image</span>
                                <span className="text-sm">앨범에서 선택</span>
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowPhotoBottomSheet(false)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold active:scale-[0.98] transition-all text-center text-sm"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* 알림 설정 바텀 시트 (Premium UX) */}
            {showAlarmBottomSheet && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowAlarmBottomSheet(false)}></div>
                    
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center text-[#191c1e]">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        
                        <div className="space-y-2 text-left">
                            <h3 className="font-extrabold text-xl text-teal-900">마케팅 정보 수신 및 알림 설정</h3>
                            <p className="text-sm text-slate-500 font-semibold">동의하신 매체로 할인 혜택 및 중요한 이벤트 정보를 알려드립니다.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                            {/* 전체 동의 */}
                            <div className="pb-4 border-b border-slate-200 text-left">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${marketing.agree ? 'bg-[#004e47] border-[#004e47]' : 'border-slate-300 bg-white'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={marketing.agree}
                                            onChange={(e) => handleMarketingAll(e.target.checked)}
                                        />
                                        {marketing.agree && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                    </div>
                                    <span className="text-base font-black text-[#191c1e]">모두 동의합니다.</span>
                                </label>
                             </div>
                             
                             {/* 개별 매체 */}
                             <div className="grid grid-cols-2 gap-4 ml-2 text-left">
                                 {[
                                     { id: 'sms', label: 'SMS' },
                                     { id: 'push', label: '앱 푸시' },
                                     { id: 'email', label: '이메일' },
                                     { id: 'tel', label: '유선전화' }
                                 ].map(m => (
                                     <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${marketing[m.id] ? 'bg-[#004e47] border-[#004e47]' : 'border-slate-300 bg-white'}`}>
                                             <input
                                                 type="checkbox"
                                                 className="hidden"
                                                 checked={marketing[m.id]}
                                                 onChange={(e) => {
                                                     const updated = { ...marketing, [m.id]: e.target.checked };
                                                     // 4개 매체가 모두 참이면 전체 동의도 참, 하나라도 거짓이면 전체 동의는 거짓
                                                     const allChecked = updated.sms && updated.push && updated.email && updated.tel;
                                                     setMarketing({ ...updated, agree: allChecked });
                                                 }}
                                             />
                                             {marketing[m.id] && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                         </div>
                                         <span className="text-sm font-semibold text-[#3e4947] group-hover:text-[#004e47] transition-colors">{m.label}</span>
                                     </label>
                                 ))}
                             </div>
                         </div>
                         
                         <button 
                             onClick={() => setShowAlarmBottomSheet(false)}
                             className="w-full bg-[#004e47] text-white py-4 rounded-xl font-bold active:scale-[0.98] transition-all text-center text-sm shadow-lg shadow-teal-900/20"
                         >
                             확인
                         </button>
                     </div>
                 </div>
             )}

            {/* 약관 및 정책 바텀 시트 (Premium UX) */}
            {showTermsBottomSheet && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowTermsBottomSheet(false)}></div>
                    
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center text-[#191c1e]">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        
                        <div className="space-y-2 text-left">
                            <h3 className="font-extrabold text-xl text-teal-800">약관 및 정책</h3>
                            <p className="text-sm text-slate-500 font-semibold">고객님께서 가입 시 동의하신 약관 및 정책 상세 내역입니다.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 text-left">
                            {termsConsent.map(term => (
                                <div key={term.id} className="flex flex-col gap-1 pb-3 border-b border-slate-200/60 last:border-b-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
                                            <span className={term.required ? "text-[#004e47] text-xs" : "text-slate-400 text-xs"}>
                                                {term.required ? '[필수]' : '[선택]'}
                                            </span>
                                            {term.label}
                                        </span>
                                        <button
                                            onClick={() => {
                                                let contentKey = term.id;
                                                if (term.id === 'traveler') {
                                                    contentKey = 'driver'; // 기사정보 화면이므로 'driver' 고정
                                                }
                                                handleShowTerms(term.label, TERMS_CONTENTS[contentKey]);
                                            }}
                                            className="text-xs text-blue-600 underline font-bold tracking-tighter"
                                        >
                                            상세보기
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1">
                                        <span>동의 여부: <strong className={term.agreeYn === 'Y' ? 'text-teal-600' : 'text-rose-500'}>{term.agreeYn === 'Y' ? '동의 (Y)' : '미동의 (N)'}</strong></span>
                                        {term.agreeYn === 'Y' && term.agreeDt ? (
                                            <span>동의 일자: <strong>{term.agreeDt}</strong></span>
                                        ) : (
                                            <span>동의 일자: <strong>-</strong></span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => setShowTermsBottomSheet(false)}
                            className="w-full bg-[#004e47] text-white py-4 rounded-xl font-bold active:scale-[0.98] transition-all text-center text-sm shadow-lg shadow-teal-900/20"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            <BottomNavDriver />
        </div>
    );
};

export default DriverInfoRegistration;
