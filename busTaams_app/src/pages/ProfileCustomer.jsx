import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerProfile, updateCustomerProfile, changePassword, uploadProfileImage, sendVerificationCode, verifyCode } from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ProfileCustomer = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

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
    const [sentCode, setSentCode] = useState(''); // 서버에서 받은 인증코드 (데모용)
    const [isVerified, setIsVerified] = useState(true); // 초기에는 인증된 상태로 간주
    const [originalPhone, setOriginalPhone] = useState('');
    const [imageVersion, setImageVersion] = useState(Date.now()); // 이미지 캐시 버스팅용 상태

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
                email: userData.email
            });
            notify.success('정보 수정 완료', response.message || '정보가 성공적으로 수정되었습니다.');
            setOriginalPhone(userData.phone);
            setIsVerified(true);
            fetchProfile();
        } catch (error) {
            notify.error('수정 실패', error.message || '정보 수정에 실패했습니다.');
        }
    };

    // SMS 인증번호 전송
    const handleSendSMS = async () => {
        if (!userData.phone) {
            notify.warn('번호 입력', '휴대폰 번호를 입력해주세요.');
            return;
        }
        try {
            const response = await sendVerificationCode(userData.phone);
            if (response.success) {
                setVerificationSent(true);
                setSentCode(response.code); // 데모용
                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');
            } else {
                notify.error('발송 실패', response.error || '인증번호 발송에 실패했습니다.');
            }
        } catch (error) {
            notify.error('오류', error.message || '인증번호 발송 중 오류가 발생했습니다.');
        }
    };

    // 인증번호 확인
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            notify.warn('입력 필요', '인증번호를 입력해주세요.');
            return;
        }

        try {
            const response = await verifyCode(userData.phone, verificationCode);
            if (response.success) {
                setIsVerified(true);
                setVerificationSent(false);
                notify.success('인증 성공', '휴대폰 인증이 완료되었습니다.');
            } else {
                notify.error('인증 실패', response.error || '인증번호가 일치하지 않습니다.');
            }
        } catch (error) {
            notify.error('오류', '인증 확인 중 오류가 발생했습니다.');
        }
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
            
            // 이미지 버전 업데이트하여 화면 갱신 유도
            setImageVersion(Date.now());
            setUserData(prev => ({ ...prev, profileImage: response.imageUrl }));
            
            // 전체 데이터 동기화를 위해 fetchProfile도 호출 (선택 사항)
            // fetchProfile(); 
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
                    <button onClick={() => navigate(-1)} className="active:scale-95 transition-transform duration-200 text-teal-700">
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
                        <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl ring-4 ring-surface-container-low bg-slate-100">
                            {userData.profileImage ? (
                                <img 
                                    alt="User Profile" 
                                    className="w-full h-full object-cover" 
                                    src={userData.profileImage.startsWith('http') ? 
                                        `${userData.profileImage}${userData.profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                        `${import.meta.env.VITE_API_BASE_URL || ''}${userData.profileImage}${userData.profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl">person</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-white shadow-lg active:scale-90 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageChange}
                            accept="image/*"
                        />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
                            {userData.name} <span className="text-primary text-base font-medium ml-2">{userData.userType === 'CUSTOMER' ? 'Premium Member' : 'Driver Partner'}</span>
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
                                <p className="text-[10px] text-primary/60 px-1">* 테스트용 코드: {sentCode}</p>
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
                                        className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
                                        placeholder="현재 비밀번호를 입력하세요" 
                                        type="password" 
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1">신규 비밀번호</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
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
                                        className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-sm text-left" 
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
                                    className="w-full bg-secondary text-white py-3 rounded-lg text-sm font-bold mt-2 hover:bg-on-secondary-container transition-colors"
                                >
                                    비밀번호 변경하기
                                </button>
                            </div>
                        </div>
                        {/* SNS Linking */}
                        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_10px_40px_rgba(0,0,0,0.04)] flex flex-col gap-4">
                            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">SNS 계정 연동</span>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#FEE500] rounded-full flex items-center justify-center text-[10px] font-bold">K</div>
                                        <span className="text-sm font-semibold">카카오</span>
                                    </div>
                                    <span className="text-xs font-bold text-primary">연결됨</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#03C75A] rounded-full flex items-center justify-center text-[10px] text-white font-bold">N</div>
                                        <span className="text-sm font-semibold">네이버</span>
                                    </div>
                                    <button className="text-xs font-bold text-outline-variant hover:text-secondary transition-colors">연결하기</button>
                                </div>
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
                        <div className="flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors cursor-pointer group border-b border-white/50">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                                <span className="font-medium">알림 설정</span>
                            </div>
                            <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </div>
                        <div className="flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors cursor-pointer group">
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
                        className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-5 rounded-full font-bold text-lg shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
        </div>
    );
};

export default ProfileCustomer;
