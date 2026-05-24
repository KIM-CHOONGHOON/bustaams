import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getCustomerProfile, updateCustomerProfile, changePassword, uploadProfileImage, sendAuthCode, verifyAuthCode } from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';
import Avatar from '../components/Avatar';

const TERMS_CONTENTS = {
    service: `버스타암스(BusTaams) 통합 이용약관\n\n제1조 (목적)\n본 약관은 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통해 제공되는 전세버스 청약 및 관련 부가 서비스의 이용과 관련하여, 회사와 회원(여행자, 버스기사 파트너, 영업 파트너) 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.\n\n제2조 (용어의 정의)\n1. 여행자(이용자): 플랫폼에 가입하여 전세버스 청약을 요청하고 계약금을 결제하여 서비스를 이용하는 자를 말합니다.\n2. 버스기사 파트너(기사): 플랫폼의 자격 검증을 거쳐 여행자의 청약을 수락하고 운송 서비스를 제공하는 자를 말합니다.\n3. 영업 파트너(프리랜서): 플랫폼에 버스기사를 유치하고, 해당 기사의 활동 실적에 따라 배당 수수료를 지급받는 자를 말합니다.\n4. 계약 확정: 여행자의 계약금 결제와 버스기사 파트너의 승인이 동시에 완료되어 상호 연락처가 공개된 시점을 의미합니다.\n5. 1원 인증: 계좌의 실존 여부 및 소유주 일치를 확인하기 위해 결제 대행사(PG) API를 통해 수행하는 금융 검증 절차를 말합니다.\n\n제3조 (서비스의 내용 및 매칭 로직)\n회사는 플랫폼을 통해 다음의 지능형 중개 서비스를 제공합니다.\n1. 역경매 기반 매칭: 여행자가 희망 요금을 제시하고, 파트너가 이를 수락하거나 제안하는 양방향 매칭 시스템을 운영합니다.\n2. 실시간 연락처 공개: 여행자의 계약금(이용 금액의 6.6%) 입금 및 파트너의 승인이 완료되는 즉시 상호 연락처를 공개하여 직접 소통을 지원합니다.\n3. 자격 검증 자동화: API 연동을 통해 버스운전자격, 면허 유효성, 사업자 휴·폐업 상태를 실시간 모니터링합니다.\n\n제4조 (이용요금 및 결제)\n1. 여행자: 청약 확정 시 이용 금액의 6.6%(부가세 포함)를 플랫폼에 계약금으로 결제해야 합니다.\n2. 버스기사 파트너: 선택한 수수료 플랜(건별/일반/중급/고급)에 따라 정보 이용료를 납부하며, 여행자의 계약금에서 관리비를 차감한 금액을 정산받습니다.\n3. 영업 파트너: 유치한 기사의 매출 기여도에 따라 10%~20%의 구간별 배당 수수료를 지급받습니다.\n\n제5조 (자동 서비스 완료 및 정산)\n1. 자동 완료 (Batch): 운행 종료일 경과 후 1일 차 새벽(00:00:01)에 별도의 취소 요청이 없으면 시스템이 자동으로 '서비스 완료' 처리를 수행합니다.\n2. 정산 주기: 확정된 정산 금액은 매월 말일 기준으로 정산하여 익월 5일(파트너) 또는 10일(영업 파트너)에 지정된 계좌로 지급됩니다.\n3. 인증 필수: 모든 정산은 제2조 5항에 따른 '1원 인증'이 완료된 계좌로만 가능합니다.\n\n제6조 (계약 파기 및 이용자 보호)\n1. 이용자 귀책: 계약 확정 후 이용자의 일방적 취소 시 계약금은 회사에 귀속됩니다.\n2. 파트너 귀책: 계약 확정 후 파트너의 일방적 취소 시 파트너는 위약금 500,000원을 납부해야 하며, 회사는 이용자에게 다음 중 하나의 보호 조치를 제공합니다.\n- 계약금 4배 환불: 이용자가 입금한 계약금의 4배 전액을 환불 처리합니다.\n- 대체 차량 제공: 동급 이상의 다른 차량을 수급하여 제공하며, 이 경우 환불 의무를 대신합니다.\n3. 면제 사유: 본인/가족 사망, 차량 파손, 법정 구속, 입원 등 약관에서 정한 불가항력적 사유를 증빙할 경우 위약 규정을 적용하지 않습니다.\n\n제7조 (전자 서명 및 동의)\n1. 모든 회원은 가입 및 서비스 이용 시 플랫폼에서 제공하는 전자 서명(싸인) 패드를 통해 직접 서명하고 동의 버튼을 클릭해야 합니다.\n2. 해당 전자 서명 데이터는 법적 효력을 가지며, 계약 이행의 증빙 자료로 활용됩니다.\n\n제8조 (패널티 및 품질 관리)\n1. 회사는 정당한 사유 없이 계약을 파기하거나 직거래를 유도하는 회원을 모니터링하며, 위반 횟수에 따라 이용 제한(1주일~영구 탈퇴) 조치를 취합니다.\n2. 단, 위약금을 전액 납부하거나 대체 차량을 제공하여 이용자 보호 의무를 다한 파트너에게는 패널티 적용을 면제할 수 있습니다.\n\n제9조 (개인정보 보호 및 관할 법원)\n1. 회사는 별도로 고지된 개인정보 처리방침에 따라 회원의 정보를 보호합니다.\n2. 서비스 이용과 관련하여 발생한 분쟁의 관할 법원은 회사의 소재지 관할 법원으로 합니다.\n\n부칙\n본 방침은 2026년 1월 31일부터 시행됩니다.`,
    privacy: `개인정보 처리방침 (BusTaams)\n\n(주)청솔테크(이하 '회사')는 개인정보보호법 및 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n제1조 (개인정보의 처리 목적)\n회사는 전세버스 중개 플랫폼 '버스타암스' 운영을 위해 다음의 목적을 위하여 개인정보를 처리합니다.\n1. 서비스 중개 및 계약 이행: 전세버스 역경매 청약 제공, 여행자와 버스기사(파트너) 간 매칭, 계약금 결제 및 정산 처리.\n2. 파트너 자격 검증: 버스운전자격증, 면허증, 적성정밀검사 결과 등 API 연동을 통한 실시간 자격 확인.\n3. 영업 파트너 관리: 추천인 번호를 기반으로 한 영업 실적 관리 및 배당 수수료 정산.\n4. 회원 관리 및 부정 이용 방지: 본인 확인, 전자 서명 관리, 부당한 취소 및 노쇼(No-show) 회원의 패널티 관리.\n\n제2조 (수집하는 개인정보 항목 및 방법)\n회사는 서비스 제공 및 정산의 정확성을 위해 필요한 최소한의 정보를 수집합니다.\n1. 여행자(이용자) 회원\n• 필수: 성명, 휴대전화번호, 이메일, 본인인증 정보(CI/DI), 전자 서명 데이터.\n• 선택: 여행 일정(출발/도착지), 탑승 인원, 선호 차량 사양 등.\n2. 버스기사 파트너 회원\n• 필수: 성명, 연락처, 버스운전자격증 번호, 운전면허 번호, 사업자 정보, 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.\n• 증빙 서류: 운전적성정밀검사 적합 판정표, 자격증 사진, 차량 등록 정보.\n3. 영업 파트너(프리랜서)\n• 필수: 성명, 연락처, 주민등록번호(세무 신고용), 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.\n4. 수집 방법: 앱/웹 가입, 서류 업로드, API 연동 검증(한국교통안전공단, 경찰청, 국세청 등), 서비스 이용 과정에서의 자동 생성.\n\n제3조 (개인정보의 제3자 제공)\n회사는 원활한 서비스 이행을 위해 이용자의 개인정보 제공 범위를 다음과 같이 제한합니다.\n1. 제공 시점: 여행자의 계약금 결제(6.6%)와 버스기사 파트너의 승인이 완료되어 계약이 체결된 즉시.\n2. 제공 대상: 매칭된 여행자와 버스기사 파트너.\n3. 제공 항목: 상호 성명(상호명), 연락처, 배차 정보.\n4. 제공 목적: 세부 운행 일정 협의 및 서비스 이행을 위한 상호 통신.\n\n제4조 (개인정보의 보유 및 이용 기간)\n1. 보유 기간: 회원 탈퇴 시까지 보유하나, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보존합니다.\n2. 거래 관련 보관: 계약 취소, 위약금 발생, 정산 기록 등은 5년간 보존합니다. (전자상거래법 기준)\n3. 영업 실적 보관: 영업 파트너의 배당 관리를 위해 마지막 실적 발생일로부터 최소 6개월 이상 보존합니다.\n\n제5조 (보안 및 기술적 대책)\n1. 1원 인증 검증: 결제 대행사(PG) API를 연동하여 정산 계좌의 실존 여부와 소유주 일치 여부를 실시간 검증합니다.\n2. 전자 서명 보호: 이용자와 파트너가 직접 입력한 전자 서명(싸인)은 암호화되어 저장되며 계약 증빙 외 용도로 사용하지 않습니다.\n3. 접근 제어: 계약이 확정되지 않은 상태에서의 개인 식별 정보 접근을 엄격히 통제합니다.\n\n제6조 (이용자의 권리·의무 및 행사방법)\n1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며 수집·이용 동의를 철회할 수합니다.\n2. 다만, 계약 확정 이후 연락처가 공개된 경우에는 서비스 이행 및 관련 법령에 따라 일부 정보의 삭제가 제한될 수 있습니다.\n\n제7조 (개인정보 보호책임자)\n• 성명: 원동일\n• 직책: 대표이사\n• 연락처: 02-429-5459 / bustaams@gmail.com`,
    traveler: `여행자(이용자) 가입 및 이용 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 가입을 신청한 여행자(이하 “이용자”)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “이용자”가 가입하여 특허 시스템 기반의 중개 프로세스(계약금 입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (가입 자격 및 승인)\n1. “이용자”는 가입 신청 시 본인 실명 인증 절차를 거쳐야 한다.\n2. [계약의 성립] 본 계약은 “이용자”가 플랫폼(웹/앱)상에서 제공하는 전자 서명(싸인)을 하고 동의 절차에 따라 버튼을 클릭함으로써 본 계약에 확정적으로 전자 서명한 것으로 간주하며, 신청 완료 시점부터 효력이 발생한다.\n\n제3조 (서비스 이용 및 계약 체결)\n1. [청약 등록] “이용자”는 플랫폼에서 요구하는 기본 조건(출발지, 도착지, 탑승 인원, 일시 등)을 완성한 후, 희망 이용요금을 직접 입력하여 청약을 등록한다.\n2. [계약금 결제] “이용자”는 청약 내용에 부합하는 파트너(버스기사)의 제안을 선택하거나 매칭되었을 때, 이용 금액의 6.6%(부가세 포함)를 계약금으로 결제(카드 또는 계좌이체)함으로써 계약을 완료한다.\n3. [연락처 즉시 공개] 계약금 결제 완료 후 파트너가 이를 승인하면 상호 연락처가 즉시 공개되며, 이때부터 자유로운 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (이용 요금 및 수수료)\n1. [가입 수수료] 플랫폼 가입 수수료는 11,000원(부가세 포함)이다. (단, “사업자”가 지정하는 일정 기간 가입 수수료를 면제할 수 있다.)\n2. [중개 수수료] “이용자”에게는 별도의 중개 수수료가 발생하지 않는다. (단, 제3조 2항의 계약금은 플랫폼 서비스 이용료 및 예약 보증금 성격을 포함한다.)\n\n제5조 (취소 및 이용자 보호 권리)\n1. [이용자 귀책 취소] 계약 체결 후 “이용자”가 특별한 사유 없이 일방적으로 취소할 경우, 기 납부한 계약금은 “사업자”에게 귀속되며 반환되지 않는다.\n2. [파트너 귀책 취소 및 보상] 계약 체결 후 파트너(버스기사)의 귀책으로 계약이 파기될 경우, “이용자”는 다음 중 하나의 보호 조치를 받을 권리가 있다.\n- 계약금 4배 환불: “사업자”는 이용자가 입금한 계약금의 4배 전액을 위약금으로 지급한다.\n- 대체 차량 제공: “사업자”가 원래의 계약 조건과 동일한 급 이상의 다른 차량을 수급하여 제공하는 경우, 위 위약금 지급을 대신할 수 있다.\n3. [위약 예외 사유] 다음 각 호의 사유로 인한 취소는 정확한 증빙이 제출되고 “사업자”가 인정한 경우에 한하여 위약 규정을 적용하지 않는다.\n1) 본인 사망 2) 차량 파손 (운행 불가) 3) 법정 구속 4) 직계존비속 및 배우자 사망 5) 질병 또는 사고에 의한 입원 6) 사고에 의한 당일 통원치료\n\n제6조 (패널티 및 품질 관리)\n시스템은 “이용자”의 취소 이력을 자동 모니터링하며, 제5조 3항의 특별한 사유 없이 결제 취소 또는 계약 파기가 반복될 경우 다음과 같이 이용을 제한한다.\n• 1회 발생 시: 3개월간 이용 제한\n• 2회 발생 시: 6개월간 이용 제한\n• 3회 발생 시: 9개월간 이용 제한\n• 4회 발생 시: 본 계약 해지 및 영구 가입 제한\n\n제7조 (관할 법원)\n본 계약과 관련한 분쟁의 관할 법원은 “사업자”의 소재지 관할 법원으로 한다.`,
    driver: `버스기사 파트너 입점 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 입점을 신청한 버스기사(이하 “파트너”)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “파트너”가 입점하여 여행자(이용자)가 제시한 이용 청약을 확인하고, 특허 시스템 기반의 즉시 매칭 프로세스(계약금 선입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (입점 자격 및 승인)\n1. [임시 회원 가입] “파트너”는 입점 신청 시 버스운전자격증 번호, 운전면허증 번호, 사업자 정보를 필수 입력하고 실시간 검증을 완료하여야 한다.\n2. [계좌 등록 및 1원 인증] “파트너”는 정산 계좌를 등록하고 “사업자”가 입금한 1원의 입금자명을 확인하여 인증 절차를 완료해야 한다. (PortOne 등 PG API 활용)\n3. [정회원 승인] 운전적성정밀검사 적합 판정표 및 자격증 사진을 업로드해야 하며, “사업자”의 최종 확인 후 정회원으로 승인된다.\n4. [계약의 성립] 본 계약은 “파트너”가 플랫폼상에서 제공하는 전자 서명(싸인)을 하고 동의 버튼을 클릭함으로써 성립한다.\n\n제3조 (실시간 매칭 및 연락처 공개)\n1. [계약 확정] “이용자”의 계약금 입금이 완료된 청약에 대하여 “파트너”가 승인 버튼을 클릭하는 즉시 계약이 최종 확정된다.\n2. [연락처 공개] 계약 확정 즉시 양측의 연락처가 공개되며, 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (수수료 체계 및 해지 환불)\n1. 건별형: 이용 수수료 없음 (이용자 계약금의 6%를 수수료로 대체)\n2. 정액형 (일반/중급/고급): 월 정액 선납 방식. 이용자 계약금 중 관리비 1% 차감 후 정산 지급.\n- 정산일: 월말 기준 정산하여 익월 5일 지급.\n- 중도 해지 시 남은 일수에 대해 규정에 따라 환불 처리.\n\n제5조 (자동 관리 및 계약 확정 로직)\n운행 종료일 경과 후 1일 차 새벽(00:00:01)에 별도의 취소 요청이 없으면 시스템이 자동으로 '서비스 완료' 처리한다.\n\n제6조 (계약 파기에 따른 위약금 및 이용자 보호)\n1. [취소 위약금] 계약 확정 후 파트너의 일방적 변심으로 파기 시 위약금 500,000원을 사업자에게 지급해야 한다.\n2. [이용자 보호] 파트너 귀책 시 사업자는 이용자에게 계약금 4배 환불 또는 대체 차량 제공을 책임지고 이행한다.\n3. [면제 사유] 본인 사망, 차량 파손, 법정 구속, 입원 등 불가항력적 사유 증빙 시 위약금을 면제한다.\n\n제7조 (품질 관리 및 패널티)\n- 1회 취소 시: 1주일간 신규 참여 제한\n- 2회 취소 시: 2주일간 신규 참여 제한\n- 3회 취소 시: 계약 즉시 해지 가능\n(단, 위약금 전액 납부 또는 대체 차량 제공 시 패널티 미적용)\n\n제8조 (개인정보 보호) 이용자의 정보를 서비스 목적으로만 사용하며 외부 유출 시 책임을 진다.\n제9조 (관할 법원) 사업자의 소재지 관할 법원으로 한다.`,
    marketing: `본 동의서는 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스타암스(BUSTAAMS)”에서 제공하는 서비스의 홍보, 이벤트, 맞춤형 정보 제공을 위해 이용자의 개인정보를 수집 및 활용하는 것에 대한 동의를 구하는 내용입니다.\n\n1. 수집 및 이용 목적\n회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.\n• 공통: 신규 서비스 홍보 및 이벤트 정보 안내, 맞춤형 혜택 제공, 마케팅 전략 수립 및 통계 분석\n• 기사 회원: 운행 관련 프로모션, 차량 관리 서비스 안내, 제휴 서비스 홍보\n• 여행 회원: 여행 상품 추천, 할인 쿠폰 제공, 지역 축제 및 행사 정보 안내\n\n2. 수집 항목\n• 이름, 휴대전화번호, 이메일, 주소, 서비스 이용 기록, 접속 로그\n\n3. 보유 및 이용 기간\n• 회원 탈퇴 시 또는 동의 철회 시까지\n(단, 관련 법령에 의해 보존이 필요한 경우 해당 기간까지 보관)\n\n4. 동의 거부 권리 및 불이익\n• 귀하는 본 마케팅 정보 활용 동의를 거부할 권리가 있습니다.\n• 거부 시에도 버스타암스의 기본 서비스(예약, 운행 등) 이용에는 제한이 없으나, 이벤트 참여 및 맞춤형 혜택 안내를 받지 못할 수 있습니다.`
};

const ProfileCustomer = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null); // 앨범 선택용 Ref
    const cameraInputRef = useRef(null); // 카메라 직접 촬영용 Ref

    // 사진 선택 바텀 시트 상태
    const [showPhotoBottomSheet, setShowPhotoBottomSheet] = useState(false);

    // 사용자 정보 상태
    const [userData, setUserData] = useState({
        name: '',
        phone: '',
        email: '',
        userType: '',
        profileImage: ''
    });

    // 비밀번호 변경 상태
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(true);

    // 인증 관련 상태
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(true); // 초기에는 인증된 상태로 간주
    const [originalPhone, setOriginalPhone] = useState('');
    const [idToken, setIdToken] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now()); // 이미지 캐시 버스팅용 상태

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

    const validatePassword = (pw) => {
        const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pw);
    };

    // 초기 데이터 로드
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await getCustomerProfile();
            if (response.status === 200 || response.success) {
                const data = response.data;
                setUserData({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    userType: data.userType || '',
                    profileImage: data.profileImage || '',
                    userId: data.userId || '' // 아이디 정보 저장
                });
                setOriginalPhone(data.phone || '');
                setImageVersion(Date.now()); // 데이터 로드 시 버전 초기화

                // 마케팅 동의 데이터 로드
                if (data.marketing) {
                    setMarketing({
                        agree: data.marketing.agree || false,
                        sms: data.marketing.sms || false,
                        push: data.marketing.push || false,
                        email: data.marketing.email || false,
                        tel: data.marketing.tel || false
                    });
                }

                // 약관 동의 이력 데이터 로드
                if (data.termsConsent) {
                    setTermsConsent(data.termsConsent);
                }
            }
        } catch (error) {
            console.error('프로필 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 정보 수정 핸들러
    const handleUpdateInfo = async () => {
        if (userData.phone !== originalPhone && !isVerified) {
            notify.warn('인증 필요', '휴대폰 번호 변경 시 인증이 필요합니다.');
            return;
        }

        try {
            const response = await updateCustomerProfile({
                name: userData.name,
                phone: userData.phone,
                email: userData.email,
                firebaseToken: userData.phone !== originalPhone ? idToken : null,
                marketing: marketing // 알림 수신동의 내역 전송
            });
            notify.success('정보 수정 완료', response.message || '정보가 성공적으로 수정되었습니다.');
            setOriginalPhone(userData.phone);
            setIsVerified(true);
            fetchProfile();
        } catch (error) {
            notify.error('수정 실패', error.message || '정보 수정에 실패했습니다.');
        }
    };



    // SMS 인증번호 전송 (Aligo)
    const handleSendSMS = async () => {
        if (!userData.phone) {
            notify.warn('번호 입력', '휴대폰 번호를 입력해주세요.');
            return;
        }

        try {
            const res = await sendAuthCode(userData.phone, 'verify');
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

    // 인증번호 확인 (Aligo)
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            notify.warn('입력 필요', '인증번호를 입력해주세요.');
            return;
        }

        try {
            const res = await verifyAuthCode(userData.phone, verificationCode, 'verify');
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

    // 비밀번호 변경 핸들러
    const handleUpdatePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            notify.warn('입력 필요', '비밀번호를 입력해주세요.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            notify.error('불일치', '새 비밀번호가 일치하지 않습니다.');
            return;
        }

        // 비밀번호 강도 체크
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(passwordData.newPassword)) {
            notify.warn('규칙 위반', '비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
            return;
        }

        try {
            const response = await changePassword(passwordData.currentPassword, passwordData.newPassword);
            notify.success('변경 완료', response.message || '비밀번호가 변경되었습니다.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            notify.error('변경 실패', error.message || '비밀번호 변경에 실패했습니다.');
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const response = await uploadProfileImage(file);
            notify.success('이미지 변경', '프로필 이미지가 성공적으로 변경되었습니다.');
            
            // 업로드 성공 후 전체 데이터를 다시 불러와서 동기화
            await fetchProfile();
        } catch (error) {
            notify.error('업로드 실패', error.message || '이미지 업로드 실패');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-['Manrope'] text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 shadow-[0px_4px_20px_rgba(0,104,95,0.05)]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform duration-200 text-teal-700">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-xl tracking-tight text-teal-700">회원정보 관리</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-slate-500">settings</span>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-2xl mx-auto space-y-10">
                {/* Profile Header Section */}
                <section className="flex flex-col items-start gap-6 pt-4">
                    <div className="relative group">
                        <Avatar
                            profileImage={userData.profileImage}
                            imageVersion={imageVersion}
                            className="w-24 h-24 rounded-xl overflow-hidden shadow-xl ring-4 ring-surface-container-low bg-slate-100 flex items-center justify-center cursor-pointer"
                            onClick={() => setShowPhotoBottomSheet(true)}
                        />
                        <button 
                            onClick={() => setShowPhotoBottomSheet(true)}
                            className="absolute bottom-0 right-0 bg-primary p-2 rounded-xl text-white shadow-lg active:scale-90 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        {/* 앨범에서 선택용 hidden input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageChange}
                            accept="image/*"
                        />
                        {/* 카메라 직접 촬영용 hidden input */}
                        <input 
                            type="file" 
                            ref={cameraInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageChange}
                            accept="image/*"
                            capture="environment"
                        />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
                            {userData.name} <span className="text-primary text-base font-medium ml-2">{userData.userType === 'TRAVELER' ? 'Premium Member' : 'Driver Partner'}</span>
                        </h2>
                        <p className="text-on-surface-variant font-medium">{userData.userId}</p>
                    </div>
                </section>

                {/* Personal Info Form */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl">person</span>
                            개인 정보
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">성명</label>
                            <input 
                                className="w-full bg-surface-container-high border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium text-left" 
                                type="text" 
                                value={userData.name}
                                onChange={(e) => setUserData({...userData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">휴대전화 번호</label>
                            <div className="flex gap-2">
                                <input 
                                    className={`flex-1 bg-surface-container-high border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium text-left ${!isVerified && userData.phone !== originalPhone ? 'ring-2 ring-error/20' : ''}`} 
                                    type="tel" 
                                    value={userData.phone}
                                    onChange={(e) => {
                                        setUserData({...userData, phone: e.target.value});
                                        if (e.target.value !== originalPhone) setIsVerified(false);
                                        else setIsVerified(true);
                                    }}
                                />
                                <button 
                                    onClick={handleSendSMS}
                                    className="bg-primary text-white px-4 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-transform"
                                >
                                    {verificationSent ? '재발송' : '인증번호 전송'}
                                </button>
                            </div>

                        </div>

                        {verificationSent && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold uppercase tracking-widest text-primary px-1">인증번호 입력</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium text-left" 
                                        type="number" 
                                        placeholder="6자리 숫자를 입력하세요"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleVerifyCode}
                                        className="bg-secondary text-white px-6 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-transform shadow-lg shadow-secondary/20"
                                    >
                                        확인
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">이메일</label>
                            <input 
                                className="w-full bg-surface-container-high border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium text-left" 
                                type="email" 
                                value={userData.email}
                                onChange={(e) => setUserData({...userData, email: e.target.value})}
                            />
                            <p className="text-[10px] text-on-surface-variant px-1">* 이메일은 로그인 시 보조 연락처로 활용됩니다.</p>
                        </div>
                    </div>
                </section>

                {/* Account Settings */}
                <section className="space-y-6">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">shield_person</span>
                        계정 설정
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Password Change Expanded */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_10px_40px_rgba(0,0,0,0.04)] border-l-4 border-secondary space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary">lock_reset</span>
                                    비밀번호 변경
                                </span>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1">이전 비밀번호</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
                                        placeholder="현재 비밀번호를 입력하세요" 
                                        type="password" 
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1">신규 비밀번호</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
                                        placeholder="새 비밀번호를 입력하세요" 
                                        type="password" 
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    />
                                    {passwordData.newPassword && (
                                        <p className={`text-[10px] ml-1 font-bold ${validatePassword(passwordData.newPassword) ? 'text-green-600' : 'text-red-500'}`}>
                                            {validatePassword(passwordData.newPassword) ? '✔ 사용 가능한 비밀번호입니다.' : '✘ 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1">신규 비밀번호 확인</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
                                        placeholder="새 비밀번호를 다시 입력하세요" 
                                        type="password" 
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    />
                                    {passwordData.confirmPassword && (
                                        <p className={`text-[10px] ml-1 font-bold ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                            {passwordData.newPassword === passwordData.confirmPassword ? '✔ 비밀번호가 일치합니다.' : '✘ 비밀번호가 일치하지 않습니다.'}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={handleUpdatePassword}
                                    className="w-full bg-secondary text-white py-3.5 rounded-xl text-sm font-bold mt-2 hover:bg-on-secondary-container transition-colors"
                                >
                                    비밀번호 변경하기
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Preferences Section */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">tune</span>
                        환경 설정
                    </h3>
                    <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                        <div 
                            onClick={() => setShowAlarmBottomSheet(true)}
                            className="flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors cursor-pointer group border-b border-white/50"
                        >
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                                <span className="font-medium">알림 설정</span>
                            </div>
                            <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </div>
                        <div 
                            onClick={() => setShowTermsBottomSheet(true)}
                            className="flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-on-surface-variant">policy</span>
                                <span className="font-medium">약관 및 정책</span>
                            </div>
                            <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </div>
                    </div>
                </section>

                {/* Confirm Button */}
                <div className="pt-8">
                    <button 
                        onClick={handleUpdateInfo}
                        className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        정보 수정 완료
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    </button>
                    <button 
                        onClick={async () => {
                            const confirmed = await notify.confirm('회원 탈퇴', '정말로 탈퇴하시겠습니까? 관련 데이터가 모두 삭제됩니다.');
                            if (confirmed) {
                                notify.info('탈퇴 처리 중', '잠시만 기다려주세요.');
                                // 탈퇴 로직 실행...
                            }
                        }}
                        className="w-full py-4 mt-4 text-outline font-semibold hover:text-error transition-colors"
                    >
                        회원 탈퇴하기
                    </button>
                </div>
            </main>

            {/* Bottom Nav Bar (Main Dashboard Style) */}
            <BottomNavCustomer />

            {/* 사진 업로드 바텀 시트 (Premium UX) */}
            {showPhotoBottomSheet && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    {/* 어두운 배경 클릭 시 닫기 */}
                    <div className="absolute inset-0" onClick={() => setShowPhotoBottomSheet(false)}></div>
                    
                    {/* 바텀 시트 본체 */}
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center">
                        {/* 상단 드래그 핸들 이미지 표현 */}
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        
                        <div className="space-y-2">
                            <h3 className="font-extrabold text-xl text-teal-800">프로필 사진 업로드</h3>
                            <p className="text-sm text-slate-500 font-semibold">사진을 등록할 방식을 선택해 주세요.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => {
                                    setShowPhotoBottomSheet(false);
                                    cameraInputRef.current.click();
                                }}
                                className="flex flex-col items-center justify-center p-5 bg-teal-50 hover:bg-teal-100/70 text-teal-800 rounded-xl border border-teal-100/50 active:scale-95 transition-all space-y-2 font-bold"
                            >
                                <span className="material-symbols-outlined text-4xl text-teal-700">photo_camera</span>
                                <span className="text-sm">카메라로 촬영</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setShowPhotoBottomSheet(false);
                                    fileInputRef.current.click();
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
                    
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        
                        <div className="space-y-2">
                            <h3 className="font-extrabold text-xl text-teal-800">마케팅 정보 수신 및 알림 설정</h3>
                            <p className="text-sm text-slate-500 font-semibold">동의하신 매체로 할인 혜택 및 중요한 이벤트 정보를 알려드립니다.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                            {/* 전체 동의 */}
                            <div className="pb-4 border-b border-slate-200">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={marketing.agree}
                                            onChange={(e) => handleMarketingAll(e.target.checked)}
                                        />
                                        {marketing.agree && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                    </div>
                                    <span className="text-base font-black text-on-surface">모두 동의합니다.</span>
                                </label>
                             </div>
                             
                             {/* 개별 매체 */}
                             <div className="grid grid-cols-2 gap-4 ml-2">
                                 {[
                                     { id: 'sms', label: 'SMS' },
                                     { id: 'push', label: '앱 푸시' },
                                     { id: 'email', label: '이메일' },
                                     { id: 'tel', label: '유선전화' }
                                 ].map(m => (
                                     <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${marketing[m.id] ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
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
                                         <span className="text-sm font-semibold text-on-surface-variant group-hover:text-primary transition-colors">{m.label}</span>
                                     </label>
                                 ))}
                             </div>
                         </div>
                         
                         <button 
                             onClick={() => setShowAlarmBottomSheet(false)}
                             className="w-full bg-primary text-white py-4 rounded-xl font-bold active:scale-[0.98] transition-all text-center text-sm shadow-lg shadow-primary/20"
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
                    
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        
                        <div className="space-y-2">
                            <h3 className="font-extrabold text-xl text-teal-800">약관 및 정책</h3>
                            <p className="text-sm text-slate-500 font-semibold">고객님께서 가입 시 동의하신 약관 및 정책 상세 내역입니다.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 text-left">
                            {termsConsent.map(term => (
                                <div key={term.id} className="flex flex-col gap-1 pb-3 border-b border-slate-200/60 last:border-b-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
                                            <span className={term.required ? "text-primary text-xs" : "text-slate-400 text-xs"}>
                                                {term.required ? '[필수]' : '[선택]'}
                                            </span>
                                            {term.label}
                                        </span>
                                        <button
                                            onClick={() => {
                                                let contentKey = term.id;
                                                if (term.id === 'traveler') {
                                                    contentKey = userData.userType === 'DRIVER' ? 'driver' : 'traveler';
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
                            className="w-full bg-primary text-white py-4 rounded-xl font-bold active:scale-[0.98] transition-all text-center text-sm shadow-lg shadow-primary/20"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileCustomer;
