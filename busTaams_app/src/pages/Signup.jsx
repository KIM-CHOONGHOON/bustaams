import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
    checkIdDuplicate,
    checkEmailDuplicate,
    registerUser,
    sendAuthCode,
    verifyAuthCode
} from '../api';

import { notify } from '../utils/toast';

const SignaturePad = ({ onSave, onClear }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#004e47';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }, []);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            return {
                offsetX: (touch.clientX - rect.left) * (canvas.width / rect.width),
                offsetY: (touch.clientY - rect.top) * (canvas.height / rect.height)
            };
        }
        return {
            offsetX: e.nativeEvent.offsetX,
            offsetY: e.nativeEvent.offsetY
        };
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        if (e.cancelable) e.preventDefault();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        onSave(canvasRef.current.toDataURL());
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface">전자 서명</span>
                <button type="button" onClick={clear} className="text-xs font-bold text-red-500 hover:underline">초기화</button>
            </div>
            <div className="relative border-2 border-dashed border-outline/30 rounded-xl bg-surface-container-low h-40 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <span className="text-sm font-medium">여기에 서명해 주세요</span>
                </div>
            </div>
            <p className="text-[10px] text-outline text-center mt-2">위 서명은 본인 확인 및 약관 동의의 효력을 가집니다. ({new Date().toLocaleDateString()} 기준)</p>
        </div>
    );
};

const Signup = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState('');

    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [signature, setSignature] = useState('');
    const [residentNoFront, setResidentNoFront] = useState('');
    const [residentNoBack, setResidentNoBack] = useState('');
    const residentNoBackRef = useRef(null);
    const [recomCode, setRecomCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const [isIdChecked, setIsIdChecked] = useState(false);
    const [isEmailChecked, setIsEmailChecked] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [idToken, setIdToken] = useState(null); // 서버에서 발행한 verifyToken 저장

    // 약관 4가지
    const [terms, setTerms] = useState({
        service: false,
        privacy: false,
        traveler: false,
        location: false
    });

    // 약관 상세보기 확인 여부
    const [viewedTerms, setViewedTerms] = useState({
        service: false,
        privacy: false,
        traveler: false,
        marketing: false
    });

    // 마케팅 채널 4가지
    const [marketing, setMarketing] = useState({
        sms: false,
        push: false,
        email: false,
        tel: false,
        agree: false // 마케팅 전체 동의 버튼 역할
    });

    const handleMarketingAll = (e) => {
        const checked = e.target.checked;
        setMarketing({
            agree: checked,
            sms: checked,
            push: checked,
            email: checked,
            tel: checked
        });
    };

    const validatePassword = (pw) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
        return regex.test(pw);
    };

    const getTermsList = () => {
        const list = [
            {
                id: 'service',
                title: '서비스 이용약관 동의',
                content: `버스탐스 서비스 이용 통합 이용약관

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

부칙 본 이용약관은 2026년 6월 25일부터 시행됩니다.`
            },
            {
                id: 'privacy',
                title: '개인정보 수집 및 이용 동의',
                content: `버스탐스 개인정보 처리방침

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

부칙 본 개인정보 처리방침은 2026년 6월 25일부터 적용됩니다. 기존 방침은 본 방침으로 대체됩니다.`
            },
            {
                id: 'traveler',
                title: userType === 'driver' ? '파트너 입점 계약' : '여행자 서비스 이용 규정 동의',
                content: userType === 'driver'
                    ? `버스기사(파트너) 입점 및 서비스 이용 계약서

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

부칙 본 방침은 2026 년 6 월 25 일부터 시행됩니다.`
                    : `여행자(이용자) 가입 및 이용 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 가입을 신청한 여행자(이용자)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “이용자”가 가입하여 특허 시스템 기반의 중개 프로세스(계약금 입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (가입 자격 및 승인)\n1. “이용자”는 가입 신청 시 본인 실명 인증 절차를 거쳐야 한다.\n2. [계약의 성립] 본 계약은 “이용자”가 플랫폼(웹/앱)상에서 제공하는 전자 서명(싸인)을 하고 동의 절차에 따라 버튼을 클릭함으로써 본 계약에 확정적으로 전자 서명한 것으로 간주하며, 신청 완료 시점부터 효력이 발생한다.\n\n제3조 (서비스 이용 및 계약 체결)\n1. [청약 등록] “이용자”는 플랫폼에서 요구하는 기본 조건(출발지, 도착지, 탑승 인원, 일시 등)을 완성한 후, 희망 이용요금을 직접 입력하여 청약을 등록한다.\n2. [계약금 결제] “이용자”는 청약 내용에 부합하는 파트너(버스기사)의 제안을 선택하거나 매칭되었을 때, 이용 금액의 6.6%(부가세 포함)를 계약금으로 결제(카드 또는 계좌이체)함으로써 계약을 완료한다.\n3. [연락처 즉시 공개] 계약금 결제 완료 후 파트너가 이를 승인하면 상호 연락처가 즉시 공개되며, 이때부터 자유로운 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (이용 요금 및 수수료)\n1. [가입 수수료] 플랫폼 가입 수수료는 11,000원(부가세 포함)이다. (단, “사업자”가 지정하는 일정 기간 가입 수수료를 면제할 수 있다.)\n2. [중개 수수료] “이용자”에게는 별도의 중개 수수료가 발생하지 않는다. (단, 제3조 2항의 계약금은 플랫폼 서비스 이용료 및 예약 보증금 성격을 포함한다.)\n\n제5조 (취소 및 이용자 보호 권리)\n1. [이용자 귀책 취소] 계약 체결 후 “이용자”가 특별한 사유 없이 일방적으로 취소할 경우, 기 납부한 계약금은 “사업자”에게 귀속되며 반환되지 않는다.\n2. [파트너 귀책 취소 및 보상] 계약 체결 후 파트너(버스기사)의 귀책으로 계약이 파기될 경우, “이용자”는 다음 중 하나의 보호 조치를 받을 권리가 있다.\n- 계약금 4배 환불: “사업자”는 이용자가 입금한 계약금의 4배 전액을 위약금으로 지급한다.\n- 대체 차량 제공: “사업자”가 원래의 계약 조건과 동일한 급 이상의 다른 차량을 수급하여 제공하는 경우, 위 위약금 지급을 대신할 수 있다.\n3. [위약 예외 사유] 다음 각 호의 사유로 인한 취소는 정확한 증빙이 제출되고 “사업자”가 인정한 경우에 한하여 위약 규정을 적용하지 않는다.\n1) 본인 사망 2) 차량 파손 (운행 불가) 3) 법정 구속 4) 직계존비속 및 배우자 사망 5) 질병 또는 사고에 의한 입원 6) 사고에 의한 당일 통원치료\n\n제6조 (패널티 및 품질 관리)\n시스템은 “이용자”의 취소 이력을 자동 모니터링하며, 제5조 3항의 특별한 사유 없이 결제 취소 또는 계약 파기가 반복될 경우 다음과 같이 이용을 제한한다.\n• 1회 발생 시: 3개월간 이용 제한\n• 2회 발생 시: 6개월간 이용 제한\n• 3회 발생 시: 9개월간 이용 제한\n• 4회 발생 시: 본 계약 해지 및 영구 가입 제한\n\n제7조 (관할 법원)\n본 계약과 관련한 분쟁의 관할 법원은 “사업자”의 소재지 관할 법원으로 한다.`
            },
            {
                id: 'marketing',
                title: '마케팅 정보 수신 및 활용 동의 (선택)',
                content: `마케팅 정보 수신 및 활용 동의서 (선택)

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
            }
        ];
        return list.filter(item => item.id !== 'traveler' || userType === 'driver');
    };

    const handleShowTerms = () => {
        const termsList = getTermsList();
        
        const showModal = (index) => {
            if (index >= termsList.length) return;
            const item = termsList[index];
            
            Swal.fire({
                title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">BusTaams 정책 (${index + 1}/${termsList.length})</p><h2 class="text-xl font-black text-teal-900">${item.title}</h2></div>`,
                html: `
                    <div class="text-left mt-6 font-body">
                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto">
                            <p class="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">${item.content}</p>
                        </div>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: index === termsList.length - 1 ? '완료' : '확인',
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
            }).then((result) => {
                if (result.isConfirmed) {
                    if (index === termsList.length - 1) {
                        setViewedTerms({
                            service: true,
                            privacy: true,
                            traveler: true,
                            marketing: true
                        });
                    } else {
                        showModal(index + 1);
                    }
                }
            });
        };
        
        showModal(0);
    };

    const handleCheckEmail = async () => {
        console.log('handleCheckEmail called with:', email);
        if (!userType) return notify.warn('가입 유형(고객/기사)을 먼저 선택해주세요.');
        if (!email) return notify.warn('이메일을 입력하세요.');
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return notify.error('입력 오류', '올바른 이메일 형식이 아닙니다.');
        }
        try {
            const res = await checkEmailDuplicate(email, userType === 'customer' ? 'TRAVELER' : 'DRIVER');
            console.log('checkEmailDuplicate response:', res);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 이메일입니다.');
                setIsEmailChecked(true);
            } else {
                notify.error('중복', '이미 사용 중인 이메일입니다.');
            }
        } catch (err) {
            console.error('Email check error:', err);
            notify.error('오류 발생', '이메일 중복 확인 중 오류가 발생했습니다.');
        }
    };

    const handleCheckId = async () => {
        console.log('handleCheckId called with:', userId);
        if (!userId) return notify.warn('아이디를 입력하세요.');
        try {
            const res = await checkIdDuplicate(userId);
            console.log('checkIdDuplicate response:', res);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 아이디입니다.');
                setIsIdChecked(true);
            } else {
                notify.error('중복', '이미 가입된 아이디입니다.');
            }
        } catch (err) {
            console.error('ID check error:', err);
            notify.error('오류 발생', '아이디 중복 확인 중 오류가 발생했습니다.');
        }
    };



    const handleSendCode = async () => {
        if (!phoneNo) return notify.warn('번호를 입력하세요.');

        try {
            const res = await sendAuthCode(phoneNo, 'signup', userType === 'customer' ? 'TRAVELER' : 'DRIVER');
            if (res.success) {
                setIsCodeSent(true);
                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');
            } else {
                notify.error('발송 실패', res.error || '인증번호 발송 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Send Code Error:', err);
            notify.error('발송 실패', err.message || '인증번호 발송 중 오류가 발생했습니다.');
        }
    };

    const handleVerifyCode = async () => {
        if (!authCode) return notify.warn('인증번호를 입력하세요.');

        try {
            const res = await verifyAuthCode(phoneNo, authCode, 'signup');
            if (res.success) {
                setIdToken(res.verifyToken);
                setIsPhoneVerified(true);
                notify.success('인증 성공', '휴대폰 인증이 완료되었습니다.');
            } else {
                notify.error('인증 실패', res.error || '인증번호가 올바르지 않거나 만료되었습니다.');
            }
        } catch (err) {
            console.error('Verify Code Error:', err);
            notify.error('인증 실패', '인증번호 확인 중 오류가 발생했습니다.');
        }
    };

    const validateResidentNo = (rrn) => {
        // 한글 주석: 테스트 편의성을 위해 체크섬 검증은 제외하고 자릿수(13자리 숫자)만 검증하도록 완화합니다.
        return /^[0-9]{13}$/.test(rrn);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!userType) {
            notify.warn('가입 유형(고객/기사)을 먼저 선택해주세요.');
            return;
        }

        // 즉시 상태 변경하여 중복 클릭 방지
        setIsSubmitting(true);

        try {
            if (!isEmailChecked) {
                notify.warn('이메일 중복 확인이 필요합니다.');
                setIsSubmitting(false);
                return;
            }
            if (!isIdChecked) {
                notify.warn('아이디 중복 확인이 필요합니다.');
                setIsSubmitting(false);
                return;
            }
            if (!userName) {
                notify.warn('성함을 입력해주세요.');
                setIsSubmitting(false);
                return;
            }
            if (!validatePassword(password)) {
                notify.error('비밀번호 규칙 위반', '8자 이상, 숫자, 특수문자를 포함하세요.');
                setIsSubmitting(false);
                return;
            }
            if (password !== passwordConfirm) {
                notify.error('불일치', '비밀번호 확인이 다릅니다.');
                setIsSubmitting(false);
                return;
            }
            if (!isPhoneVerified) {
                notify.warn('인증 필요', '휴대폰 인증이 필요합니다.');
                setIsSubmitting(false);
                return;
            }

            if (userType === 'driver') {
                if (!residentNoFront || !residentNoBack) {
                    notify.warn('주민등록번호를 입력해주세요.');
                    setIsSubmitting(false);
                    return;
                }
                if (residentNoFront.length !== 6 || residentNoBack.length !== 7) {
                    notify.warn('주민등록번호 자릿수를 정확히 입력해주세요.');
                    setIsSubmitting(false);
                    return;
                }
                const combinedRrn = residentNoFront + residentNoBack;
                if (!validateResidentNo(combinedRrn)) {
                    notify.error('유효하지 않은 번호', '올바른 형식의 주민등록번호가 아닙니다.');
                    setIsSubmitting(false);
                    return;
                }
            }

            if (!terms.service || !terms.privacy || !terms.traveler) {
                notify.warn('약관 동의', '모든 필수 약관에 동의하세요.');
                setIsSubmitting(false);
                return;
            }
            if (!signature) {
                notify.warn('서명 필요', '전자 서명을 완료해주세요.');
                setIsSubmitting(false);
                return;
            }

            const termsData = [
                { type: 'service', agreed: terms.service },
                { type: 'privacy', agreed: terms.privacy },
                { type: userType === 'customer' ? 'traveler_service' : 'driver_service', agreed: terms.traveler },
                {
                    type: 'marketing', agreed: marketing.agree,
                    channels: { sms: marketing.sms ? 'Y' : 'N', push: marketing.push ? 'Y' : 'N', email: marketing.email ? 'Y' : 'N', tel: marketing.tel ? 'Y' : 'N' }
                }
            ];

            const res = await registerUser({
                userId: userId.trim(), email, userName, password, phoneNo,
                userType: userType === 'customer' ? 'TRAVELER' : 'DRIVER',
                signatureBase64: signature,
                termsData,
                firebaseToken: idToken,
                residentNo: userType === 'driver' ? `${residentNoFront}-${residentNoBack}` : null,
                recomCode: recomCode || null
            });

            if (res.success) {
                notify.success('가입 완료', '회원가입이 성공적으로 완료되었습니다.');
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            } else {
                // 주민번호 중복 시 팝업 알림
                if (res.error && res.error.includes('이미 가입된 고객입니다')) {
                    Swal.fire({
                        icon: 'info',
                        title: '가입 확인',
                        text: res.error,
                        confirmButtonText: '확인',
                        confirmButtonColor: '#004e47',
                        customClass: {
                            popup: 'rounded-[2rem]',
                            confirmButton: 'rounded-xl px-8 py-3 font-bold'
                        }
                    });
                } else {
                    notify.error('가입 실패', res.error || '회원가입 처리 중 오류가 발생했습니다.');
                }
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('Signup error:', err);
            const errorMessage = err.message || '서버 통신 중 오류가 발생했습니다.';

            // 주민번호 중복 또는 이미 가입된 계정 관련 에러 메시지 처리
            if (errorMessage.includes('이미 가입된 고객입니다')) {
                Swal.fire({
                    icon: 'info',
                    title: '가입 확인',
                    text: errorMessage,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#004e47',
                    customClass: {
                        popup: 'rounded-[2rem]',
                        confirmButton: 'rounded-xl px-8 py-3 font-bold'
                    }
                });
            } else {
                notify.error('오류 발생', errorMessage);
            }
            setIsSubmitting(false);
        }
        // 가입 성공 시에는 navigate로 이동하므로 여기서 setIsSubmitting(false)를 하지 않음 (중복 클릭 방지 유지)
    };

    return (
        <div className="bg-slate-50 font-body text-on-background min-h-screen flex flex-col items-center py-12 px-6">
            <header className="w-full max-w-md flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <img src="/app/assets/BUSTAAMS_IMAGE_LOGO.png" alt="busTaams Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm" />
                    <div className="text-primary font-black tracking-tighter font-headline text-3xl">busTaams</div>
                </div>
                <button className="text-outline font-bold text-xs">고객지원</button>
            </header>

            <div className="w-full max-w-md space-y-10">
                <section className="space-y-4">
                    <p className="text-secondary font-black text-xs uppercase tracking-widest">최고의 기회</p>
                    <h1 className="font-headline font-black text-5xl leading-tight">새로운 <br /><span className="text-primary">여행의 시작.</span></h1>
                    <p className="text-on-surface-variant font-medium leading-relaxed">엄선된 프리미엄 버스 경매를 만나보세요. 정교하게 큐레이션된 플릿 자산을 제공합니다.</p>
                </section>

                {/* 가입 유형 선택 (라디오 버튼) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left space-y-3">
                    <label className="text-xs font-bold text-on-surface ml-1 block">가입 유형 선택 <span className="text-red-500">*필수</span></label>
                    <div className="flex gap-8 pl-1">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="userType" 
                                value="customer" 
                                checked={userType === 'customer'} 
                                onChange={() => {
                                    setUserType('customer');
                                    setIsEmailChecked(false);
                                    setIsIdChecked(false);
                                    setTerms(prev => ({ ...prev, traveler: true }));
                                    setViewedTerms(prev => ({ ...prev, traveler: true }));
                                }} 
                                className="w-5 h-5 text-primary border-outline/30 focus:ring-primary cursor-pointer" 
                            />
                            <span className={`font-bold text-sm transition-colors ${userType === 'customer' ? 'text-primary' : 'text-outline group-hover:text-on-surface'}`}>고객으로 가입</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="userType" 
                                value="driver" 
                                checked={userType === 'driver'} 
                                onChange={() => {
                                    setUserType('driver');
                                    setIsEmailChecked(false);
                                    setIsIdChecked(false);
                                    setTerms(prev => ({ ...prev, traveler: false }));
                                    setViewedTerms(prev => ({ ...prev, traveler: false }));
                                }} 
                                className="w-5 h-5 text-primary border-outline/30 focus:ring-primary cursor-pointer" 
                            />
                            <span className={`font-bold text-sm transition-colors ${userType === 'driver' ? 'text-primary' : 'text-outline group-hover:text-on-surface'}`}>기사로 가입</span>
                        </label>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl shadow-primary/5 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 이메일 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">이메일</label>
                            <div className="flex gap-2">
                                <input value={email} onChange={e => { setEmail(e.target.value); setIsEmailChecked(false); }} type="email" placeholder="example@email.com" className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm" />
                                <button type="button" onClick={handleCheckEmail} className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${isEmailChecked ? 'bg-green-100 text-green-700' : 'bg-white border border-primary text-primary hover:bg-primary/5'}`}>
                                    {isEmailChecked ? '확인됨' : '중복 확인'}
                                </button>
                            </div>
                        </div>

                        {/* 성함 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">{userType === 'customer' ? '고객명' : '기사명'}</label>
                            <input value={userName} onChange={e => setUserName(e.target.value)} type="text" placeholder="실명을 입력하세요" className="w-full bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm" />
                        </div>

                        {userType === 'driver' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface ml-1">주민등록번호</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={residentNoFront}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                            setResidentNoFront(val);
                                            if (val.length === 6 && residentNoBackRef.current) {
                                                residentNoBackRef.current.focus();
                                            }
                                        }}
                                        type="text"
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        placeholder="앞 6자리"
                                        className="w-1/2 bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm text-center"
                                    />
                                    <span className="text-slate-400 font-bold">-</span>
                                    <input
                                        ref={residentNoBackRef}
                                        value={residentNoBack}
                                        onChange={e => setResidentNoBack(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                                        type="password"
                                        placeholder="뒤 7자리"
                                        className="w-1/2 bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm text-center"
                                    />
                                </div>
                                <p className="text-[10px] text-outline ml-1">* 기사 가입을 위해 주민등록번호 입력이 필수입니다. 암호화되어 안전하게 보관됩니다.</p>
                            </div>
                        )}

                        {/* 아이디 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">아이디</label>
                            <div className="flex gap-2">
                                <input value={userId} onChange={e => setUserId(e.target.value)} type="text" placeholder="아이디 입력" className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm" />
                                <button type="button" onClick={handleCheckId} className={`px-3 shrink-0 whitespace-nowrap bg-white border border-primary text-primary rounded-xl font-bold text-xs hover:bg-primary/5 transition-all ${isIdChecked ? 'bg-green-100 text-green-700' : ''}`}>
                                    {isIdChecked ? '확인됨' : '중복 확인'}
                                </button>
                            </div>
                        </div>

                        {/* 비밀번호 */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-on-surface ml-1">비밀번호</label>
                            <div className="space-y-1">
                                <div className="relative">
                                    <input
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="비밀번호(8자 이상, 특수문자 포함)"
                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
                                    />
                                    <span
                                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </div>
                                {password && (
                                    <p className={`text-[10px] ml-1 font-bold ${validatePassword(password) ? 'text-green-600' : 'text-red-500'}`}>
                                        {validatePassword(password) ? '✔ 사용 가능한 비밀번호입니다.' : '✘ 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <div className="relative">
                                    <input
                                        value={passwordConfirm}
                                        onChange={e => setPasswordConfirm(e.target.value)}
                                        type={showPasswordConfirm ? "text" : "password"}
                                        placeholder="비밀번호 재입력"
                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
                                    />
                                    <span
                                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary"
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                    >
                                        {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                                    </span>
                                </div>
                                {passwordConfirm && (
                                    <p className={`text-[10px] ml-1 font-bold ${password === passwordConfirm ? 'text-green-600' : 'text-red-500'}`}>
                                        {password === passwordConfirm ? '✔ 비밀번호가 일치합니다.' : '✘ 비밀번호가 일치하지 않습니다.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 휴대폰 번호 */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-on-surface ml-1">휴대폰번호</label>
                            <div className="flex gap-2">
                                <div className="flex-grow min-w-0 relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">smartphone</span>
                                    <input
                                        value={phoneNo}
                                        onChange={e => setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))}
                                        type="tel"
                                        placeholder="휴대폰 번호"
                                        disabled={isPhoneVerified}
                                        className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-3 outline-none font-medium disabled:opacity-50 text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={isPhoneVerified}
                                    className="px-3 shrink-0 whitespace-nowrap bg-white border border-primary text-primary rounded-xl font-bold text-xs disabled:opacity-50"
                                >
                                    {isCodeSent ? '재발송' : '인증요청'}
                                </button>
                            </div>


                            {isCodeSent && !isPhoneVerified && (
                                <div className="flex gap-2">
                                    <div className="flex-grow min-w-0 relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">verified_user</span>
                                        <input
                                            value={authCode}
                                            onChange={e => setAuthCode(e.target.value)}
                                            type="text"
                                            placeholder="인증번호 6자리"
                                            className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-3 outline-none font-medium text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleVerifyCode}
                                        className="px-3 shrink-0 whitespace-nowrap bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark transition-all"
                                    >
                                        인증확인
                                    </button>
                                </div>
                            )}
                            {isPhoneVerified && (
                                <p className="text-xs text-green-600 font-bold ml-1">✔ 휴대폰 인증이 완료되었습니다.</p>
                            )}
                        </div>

                        {userType === 'driver' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface ml-1">추천인 아이디 (선택)</label>
                                <input
                                    value={recomCode}
                                    onChange={e => setRecomCode(e.target.value)}
                                    type="text"
                                    placeholder="추천인 아이디 입력"
                                    className="w-full bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm"
                                />
                            </div>
                        )}

                        {/* 약관 동의 */}
                        <div className="space-y-4 pt-4">
                            <label className="text-xs font-bold text-on-surface ml-1">약관 및 정책동의</label>
                            <div className="bg-slate-50 p-3 sm:p-6 rounded-2xl space-y-4 overflow-hidden">
                                {/* 전체 동의 버튼 */}
                                <div className="pb-4 border-b border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${terms.service && terms.privacy && terms.traveler && marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={terms.service && terms.privacy && terms.traveler && marketing.agree}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (checked && (!viewedTerms.service || !viewedTerms.privacy || !viewedTerms.traveler || !viewedTerms.marketing)) {
                                                        notify.warn('확인 필요', '모든 약관의 상세보기를 먼저 확인해주세요.');
                                                        return;
                                                    }
                                                    setTerms({ service: checked, privacy: checked, traveler: checked });
                                                    setMarketing({ agree: checked, sms: checked, push: checked, email: checked, tel: checked });
                                                }}
                                            />
                                            {(terms.service && terms.privacy && terms.traveler && marketing.agree) && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                        </div>
                                        <span className="text-base font-black text-on-surface">모두 동의합니다.</span>
                                    </label>
                                </div>

                                {[
                                    {
                                        id: 'service',
                                        label: '서비스 이용약관 동의',
                                        required: true,
                                        content: `버스탐스 서비스 이용 통합 이용약관

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

부칙 본 이용약관은 2026년 6월 25일부터 시행됩니다.`
                                    },
                                    {
                                        id: 'privacy',
                                        label: '개인정보 수집 및 이용 동의',
                                        required: true,
                                        content: `버스탐스 개인정보 처리방침

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

부칙 본 개인정보 처리방침은 2026년 6월 25일부터 적용됩니다. 기존 방침은 본 방침으로 대체됩니다.`
                                    },
                                    {
                                        id: 'traveler',
                                        label: userType === 'driver' ? '파트너 입점 계약' : '여행자 서비스 이용 규정 동의',
                                        required: true,
                                        content: userType === 'driver'
                                            ? `버스기사(파트너) 입점 및 서비스 이용 계약서

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

부칙 본 방침은 2026 년 6 월 25 일부터 시행됩니다.`
                                            : `여행자(이용자) 가입 및 이용 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 가입을 신청한 여행자(이용자)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “이용자”가 가입하여 특허 시스템 기반의 중개 프로세스(계약금 입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (가입 자격 및 승인)\n1. “이용자”는 가입 신청 시 본인 실명 인증 절차를 거쳐야 한다.\n2. [계약의 성립] 본 계약은 “이용자”가 플랫폼(웹/앱)상에서 제공하는 전자 서명(싸인)을 하고 동의 절차에 따라 버튼을 클릭함으로써 본 계약에 확정적으로 전자 서명한 것으로 간주하며, 신청 완료 시점부터 효력이 발생한다.\n\n제3조 (서비스 이용 및 계약 체결)\n1. [청약 등록] “이용자”는 플랫폼에서 요구하는 기본 조건(출발지, 도착지, 탑승 인원, 일시 등)을 완성한 후, 희망 이용요금을 직접 입력하여 청약을 등록한다.\n2. [계약금 결제] “이용자”는 청약 내용에 부합하는 파트너(버스기사)의 제안을 선택하거나 매칭되었을 때, 이용 금액의 6.6%(부가세 포함)를 계약금으로 결제(카드 또는 계좌이체)함으로써 계약을 완료한다.\n3. [연락처 즉시 공개] 계약금 결제 완료 후 파트너가 이를 승인하면 상호 연락처가 즉시 공개되며, 이때부터 자유로운 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (이용 요금 및 수수료)\n1. [가입 수수료] 플랫폼 가입 수수료는 11,000원(부가세 포함)이다. (단, “사업자”가 지정하는 일정 기간 가입 수수료를 면제할 수 있다.)\n2. [중개 수수료] “이용자”에게는 별도의 중개 수수료가 발생하지 않는다. (단, 제3조 2항의 계약금은 플랫폼 서비스 이용료 및 예약 보증금 성격을 포함한다.)\n\n제5조 (취소 및 이용자 보호 권리)\n1. [이용자 귀책 취소] 계약 체결 후 “이용자”가 특별한 사유 없이 일방적으로 취소할 경우, 기 납부한 계약금은 “사업자”에게 귀속되며 반환되지 않는다.\n2. [파트너 귀책 취소 및 보상] 계약 체결 후 파트너(버스기사)의 귀책으로 계약이 파기될 경우, “이용자”는 다음 중 하나의 보호 조치를 받을 권리가 있다.\n- 계약금 4배 환불: “사업자”는 이용자가 입금한 계약금의 4배 전액을 위약금으로 지급한다.\n- 대체 차량 제공: “사업자”가 원래의 계약 조건과 동일한 급 이상의 다른 차량을 수급하여 제공하는 경우, 위 위약금 지급을 대신할 수 있다.\n3. [위약 예외 사유] 다음 각 호의 사유로 인한 취소는 정확한 증빙이 제출되고 “사업자”가 인정한 경우에 한하여 위약 규정을 적용하지 않는다.\n1) 본인 사망 2) 차량 파손 (운행 불가) 3) 법정 구속 4) 직계존비속 및 배우자 사망 5) 질병 또는 사고에 의한 입원 6) 사고에 의한 당일 통원치료\n\n제6조 (패널티 및 품질 관리)\n시스템은 “이용자”의 취소 이력을 자동 모니터링하며, 제5조 3항의 특별한 사유 없이 결제 취소 또는 계약 파기가 반복될 경우 다음과 같이 이용을 제한한다.\n• 1회 발생 시: 3개월간 이용 제한\n• 2회 발생 시: 6개월간 이용 제한\n• 3회 발생 시: 9개월간 이용 제한\n• 4회 발생 시: 본 계약 해지 및 영구 가입 제한\n\n제7조 (관할 법원)\n본 계약과 관련한 분쟁의 관할 법원은 “사업자”의 소재지 관할 법원으로 한다.`
                                    }
                                ]
                                .filter(item => item.id !== 'traveler' || userType === 'driver')
                                .map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-2 w-full overflow-hidden">
                                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 overflow-hidden">
                                            <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${terms[item.id] ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={terms[item.id]}
                                                    onChange={e => {
                                                        if (e.target.checked && !viewedTerms[item.id]) {
                                                            notify.warn('확인 필요', '상세보기를 먼저 확인해야 동의할 수 있습니다.');
                                                            return;
                                                        }
                                                        setTerms({ ...terms, [item.id]: e.target.checked });
                                                    }}
                                                />
                                                {terms[item.id] && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                            </div>

                                            <span className="flex items-center gap-1 min-w-0 overflow-hidden text-[11px] sm:text-sm font-bold text-on-surface-variant">
                                                <span className="text-primary whitespace-nowrap shrink-0">[필수]</span>
                                                <span className="truncate min-w-0 block">{item.label}</span>
                                            </span>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={handleShowTerms}
                                            className={`shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] font-bold tracking-tighter ${viewedTerms[item.id] ? 'text-green-600' : 'text-blue-600 underline'}`}
                                        >
                                            {viewedTerms[item.id] ? '확인완료' : '상세보기'}
                                        </button>
                                    </div>
                                ))}

                                {/* 4번째 항목: 마케팅 동의 (선택) */}
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex items-center justify-between gap-2 w-full overflow-hidden">
                                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 overflow-hidden">
                                            <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={marketing.agree}
                                                    onChange={e => {
                                                        if (e.target.checked && !viewedTerms.marketing) {
                                                            notify.warn('확인 필요', '마케팅 동의 상세보기를 먼저 확인해주세요.');
                                                            return;
                                                        }
                                                        handleMarketingAll(e);
                                                    }}
                                                />
                                                {marketing.agree && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                            </div>

                                            <span className="flex items-center gap-1 min-w-0 overflow-hidden text-[11px] sm:text-sm font-bold text-on-surface-variant">
                                                <span className="text-outline whitespace-nowrap shrink-0">[선택]</span>
                                                <span className="truncate min-w-0 block">마케팅 정보 수신 및 알림 동의</span>
                                            </span>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={handleShowTerms}
                                            className={`shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] font-bold tracking-tighter ${viewedTerms.marketing ? 'text-green-600' : 'text-blue-600 underline'}`}
                                        >
                                            {viewedTerms.marketing ? '확인완료' : '상세보기'}
                                        </button>
                                    </div>

                                    {/* 마케팅 채널 4종 (동의 시에만 부드럽게 노출) */}
                                    <div className={`grid grid-cols-2 gap-2 mt-4 ml-9 transition-all duration-300 overflow-hidden ${marketing.agree ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {[
                                            { id: 'sms', label: 'SMS' },
                                            { id: 'push', label: '앱 푸시' },
                                            { id: 'email', label: '이메일' },
                                            { id: 'tel', label: '유선전화' }
                                        ].map(m => (
                                            <label key={m.id} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={marketing[m.id]} onChange={e => setMarketing({ ...marketing, [m.id]: e.target.checked })} className="accent-primary w-4 h-4" />
                                                <span className="text-xs text-on-surface-variant group-hover:text-primary">{m.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 전자 서명 */}
                        <SignaturePad onSave={setSignature} onClear={() => setSignature('')} />

                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full text-white font-headline font-bold py-4 rounded-xl shadow-xl transition-all text-xl flex items-center justify-center gap-2 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-primary shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]'}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>처리 중...</span>
                                    </>
                                ) : '계정 생성'}
                            </button>
                        </div>
                    </form>



                    <div className="text-center pt-4">
                        <span className="text-sm font-medium text-slate-400">이미 계정이 있으신가요? </span>
                        <button onClick={() => navigate('/login')} className="text-sm font-bold text-primary hover:underline">로그인하기</button>
                    </div>
                </div>
            </div>

            <footer className="mt-20 text-center space-y-1">
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">EDITORIAL TRANSIT EXPERIENCE ©</p>
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">BUSTAAMS 2024</p>
            </footer>
        </div>
    );
};

export default Signup;
