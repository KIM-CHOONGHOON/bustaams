import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { getDriverProfile, updateDriverProfile, request } from '../api';
import { auth } from '../firebase-config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { validateRRN } from '../utils/validation';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const DriverInfoRegistration = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const licenseInputRef = useRef(null);
    const busLicenseInputRef = useRef(null);
    const careerCertInputRef = useRef(null); // 운전경력증명서용 Ref 추가

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [postcodeOpen, setPostcodeOpen] = useState(false);
    const [licenseTypes, setLicenseTypes] = useState([]);

    const [formData, setFormData] = useState({
        userNm: '',
        hpNo: '',
        residentNo: '',
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
        qualApproveStat: ''
    });

    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [originalPhone, setOriginalPhone] = useState('');

    const [previews, setPreviews] = useState({
        profileImg: '',
        licenseImg: '',
        busLicenseImg: '',
        careerCertImg: '' // 추가
    });
    const [files, setFiles] = useState({
        profileImg: null,
        licenseImg: null,
        busLicenseImg: null,
        careerCertImg: null // 추가
    });

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
                    setFormData(prev => ({
                        ...prev,
                        userNm: user?.name || '',
                        hpNo: user?.phone || '',
                        residentNo: driver?.residentNo || '',
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
                        qualApproveStat: driver?.qualApproveStat || ''
                    }));
                    setOriginalPhone(user?.phone || '');
                    if (user?.phone) setIsVerified(true); // 이미 번호가 있으면 인증된 것으로 간주 (변경 시 재인증 필요)
                    setPreviews({
                        profileImg: driver?.profileImg || '',
                        licenseImg: driver?.licenseImg || '',
                        busLicenseImg: driver?.busLicenseImg || '',
                        careerCertImg: driver?.careerCertImg || '' // 추가
                    });
                }
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {}
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    // Firebase reCAPTCHA 설정
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                    notify.warn('인증 만료', 'reCAPTCHA 인증이 만료되었습니다. 다시 시도해주세요.');
                    if (window.recaptchaVerifier) {
                        try {
                            window.recaptchaVerifier.clear();
                        } catch (e) {}
                        window.recaptchaVerifier = null;
                    }
                }
            });
        }
    };

    // SMS 인증번호 전송
    const handleSendSMS = async () => {
        if (!formData.hpNo) {
            notify.warn('번호 입력', '휴대폰 번호를 입력해주세요.');
            return;
        }

        // 전화번호 형식 정규화 (숫자만 추출)
        let cleanPhone = formData.hpNo.replace(/[^0-9]/g, '');
        
        // 한국 번호 형식 체크 및 변환 (010... -> +8210...)
        let formattedPhone = cleanPhone;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+82' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
            // 국가 코드가 없는 경우 기본 한국으로 설정
            formattedPhone = '+82' + formattedPhone;
        }

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setVerificationSent(true);
            notify.success('인증번호 발송', 'Firebase를 통해 인증번호가 발송되었습니다.');
        } catch (error) {
            console.error('Firebase Auth Detailed Error:', error);
            
            let errorMsg = '인증번호 발송 중 오류가 발생했습니다.';
            if (error.code === 'auth/invalid-phone-number') {
                errorMsg = '유효하지 않은 전화번호 형식입니다.';
            } else if (error.code === 'auth/quota-exceeded') {
                errorMsg = 'SMS 발송 한도를 초과했습니다. 나중에 다시 시도해주세요.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.code === 'auth/captcha-check-failed') {
                errorMsg = 'reCAPTCHA 인증에 실패했습니다.';
            }

            notify.error('발송 실패', errorMsg);
            
            // 오류 발생 시 reCAPTCHA 초기화
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    };

    // 인증번호 확인
    const handleVerifyCode = async () => {
        if (!verificationCode) {
            notify.warn('입력 필요', '인증번호를 입력해주세요.');
            return;
        }
        if (!confirmationResult) return notify.error('인증 오류', '발송된 인증 정보가 없습니다.');

        try {
            const result = await confirmationResult.confirm(verificationCode);
            const user = result.user;
            const token = await user.getIdToken();
            setIdToken(token);
            setIsVerified(true);
            setVerificationSent(false);
            notify.success('인증 성공', '휴대폰 인증이 완료되었습니다.');
        } catch (error) {
            notify.error('인증 실패', '인증번호가 일치하지 않습니다.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
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
        if (!validateRRN(formData.residentNo)) {
            notify.error('입력 오류', '유효하지 않은 주민등록번호입니다.');
            return;
        }

        if (formData.hpNo !== originalPhone && !isVerified) {
            notify.warn('인증 필요', '휴대폰 번호 인증이 필요합니다.');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (formData.licenseIssueDt && formData.licenseIssueDt > today) {
            notify.error('입력 오류', '면허 발급일은 오늘 이전 날짜여야 합니다.');
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
            data.append('residentNo', formData.residentNo);
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

            if (files.profileImg) data.append('profileImg', files.profileImg);
            if (files.licenseImg) data.append('licenseImg', files.licenseImg);
            if (files.busLicenseImg) data.append('busLicenseImg', files.busLicenseImg);
            if (files.careerCertImg) data.append('careerCertImg', files.careerCertImg); // 추가

            const res = await updateDriverProfile(data);
            if (res.success) {
                notify.success('저장 완료', '기사 정보 등록이 완료되었습니다.');
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
                            <button onClick={() => setPostcodeOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
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
            <header className="bg-transparent text-teal-800 flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-200">
                        <span className="material-symbols-outlined text-2xl">menu</span>
                    </button>
                    <h1 className="font-headline font-extrabold tracking-tight text-3xl text-[#004e47] tracking-tighter">busTaams</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#e6e8ea] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {previews.profileImg ? (
                            <img src={previews.profileImg} className="h-full w-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
                    <div className="col-span-12 md:col-span-8">
                        <p className="font-headline font-bold text-[#9d4300] uppercase tracking-[0.2em] mb-4 text-sm">온보딩</p>
                        <h2 className="font-headline text-5xl md:text-7xl font-extrabold text-[#004e47] leading-tight tracking-tighter mb-6">
                            기사님 등록을 <br/>환영합니다.
                        </h2>
                        <p className="text-[#3e4947] text-lg max-w-xl font-medium leading-relaxed">
                            자격 증명을 확인하여 독점 버스 경매 및 대규모 운송 계약에 참여하세요. 전문적인 파트너십이 여기서 시작됩니다.
                        </p>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column: Profile Photo */}
                    <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)]">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                    <div className="w-40 h-40 rounded-full bg-[#f2f4f6] flex items-center justify-center overflow-hidden border-4 border-white shadow-inner mb-6 transition-transform group-hover:scale-105 duration-500">
                                        {previews.profileImg ? (
                                            <img src={previews.profileImg} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-6xl text-[#bec9c6]">account_circle</span>
                                        )}
                                        <div className="absolute inset-0 bg-[#004e47]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'profileImg')} accept="image/*" />
                                </div>
                                <h3 className="font-headline font-bold text-xl text-[#191c1e] mb-2">프로필 사진</h3>
                                <p className="text-sm text-[#3e4947] mb-6 px-4 leading-relaxed">기사 ID 카드를 위한 선명하고 전문적인 정면 사진을 제공해 주세요.</p>
                                <button onClick={() => fileInputRef.current.click()} className="w-full py-3 rounded-full border-2 border-[#bec9c6] text-[#191c1e] font-bold text-sm hover:bg-[#f2f4f6] transition-colors active:scale-95 duration-200">
                                    이미지 업로드
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Right Column: Registration Sections */}
                    <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-8">
                        {/* Section 1: Personal Information */}
                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
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
                                    <input name="residentNo" value={formData.residentNo} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-[#004e47]/20 transition-all text-[#191c1e] placeholder:text-[#6e7977]" placeholder="YYMMDD-*******" />
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
                                            <input name="hpNo" value={formData.hpNo} onChange={handleInputChange} className="flex-1 bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="010-0000-0000" />
                                            <button 
                                                type="button" 
                                                onClick={handleSendSMS}
                                                className="w-1/3 bg-[#004e47] text-white font-bold rounded-xl px-4 py-4 hover:bg-[#00685f] transition-all text-sm active:scale-95"
                                            >
                                                {verificationSent ? '재발송' : '인증요청'}
                                            </button>
                                        </div>
                                        <div id="recaptcha-container"></div>
                                        {verificationSent && (
                                            <div className="flex gap-3">
                                                <input 
                                                    value={verificationCode} 
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                    className="flex-1 bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" 
                                                    maxLength="6" 
                                                    placeholder="6자리 인증번호" 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={handleVerifyCode}
                                                    className="w-1/3 border-2 border-[#004e47] text-[#004e47] font-bold rounded-xl px-4 py-4 hover:bg-[#004e47]/5 transition-all text-sm active:scale-95"
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
                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
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
                                    <input name="licenseNo" value={formData.licenseNo} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-6 py-4 text-[#191c1e]" placeholder="00-00-000000-00" />
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
                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] text-left">
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
                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] text-left">
                            <h3 className="font-headline font-extrabold text-2xl text-[#004e47] mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#004e47]/10 text-[#004e47] flex items-center justify-center text-base">
                                    <span className="material-symbols-outlined text-lg">inventory_2</span>
                                </span>
                                인증 서류 보관함
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* License Card */}
                                <div onClick={() => licenseInputRef.current.click()} className="p-6 rounded-2xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">운전면허증 <span className="text-red-500">*필수</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.licenseApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.licenseApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.licenseApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.licenseApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span> 
                                            {!formData.licenseApproveStat ? '미등록' : formData.licenseApproveStat === 'WAIT' ? '확인 중' : formData.licenseApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.licenseImg ? <img src={previews.licenseImg} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl">badge</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">면허증 앞면</p>
                                            <p className="text-xs text-[#3e4947]">이미지를 업로드하세요</p>
                                        </div>
                                    </div>
                                    <input type="file" ref={licenseInputRef} className="hidden" onChange={e => handleFileChange(e, 'licenseImg')} accept="image/*" />
                                </div>
                                {/* Certificate Card */}
                                <div onClick={() => busLicenseInputRef.current.click()} className="p-6 rounded-2xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">버스운전자격증 <span className="text-red-500">*필수</span></span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold ${formData.qualApproveStat === 'APPROVE' ? 'text-[#00685f]' : formData.qualApproveStat === 'WAIT' ? 'text-[#9d4300]' : 'text-[#ba1a1a]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.qualApproveStat === 'APPROVE' ? 'bg-[#00685f]' : formData.qualApproveStat === 'WAIT' ? 'bg-[#9d4300]' : 'bg-[#ba1a1a]'}`}></span> 
                                            {!formData.qualApproveStat ? '미등록' : formData.qualApproveStat === 'WAIT' ? '확인 중' : formData.qualApproveStat === 'APPROVE' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.busLicenseImg ? <img src={previews.busLicenseImg} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl">description</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">자격증 사본</p>
                                            <p className="text-xs text-[#3e4947]">{formData.qualApproveStat === 'WAIT' ? '파일 검토 중 (24h)' : '이미지를 업로드하세요'}</p>
                                        </div>
                                    </div>
                                    <input type="file" ref={busLicenseInputRef} className="hidden" onChange={e => handleFileChange(e, 'busLicenseImg')} accept="image/*" />
                                </div>
                                {/* Career Certificate Card - New Added */}
                                <div onClick={() => careerCertInputRef.current.click()} className="p-6 rounded-2xl bg-[#f7f9fb] border border-[#bec9c6]/30 hover:border-[#004e47]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6e7977]">운전경력증명서 <span className="text-red-500">*필수</span></span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#9d4300]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#9d4300]"></span> 
                                            경찰청 발급분
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-[#6e7977] group-hover:text-[#004e47] transition-colors overflow-hidden">
                                            {previews.careerCertImg ? <img src={previews.careerCertImg} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl">history_edu</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#191c1e]">경력증명서</p>
                                            <p className="text-xs text-[#3e4947]">이미지를 업로드하세요</p>
                                        </div>
                                    </div>
                                    <input type="file" ref={careerCertInputRef} className="hidden" onChange={e => handleFileChange(e, 'careerCertImg')} accept="image/*" />
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 text-left">
                            <div className="flex items-center gap-3 text-[#3e4947]">
                                <span className="material-symbols-outlined text-[#00685f]">info</span>
                                <p className="text-xs font-medium max-w-xs">운영팀은 일반적으로 24~48시간 이내에 검토를 완료합니다. 승인 시 알림을 보내드립니다.</p>
                            </div>
                            <button onClick={handleSubmit} disabled={submitting} className="w-full md:w-auto px-12 py-5 rounded-full bg-gradient-to-br from-[#004e47] to-[#00685f] text-white font-headline font-extrabold text-lg shadow-[0_20px_40px_-10px_rgba(0,104,95,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,104,95,0.4)] active:scale-95 transition-all duration-300">
                                {submitting ? '처리 중...' : '검토 요청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <BottomNavDriver />
        </div>
    );
};

export default DriverInfoRegistration;
