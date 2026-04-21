import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ progressing: 0, waiting: 0 });
    const [userName, setUserName] = useState('사용자');
    const [profileImage, setProfileImage] = useState(null);

    const categories = [
        { name: '입찰 및 예약 문의', code: 'BID_RES' },
        { name: '결제 및 계약금 관련', code: 'PAY_REFUND' },
        { name: '취소 및 환불 정책', code: 'CANCEL_RULE' },
        { name: '기사님 및 운행 서비스', code: 'BUS_STAT' },
        { name: '서비스 제안 및 기타', code: 'SUGGESTION' }
    ];

    useEffect(() => {
        // 대시보드 통계 및 프로필 정보 로드
        const fetchDashboardData = async () => {
            try {
                const [statsRes, profileRes] = await Promise.all([
                    api.get('/app/customer/dashboard'),
                    api.get('/app/customer/profile')
                ]);
                
                if (statsRes.success) {
                    setStats({
                        progressing: statsRes.data.countProgressing,
                        waiting: statsRes.data.countWaitingApproval
                    });
                    if (statsRes.data.userName) setUserName(statsRes.data.userName);
                    if (statsRes.data.profileImage) setProfileImage(statsRes.data.profileImage);
                }
                
                if (profileRes.success) {
                    setUserName(profileRes.data.name || profileRes.data.userName || '사용자');
                    if (profileRes.data.profileImage) setProfileImage(profileRes.data.profileImage);
                }
            } catch (err) {
                console.error('Fetch dashboard error:', err);
            }
        };

        fetchDashboardData();
    }, []);

    const handleShowInquiryList = async () => {
        try {
            const res = await api.get('/app/customer/inquiries');
            if (res.success) {
                const inquiries = res.data;
                const listHtml = inquiries.length > 0 
                    ? inquiries.map(inq => `
                        <div class="inquiry-item group bg-white border border-slate-100 rounded-2xl p-4 mb-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" data-id="${inq.id}">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-[10px] font-bold text-teal-600 uppercase tracking-widest">${inq.category}</span>
                                <span class="bg-${inq.isCompleted ? 'teal-100 text-teal-700' : 'slate-100 text-slate-500'} text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    ${inq.isCompleted ? '답변완료' : '접수완료'}
                                </span>
                            </div>
                            <h4 class="text-sm font-bold text-teal-900 truncate">${inq.title}</h4>
                            <div class="flex justify-between items-center mt-3">
                                <span class="text-[9px] text-slate-400 font-bold">${inq.date}</span>
                                <span class="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
                            </div>
                        </div>
                    `).join('')
                    : '<div class="py-12 text-center text-slate-400 font-bold text-sm">문의 내역이 없습니다.</div>';

                Swal.fire({
                    title: '<h2 class="text-2xl font-black text-teal-900 text-left">1:1 문의 내역</h2>',
                    html: `
                        <div class="text-left mt-6 font-body">
                            <div class="max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                ${listHtml}
                            </div>
                            <button id="swal-add-inquiry" class="w-full mt-6 bg-teal-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-800 transition-all">
                                <span class="material-symbols-outlined text-sm">add</span>
                                새로운 문의하기
                            </button>
                        </div>
                    `,
                    showConfirmButton: false,
                    showCloseButton: true,
                    customClass: {
                        popup: 'rounded-[2.5rem] p-10 border-none shadow-2xl',
                        closeButton: 'top-6 right-6'
                    },
                    didOpen: () => {
                        const items = document.querySelectorAll('.inquiry-item');
                        items.forEach(item => {
                            item.addEventListener('click', () => {
                                const id = item.getAttribute('data-id');
                                handleShowInquiryDetail(id);
                            });
                        });
                        
                        document.getElementById('swal-add-inquiry').addEventListener('click', () => {
                            Swal.close();
                            handleShowAddInquiry();
                        });
                    }
                });
            }
        } catch (err) {
            notify.error('오류', '문의 내역을 불러오지 못했습니다.');
        }
    };

    const handleShowInquiryDetail = async (id) => {
        try {
            const res = await api.get(`/app/customer/inquiries/${id}`);
            if (res.success) {
                const data = res.data;
                Swal.fire({
                    title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">${data.category}</p><h2 class="text-xl font-black text-teal-900">${data.title}</h2></div>`,
                    html: `
                        <div class="text-left mt-6 space-y-6 font-body">
                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <p class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">${data.content}</p>
                            </div>
                            ${data.replyContent ? `
                                <div class="relative pl-6 py-2 border-l-2 border-teal-600">
                                    <p class="font-bold text-xs text-teal-900 mb-2">운영진 답변</p>
                                    <div class="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50 text-xs text-teal-900 whitespace-pre-wrap">${data.replyContent}</div>
                                </div>
                            ` : ''}
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: '목록으로',
                    confirmButtonColor: '#004e47',
                    customClass: {
                        popup: 'rounded-[2.5rem] p-8 border-none shadow-2xl',
                        confirmButton: 'w-full py-4 rounded-2xl font-bold bg-teal-700 text-white mt-4'
                    },
                    buttonsStyling: false
                }).then(() => {
                    handleShowInquiryList(); // 다시 목록으로
                });
            }
        } catch (err) {
            notify.error('오류', '상세 내용을 불러오지 못했습니다.');
        }
    };

    const handleShowAddInquiry = async () => {
        const { value: formValues } = await Swal.fire({
            title: '<h2 class="text-2xl font-black text-teal-900 text-left">1:1 문의하기</h2>',
            html: `
                <div class="text-left mt-6 font-body space-y-6">
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">문의 카테고리</label>
                        <select id="swal-category" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-700/10">
                            ${categories.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">문의 제목</label>
                        <input id="swal-title" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-teal-700/10" placeholder="제목을 입력해 주세요">
                    </div>
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">상세 내용</label>
                        <textarea id="swal-content" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-teal-700/10 h-32 resize-none" placeholder="내용을 입력해 주세요"></textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '문의 접수',
            cancelButtonText: '취소',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-[2.5rem] p-10 border-none shadow-2xl',
                confirmButton: 'bg-teal-700 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-teal-900/20 hover:scale-105 transition-all mr-2',
                cancelButton: 'bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all ml-2',
                actions: 'mt-10'
            },
            preConfirm: () => {
                const category = document.getElementById('swal-category').value;
                const title = document.getElementById('swal-title').value;
                const content = document.getElementById('swal-content').value;
                if (!title || !content) {
                    Swal.showValidationMessage('제목과 내용을 모두 입력해주세요.');
                    return false;
                }
                return { category, title, content };
            }
        });

        if (formValues) {
            try {
                const res = await api.post('/app/customer/inquiries', formValues);
                if (res.success) {
                    notify.success('접수 완료', '문의가 성공적으로 전달되었습니다.');
                }
            } catch (err) {
                notify.error('오류', err.message || '접수 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div className="bg-background text-on-background min-h-screen pb-32 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-teal-700">directions_bus</span>
                    <h1 className="text-2xl font-black text-teal-800 italic font-headline tracking-tight text-[22px]">Velocity</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-slate-100/50 transition-colors">
                        <span className="material-symbols-outlined text-slate-500">notifications</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                        {profileImage ? (
                            <img alt="Profile" src={profileImage.startsWith('http') ? profileImage : `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage}`} className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-secondary font-semibold tracking-wider text-sm uppercase">반가워요!</p>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight text-[36px]">
                            안녕하세요, <span className="text-primary">{userName || '사용자'}</span>님!<br/>
                            오늘의 새로운 여정을 시작해볼까요?
                        </h2>
                    </div>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] bg-primary text-white p-8 md:p-12 shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                        <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGum5KlJoZ1QYpw5IUtpBjkmHm85WskANrUTCg5K2pp6oBoHGfm904xF0Sha_OV2yNjGAHuI_C5we-RplZzy8FNTllgSB3jrLud6xKDIt-Yn1sUdijX3D970Qn4JoiC3v5tfqVRs4VFH5cP0XqOp47pfFy5EjuwG7xK79EZy2twkr6P2kJi5Pb6AtubxOcGzAlSiIl5ew5i1lqDMgmBcs_lw4egfP7RyHxYkREFQYcVBJXOIo4hSks6H2AOFsHQmbzkLX3Ckbqzmg" />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider mb-1">진행 중</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{stats.progressing}</span>
                                    <span className="text-sm font-medium mb-1 opacity-80">건</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider mb-1">승인 대기 중</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{stats.waiting}</span>
                                    <span className="text-sm font-medium mb-1 opacity-80">건</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button 
                                onClick={() => navigate('/estimate-list-customer?type=progress')} 
                                className="flex-1 bg-white text-primary px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all text-[13px] shadow-lg flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">near_me</span>
                                견적진행중 리스트
                            </button>
                            <button 
                                onClick={() => navigate('/estimate-list-customer?type=waiting')} 
                                className="flex-1 bg-secondary text-white px-6 py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all text-[13px] shadow-lg flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                                승인대기중 리스트
                            </button>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-xl font-bold text-on-surface">빠른 서비스</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                        <div onClick={() => navigate('/request-bus')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm border-l-4 border-secondary hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
                                <span className="material-symbols-outlined">add_task</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">버스 요청 등록</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">새로운 일정 생성</p>
                        </div>
                        <div onClick={() => navigate('/order-history')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">과거 운행 이력</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">지난 여정 확인</p>
                        </div>
                        <div onClick={() => navigate('/reservation-list')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
                                <span className="material-symbols-outlined">event_note</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">예약 리스트</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">나의 예약 현황</p>
                        </div>
                        <div onClick={() => navigate('/review-pending-list')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 text-orange-600">
                                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">평점 및 감사글</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">이용 후기 작성</p>
                        </div>
                        <div onClick={handleShowInquiryList} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-4 text-teal-600">
                                <span className="material-symbols-outlined">contact_support</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">1:1 문의</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">고객 지원 센터</p>
                        </div>
                        <div onClick={() => navigate('/user-profile')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                                <span className="material-symbols-outlined">manage_accounts</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">회원정보관리</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">프로필 및 보안</p>
                        </div>
                    </div>
                </section>
            </main>

            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] rounded-full z-50 bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 h-16 border border-white/40">
                <button className="flex flex-col items-center justify-center bg-teal-700 text-white rounded-full px-5 py-2">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">홈</span>
                </button>
                <button onClick={() => navigate('/estimate-list-customer')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">gavel</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">경매</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">예약</span>
                </button>
                <button onClick={() => navigate('/estimate-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">메시지</span>
                </button>
                <button onClick={handleShowInquiryList} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">support_agent</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">문의</span>
                </button>
                <button onClick={() => navigate('/user-profile')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">내 정보</span>
                </button>
            </nav>

            <button onClick={() => navigate('/request-bus')} className="fixed bottom-28 right-6 w-14 h-14 bg-secondary rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
    );
};

export default CustomerDashboard;
