import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusProfile, getDriverProfile, updateBusProfile, request } from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';
import Swal from 'sweetalert2'; // 한글 주석: OCR 로딩 및 팝업용 SweetAlert2 추가

const BusInfoRegistration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userProfileImg, setUserProfileImg] = useState('');
    const [busTypes, setBusTypes] = useState([]);

    // 공용 업로드용 Ref 및 상태 선언
    const commonAlbumInputRef = useRef(null); // 공용 앨범 선택 Ref
    const commonCameraInputRef = useRef(null); // 공용 카메라 촬영 Ref
    const [showPhotoBottomSheet, setShowPhotoBottomSheet] = useState(false); // 바텀 시트 노출 상태
    const [activeUploadType, setActiveUploadType] = useState(null); // 현재 업로드 중인 항목 ('bizReg' | 'transLic' | 'insCert' | 'vehiclePhotos')

    const [formData, setFormData] = useState({
        vehicleNo: '',
        modelNm: '',
        manufactureYear: '',
        serviceClass: '',
        amenities: {
            "Table": false,
            "Wi-Fi": false,
            "USB-CHARGE": false,
            "Refrigerator": false,
            "Individual-Screen": false
        },
        hasAdas: 'N',
        lastInspectDt: '',
        insuranceExpDt: '',
        insuranceType: 'comprehensive',
        // 한글 주석: 사업자등록 정보 관련 상태 필드 추가
        bizNo: '',
        bizNm: '',
        ceoNm: '',
        bizAddr: '',
        bizType: '',
        bizItem: '',
        email: ''
    });

    const [previews, setPreviews] = useState({
        bizRegImg: '',
        transLicImg: '',
        insCertImg: '',
        vehiclePhotos: []
    });

    const [files, setFiles] = useState({
        bizRegFile: null,
        transLicFile: null,
        insCertFile: null,
        vehiclePhotos: []
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);

                // 1. 공통 코드 조회 (BUS_TYPE)
                try {
                    const codeRes = await request('/common/codes/BUS_TYPE');
                    if (codeRes?.success && Array.isArray(codeRes.data)) {
                        setBusTypes(codeRes.data);
                    }
                } catch (e) {
                    console.error('Failed to fetch bus types:', e);
                }

                // 2. 기사 프로필 정보 조회 (헤더용)
                try {
                    const profRes = await getDriverProfile();
                    if (profRes.success && profRes.data) {
                        setUserProfileImg(profRes.data.driver?.profileImg || '');
                    }
                } catch (e) {
                    console.error('Fetch driver profile error:', e);
                }

                // 3. 버스 정보 조회
                try {
                    const res = await getBusProfile();
                    if (res.success && res.data) {
                        const bus = res.data;
                        const savedAmenities = typeof bus.amenities === 'string' ? JSON.parse(bus.amenities) : (bus.amenities || {});
                        
                        // 데이터 스키마가 단순 객체 형태인 경우를 기본으로 하되, 
                        // 이전 버전(list 래퍼가 있는 경우)도 호환되도록 처리
                        let amenityObj = formData.amenities;
                        if (savedAmenities && typeof savedAmenities === 'object') {
                            if (savedAmenities.list && typeof savedAmenities.list === 'object' && !Array.isArray(savedAmenities.list)) {
                                amenityObj = { ...formData.amenities, ...savedAmenities.list };
                            } else if (!Array.isArray(savedAmenities)) {
                                amenityObj = { ...formData.amenities, ...savedAmenities };
                            }
                        }

                        setFormData({
                            vehicleNo: bus.vehicleNo || '',
                            modelNm: bus.modelNm || '',
                            manufactureYear: bus.manufactureYear || '',
                            serviceClass: bus.serviceClass || '',
                            amenities: amenityObj,
                            hasAdas: bus.hasAdas || 'N',
                            lastInspectDt: bus.lastInspectDt || '',
                            insuranceExpDt: bus.insuranceExpDt || '',
                            insuranceType: savedAmenities.insuranceType || 'comprehensive',
                            // 한글 주석: 서버로부터 받은 사업자등록 정보 바인딩
                            bizNo: bus.bizNo || '',
                            bizNm: bus.bizNm || '',
                            ceoNm: bus.ceoNm || '',
                            bizAddr: bus.bizAddr || '',
                            bizType: bus.bizType || '',
                            bizItem: bus.bizItem || '',
                            email: bus.email || ''
                        });
                        setPreviews({
                            bizRegImg: bus.bizRegImg || '',
                            transLicImg: bus.transLicImg || '',
                            insCertImg: bus.insCertImg || '',
                            vehiclePhotos: bus.vehiclePhotos || []
                        });
                    }
                } catch (err) {
                    console.error('Fetch bus profile error:', err);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmenityChange = (key) => {
        setFormData(prev => ({
            ...prev,
            amenities: {
                ...prev.amenities,
                [key]: !prev.amenities[key]
            }
        }));
    };

    const handleFileChange = async (e, key) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [key + 'Img']: reader.result }));
            setFiles(prev => ({ ...prev, [key + 'File']: file }));
        };
        reader.readAsDataURL(file);

        // 한글 주석: 사업자등록증 이미지 첨부 시 백엔드 OCR API 호출 연동
        if (key === 'bizReg') {
            try {
                Swal.fire({
                    title: '사업자등록증 인식 중',
                    text: '이미지에서 사업자 정보를 자동으로 분석하고 있습니다. 잠시만 기다려 주세요...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const ocrFormData = new FormData();
                ocrFormData.append('bizRegImg', file);

                const res = await request('/app/driver/ocr/bizreg', {
                    method: 'POST',
                    body: ocrFormData
                }, true);

                if (res.success && res.data) {
                    const info = res.data;
                    setFormData(prev => ({
                        ...prev,
                        bizNo: info.bizNo || prev.bizNo || '',
                        bizNm: info.bizNm || prev.bizNm || '',
                        ceoNm: info.ceoNm || prev.ceoNm || '',
                        bizAddr: info.bizAddr || prev.bizAddr || '',
                        bizType: info.bizType || prev.bizType || '',
                        bizItem: info.bizItem || prev.bizItem || ''
                    }));

                    Swal.fire({
                        icon: 'success',
                        title: '분석 완료',
                        text: '사업자 정보가 추출되어 화면에 자동으로 입력되었습니다.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error('인식 실패');
                }
            } catch (err) {
                console.error('[OCR Error]', err);
                Swal.fire({
                    icon: 'warning',
                    title: '자동 인식 불가',
                    text: '사업자등록증에서 정보를 추출하지 못했습니다. 아래 폼에 정보를 직접 입력해 주세요.',
                    confirmButtonText: '확인'
                });
            }
        }
    };

    const handleMultiFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        const updatedFiles = [...files.vehiclePhotos, ...newFiles].slice(-9);
        setFiles(prev => ({ ...prev, vehiclePhotos: updatedFiles }));

        const promises = updatedFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(results => {
            setPreviews(prev => ({ ...prev, vehiclePhotos: results }));
        });
    };
 
    // 공용 파일 인풋 체인지 헬퍼
    const handleCommonFileChange = (e) => {
        if (activeUploadType === 'vehiclePhotos') {
            handleMultiFileChange(e);
        } else {
            handleFileChange(e, activeUploadType);
        }
    };

    const handleSubmit = async () => {
        if (!formData.vehicleNo || !formData.modelNm) {
            notify.error('입력 오류', '차량 번호와 모델명은 필수 입력 사항입니다.');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (formData.insuranceExpDt && formData.insuranceExpDt < today) {
            notify.error('입력 오류', '보험 만료일은 오늘 이후 날짜여야 합니다.');
            return;
        }
        if (formData.lastInspectDt && formData.lastInspectDt < today) {
            notify.error('입력 오류', '차량 정기검사 유효기간은 오늘 이후 날짜여야 합니다.');
            return;
        }

        // 필수 서류 체크 (기존 previews에 이미지가 있거나 새로 선택한 파일이 있어야 함)
        if (!files.bizRegFile && !previews.bizRegImg) {
            notify.error('입력 오류', '사업자 등록증은 필수 입력 사항입니다.');
            return;
        }
        if (!files.transLicFile && !previews.transLicImg) {
            notify.error('입력 오류', '운송 허가증은 필수 입력 사항입니다.');
            return;
        }
        if (!files.insCertFile && !previews.insCertImg) {
            notify.error('입력 오류', '보험 증명서는 필수 입력 사항입니다.');
            return;
        }

        try {
            setSubmitting(true);
            const data = new FormData();
            
            data.append('vehicleNo', formData.vehicleNo);
            data.append('modelNm', formData.modelNm);
            data.append('manufactureYear', formData.manufactureYear);
            data.append('serviceClass', formData.serviceClass);
            data.append('hasAdas', formData.hasAdas);
            data.append('lastInspectDt', formData.lastInspectDt);
            data.append('insuranceExpDt', formData.insuranceExpDt);

            // 요청에 따라 'list' 래퍼와 'insuranceType'을 제외한 순수 편의시설 객체만 전송
            data.append('amenities', JSON.stringify(formData.amenities));

            // 한글 주석: 사업자등록 정보 관련 필드 FormData에 추가
            data.append('bizNo', formData.bizNo || '');
            data.append('bizNm', formData.bizNm || '');
            data.append('ceoNm', formData.ceoNm || '');
            data.append('bizAddr', formData.bizAddr || '');
            data.append('bizType', formData.bizType || '');
            data.append('bizItem', formData.bizItem || '');
            data.append('email', formData.email || '');

            if (files.bizRegFile) data.append('bizRegFile', files.bizRegFile);
            if (files.transLicFile) data.append('transLicFile', files.transLicFile);
            if (files.insCertFile) data.append('insCertFile', files.insCertFile);
            
            files.vehiclePhotos.forEach(file => {
                data.append('vehiclePhotos', file);
            });

            const res = await updateBusProfile(data);
            if (res.success) {
                notify.success('저장 완료', '버스 정보가 안전하게 저장되었습니다.');
                setTimeout(() => navigate('/driver-dashboard'), 2000);
            }
        } catch (err) {
            notify.error('저장 실패', err.message);
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
        <div className="bg-[#f7f9fb] text-[#191c1e] font-body min-h-screen pb-32 text-left">
            {/* TopAppBar */}
            {/* TopAppBar - 표준화된 헤더 스타일 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">버스 정보 등록</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Column */}
                    <div className="lg:col-span-4 flex flex-col gap-6 text-left">
                        <span className="text-[#9d4300] font-bold tracking-[0.2em] uppercase text-sm">기사 전용</span>
                        <h2 className="font-headline text-5xl font-extrabold text-[#004e47] leading-[1.1] tracking-tight">버스 정보 등록</h2>
                        <p className="text-[#3e4947] text-lg leading-relaxed max-w-sm">
                            승객에게 최고의 신뢰를 제공하기 위해 차량의 모든 제원과 서류를 꼼꼼히 등록해 주세요.
                        </p>
                        <div className="mt-8 p-6 bg-[#f2f4f6] rounded-xl border-l-4 border-[#9d4300]">
                            <p className="text-sm font-semibold text-[#9d4300] mb-2">필독 안내</p>
                            <p className="text-sm text-[#3e4947] leading-relaxed">모든 날짜 형식은 <span className="font-bold">YYYY-MM-DD</span> 형식을 지켜주세요. 허위 정보 기재 시 서비스 이용이 제한될 수 있습니다.</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Section 1 */}
                        <section className="space-y-6">
                            <div className="flex items-baseline justify-between border-b border-[#bec9c6] pb-4">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">01. 기본 정보 및 차량 등록</h3>
                                <span className="text-[#6e7977] text-xs font-bold uppercase tracking-widest">필수 입력</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">차량 번호</label>
                                    <input name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 서울 70 사 1234" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">섀시 모델명</label>
                                    <input name="modelNm" value={formData.modelNm} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 현대 유니버스, 기아 그랜버드" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">제작 연도 (Year)</label>
                                    <input name="manufactureYear" value={formData.manufactureYear} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 2023" type="number" />
                                </div>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-8 bg-white p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.08)]">
                            <div className="flex items-baseline justify-between text-left">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">02. 서비스 등급 및 유형</h3>
                                <span className="text-[#6e7977] text-xs font-bold uppercase tracking-widest">운행 정보</span>
                            </div>
                            <div className="space-y-4 text-left">
                                <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">버스 종류 및 등급</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {busTypes.map((type) => (
                                        <label key={type.code} className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.serviceClass === type.code ? 'border-[#9d4300] bg-[#9d4300]/5' : 'border-[#e6e8ea]'}`}>
                                            <input className="hidden" name="serviceClass" type="radio" value={type.code} checked={formData.serviceClass === type.code} onChange={handleInputChange} />
                                            <span className={`text-sm font-bold text-center ${formData.serviceClass === type.code ? 'text-[#9d4300]' : 'text-[#3e4947]'}`}>{type.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 text-left">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">차량 사진 (내/외부 포함 최대 9장)</label>
                                    <span className="text-[10px] text-[#6e7977] font-bold">{previews.vehiclePhotos.length} / 9</span>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                    <div onClick={() => {
                                        setActiveUploadType('vehiclePhotos');
                                        setShowPhotoBottomSheet(true);
                                    }} className="aspect-square bg-[#e6e8ea] rounded-xl border-2 border-dashed border-[#bec9c6] flex flex-col items-center justify-center cursor-pointer hover:border-[#004e47] transition-colors">
                                        <span className="material-symbols-outlined text-2xl text-[#6e7977]">add_a_photo</span>
                                    </div>
                                    {previews.vehiclePhotos.map((url, i) => (
                                        <div key={i} className="aspect-square bg-[#eceef0]/30 rounded-xl border border-[#bec9c6]/30 overflow-hidden">
                                            <img src={url} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-8 bg-white p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.08)]">
                            <div className="flex items-baseline justify-between text-left">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">03. 편의 시설 및 옵션</h3>
                                <span className="text-[#6e7977] text-xs font-bold uppercase tracking-widest">추가 옵션</span>
                            </div>
                            <div className="space-y-4 text-left">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {[
                                        { id: 'Table', label: '테이블', icon: 'table_restaurant' },
                                        { id: 'Wi-Fi', label: '와이파이', icon: 'wifi' },
                                        { id: 'USB-CHARGE', label: 'USB 충전', icon: 'usb' },
                                        { id: 'Refrigerator', label: '냉장고', icon: 'kitchen' },
                                        { id: 'Individual-Screen', label: '개인 모니터', icon: 'monitor' }
                                    ].map(item => (
                                        <label key={item.id} className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-colors group ${formData.amenities[item.id] ? 'bg-[#a1f1e5] text-[#004e47]' : 'bg-[#e6e8ea] text-[#6e7977]'}`}>
                                            <input className="hidden" type="checkbox" checked={formData.amenities[item.id]} onChange={() => handleAmenityChange(item.id)} />
                                            <span className="material-symbols-outlined text-2xl transition-colors">{item.icon}</span>
                                            <span className="text-[10px] font-bold uppercase mt-2 transition-colors text-center">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 text-left pt-6 border-t border-[#bec9c6]/30">
                                <p className="text-[10px] font-extrabold text-[#6e7977] uppercase tracking-[0.2em] ml-1">안전 장치</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors group ${formData.hasAdas === 'Y' ? 'bg-[#a1f1e5]' : 'bg-[#e6e8ea]'}`}>
                                        <input className="w-5 h-5 rounded border-[#bec9c6] text-[#004e47] focus:ring-[#004e47]" type="checkbox" checked={formData.hasAdas === 'Y'} onChange={(e) => setFormData(prev => ({ ...prev, hasAdas: e.target.checked ? 'Y' : 'N' }))} />
                                        <span className={`text-xs font-bold ${formData.hasAdas === 'Y' ? 'text-[#004e47]' : 'text-[#3e4947]'}`}>AEBS (자동 비상 제동 장치) 장착</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-6 text-left">
                            <div className="flex items-baseline justify-between border-b border-[#bec9c6] pb-4">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">04. 보험 및 자격 검증</h3>
                                <span className="text-[#6e7977] text-xs font-bold uppercase tracking-widest">보험/검사</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">보험 가입 현황</label>
                                    <select name="insuranceType" value={formData.insuranceType} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium">
                                        <option value="comprehensive">종합보험 (유상운송 특약 포함)</option>
                                        <option value="liability">책임보험</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">보험 만료일</label>
                                    <input name="insuranceExpDt" value={formData.insuranceExpDt} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium" type="date" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">차량 정기검사 유효기간</label>
                                    <input name="lastInspectDt" value={formData.lastInspectDt} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium" type="date" />
                                </div>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="space-y-6 text-left">
                            <div className="flex items-baseline justify-between border-b border-[#bec9c6] pb-4">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">05. 법적 증빙 서류 업로드 <span className="text-red-500">*</span></h3>
                                <span className="text-[#6e7977] text-xs font-bold uppercase tracking-widest">필수 증빙 서류</span>
                            </div>
                            <div className="space-y-4">
                                {
                                    [
                                        { key: 'bizReg', title: '사업자 등록증', desc: '유효한 사업자 등록증의 PDF 또는 고화질 사진을 업로드해 주세요.', color: 'bg-[#ffdbcf]', icon: 'badge' },
                                        { key: 'transLic', title: '운송 허가증', desc: '유효한 운송 허가증의 PDF 또는 고화질 사진을 업로드해 주세요.', color: 'bg-[#ffdbca]', icon: 'local_shipping' },
                                        { key: 'insCert', title: '보험 증명서 (책임/종합보험)', desc: '유효한 보험 가입 증명서의 PDF 또는 고화질 사진을 업로드해 주세요.', color: 'bg-[#a1f1e5]', icon: 'verified_user' }
                                    ].map((doc) => {
                                        // 한글 주석: PDF 형식인지 확인하는 플래그 (파일명 혹은 파일 객체의 type, base64 스키마로 탐지)
                                        const isPdf = files[doc.key + 'File']?.type === 'application/pdf' || 
                                                      (previews[doc.key + 'Img'] && previews[doc.key + 'Img'].startsWith('data:application/pdf')) ||
                                                      (previews[doc.key + 'Img'] && previews[doc.key + 'Img'].endsWith('.pdf'));
                                        return (
                                            <div key={doc.key} className="bg-[#e6e8ea] rounded-2xl p-1">
                                                <div className="bg-white rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                                                    <div className={`w-16 h-16 rounded-xl ${doc.color} flex items-center justify-center shrink-0 overflow-hidden`}>
                                                        {previews[doc.key + 'Img'] ? (
                                                            isPdf ? (
                                                                <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
                                                            ) : (
                                                                <img src={previews[doc.key + 'Img']} className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">{doc.icon}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 text-center md:text-left">
                                                        <h4 className="font-bold text-[#191c1e]">{doc.title} <span className="text-red-500">*</span></h4>
                                                        <p className="text-sm text-[#6e7977] mt-1">{doc.desc}</p>
                                                    </div>
                                                    <button onClick={() => {
                                                        setActiveUploadType(doc.key);
                                                        setShowPhotoBottomSheet(true);
                                                    }} className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#eceef0] text-[#004e47] font-bold text-sm hover:bg-[#004e47] hover:text-white transition-colors">
                                                        파일 추가
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </section>

                        {/* Section 6 */}
                        <section className="space-y-6 text-left bg-white p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.08)] border border-teal-500/10">
                            <div className="flex items-baseline justify-between border-b border-[#bec9c6] pb-4">
                                <h3 className="font-headline text-2xl font-bold text-[#191c1e]">06. 사업자 정보 확인</h3>
                                <span className="text-[#9d4300] text-xs font-bold uppercase tracking-widest">수정 가능</span>
                            </div>
                            <p className="text-xs text-[#6e7977] leading-relaxed">
                                사업자 등록증을 등록하면 정보가 자동으로 입력됩니다. 정보가 없거나 틀린 경우 직접 입력/수정할 수 있습니다.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">사업자등록번호</label>
                                    <input name="bizNo" value={formData.bizNo} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 120-00-00000" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">상호 (법인명)</label>
                                    <input name="bizNm" value={formData.bizNm} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: (주)버스타암스" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">대표자 성명</label>
                                    <input name="ceoNm" value={formData.ceoNm} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 홍길동" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">세금계산서 수신용 이메일</label>
                                    <input name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: tax@company.com" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">사업장 주소</label>
                                    <input name="bizAddr" value={formData.bizAddr} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 서울특별시 마포구 백범로 31길 21" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">업태</label>
                                    <input name="bizType" value={formData.bizType} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 서비스업, 운수업" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-[#004e47] uppercase tracking-wider ml-1">종목</label>
                                    <input name="bizItem" value={formData.bizItem} onChange={handleInputChange} className="w-full bg-[#e6e8ea] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#00685f] text-[#191c1e] font-medium placeholder:text-[#6e7977]/50" placeholder="예: 전세버스 운송업, 소프트웨어 개발" />
                                </div>
                            </div>
                        </section>

                        {/* Action Button */}
                        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
                            <button onClick={handleSubmit} disabled={submitting} className="w-full px-10 py-4 bg-gradient-to-br from-[#004e47] to-[#00685f] text-white rounded-xl font-headline font-bold text-lg shadow-xl shadow-[#004e47]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                {submitting ? '등록 중...' : '등록 완료'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* 공용 앨범 선택용 hidden input (한글 주석:차량 사진이 아닐 땐 PDF도 선택 가능하게 설정) */}
            <input 
                type="file" 
                ref={commonAlbumInputRef} 
                className="hidden" 
                onChange={handleCommonFileChange} 
                accept={activeUploadType === 'vehiclePhotos' ? 'image/*' : 'image/*,application/pdf'} 
                multiple={activeUploadType === 'vehiclePhotos'}
            />
            {/* 공용 카메라 촬영용 hidden input */}
            <input 
                type="file" 
                ref={commonCameraInputRef} 
                className="hidden" 
                onChange={handleCommonFileChange} 
                accept="image/*" 
                capture="environment" 
                multiple={activeUploadType === 'vehiclePhotos'}
            />

            {/* 공용 사진/서류 업로드 바텀 시트 */}
            {showPhotoBottomSheet && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowPhotoBottomSheet(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl p-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-100 text-center text-[#191c1e]">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                        <div className="space-y-2 text-left">
                            <h3 className="font-extrabold text-xl text-teal-900">
                                {activeUploadType === 'vehiclePhotos' ? '차량 사진 등록' : '서류 등록'}
                            </h3>
                            <p className="text-sm text-slate-500 font-semibold">
                                {activeUploadType === 'vehiclePhotos' ? '차량의 내/외부 사진을 업로드해 주세요.' : '증빙 서류 사진을 업로드해 주세요.'}
                            </p>
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

            <BottomNavDriver />
        </div>
    );
};

export default BusInfoRegistration;
