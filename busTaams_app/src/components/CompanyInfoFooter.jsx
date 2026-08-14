import React from 'react';
import Swal from 'sweetalert2';
import { useLocation } from 'react-router-dom';

const CompanyInfoFooter = ({ forceShow = false }) => {
    const location = useLocation();

    // 로그인, 회원가입, ID/PW찾기 및 대시보드 페이지인 경우 글로벌 푸터(App.jsx)에서는 렌더링하지 않고,
    // 개별 컴포넌트 내부에서 forceShow={true}로 직접 렌더링하여 중복 및 공백을 방지합니다.
    if (!forceShow && (
        location.pathname === '/login' ||
        location.pathname === '/signup' ||
        location.pathname === '/find-account' ||
        location.pathname === '/customer-dashboard' ||
        location.pathname === '/driver-dashboard'
    )) {
        return null;
    }

    const handleShowCompanyInfo = () => {
        Swal.fire({
            title: '회사 정보 및 플랫폼 면책 고지',
            html: `
                <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #1e293b; font-family: 'Pretendard', sans-serif;">
                    <p style="margin-bottom: 8px;"><strong>대표자:</strong> 원동일 | <strong>대표번호:</strong> 010-8306-2459</p>
                    <p style="margin-bottom: 8px;"><strong>사업자등록번호:</strong> 212-81-45502</p>
                    <p style="margin-bottom: 8px;"><strong>법인등록번호:</strong> 110111-1871486</p>
                    <p style="margin-bottom: 8px;"><strong>통신판매업:</strong> 제 2026-서울송파-1822호</p>
                    <p style="margin-bottom: 8px;"><strong>주소:</strong> 서울특별시 송파구 충민로 66, L-7145호 (문정동, 가든파이브라이프)</p>
                    <p style="margin-bottom: 8px;"><strong>이메일:</strong> tong45502@hometax.go.kr</p>
                    <p style="margin-bottom: 12px;"><strong>업태:</strong> 제조, 서비스 | <strong>종목:</strong> 전자부품, 태양보일러(농업용), 자동차부품, 부가통신</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                    <p style="font-weight: bold; color: #00685f; margin-bottom: 6px;">&lt; 청솔테크(주)의 버스탐스 &gt;는 여행자와 버스 기사님을 연결하는 운송 매칭 플랫폼입니다.</p>
                    <p style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
                        플랫폼에서 판매되는 모든 상품은 &lt; 청솔테크(주) &gt;에서 책임지고 관리하나, 실제 버스 운행 서비스 및 결제, 현장 서비스의 이행 책임은 거래 당사자(여행자 및 버스 기사)에게 있습니다.
                    </p>
                    <p style="font-weight: bold; margin-bottom: 8px;">불편사항 및 민원 접수 : 담당자 원동일 (02-429-5459)</p>
                    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 15px;">© (주)청솔테크. All rights reserved.</p>
                </div>
            `,
            confirmButtonText: '확인',
            confirmButtonColor: '#00685f',
            customClass: {
                popup: 'rounded-[1.5rem]'
            }
        });
    };

    return (
        <div style={{ width: '100%', textAlign: 'center', padding: '0 0 40px 0', backgroundColor: 'transparent', marginTop: '0px' }}>
            <button 
                onClick={handleShowCompanyInfo}
                style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '2px 10px', borderRadius: '8px' }}
                className="hover:text-teal-800 transition-colors"
            >
                (주)청솔테크 회사정보 확인
            </button>
        </div>
    );
};

export default CompanyInfoFooter;
