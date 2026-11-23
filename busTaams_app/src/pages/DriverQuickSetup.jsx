import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getDriverQuickSetup, submitDriverQuickSetup, logout } from '../api';
import { notify } from '../utils/toast';
import { compressImage } from '../utils/image';

// 기사 최초 로그인 간편 초기 등록 화면 (운전면허증 사진 + 차량번호 + 승차 인원 + 차량 사진) (한글 주석)
const DriverQuickSetup = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [userName, setUserName] = useState('기사님');
    const [busTypes, setBusTypes] = useState([]);
    const [missingItems, setMissingItems] = useState([]);

    // 기존 등록 정보 및 입력 상태 (한글 주석)
    const [existingLicenseUrl, setExistingLicenseUrl] = useState('');
    const [licenseApproveStat, setLicenseApproveStat] = useState(null);
    const [licenseFile, setLicenseFile] = useState(null);
    const [licensePreview, setLicensePreview] = useState('');

    const [vehicleNo, setVehicleNo] = useState('');
    const [serviceClass, setServiceClass] = useState('');

    // 기존 차량 사진 목록 ({ fileId, url }) 및 신규 추가 차량 사진 목록 ({ file, preview }) (한글 주석)
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [newPhotos, setNewPhotos] = useState([]);

    const licenseInputRef = useRef(null);
    const vehiclePhotoInputRef = useRef(null);
    // 재시도 시 중복 파일·이력 생성을 막기 위한 요청 식별 키 Ref (입력 변경 시 갱신, 한글 주석)
    const idempotencyKeyRef = useRef('');
    const generateIdempotencyKey = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `qs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    };

    // 입력 내용(면허 사진·차량번호·승차 인원·차량 사진)이 하나라도 변경되면 이전 요청 식별 키를 즉시 초기화 (한글 주석)
    useEffect(() => {
        idempotencyKeyRef.current = '';
    }, [licenseFile, vehicleNo, serviceClass, existingPhotos, newPhotos]);

    useEffect(() => {
        const fetchSetupStatus = async () => {
            try {
                setLoading(true);
                const res = await getDriverQuickSetup();
                if (res.success && res.data) {
                    const d = res.data;
                    // 서버 기준으로 이미 간편 등록이 완료된 경우 대시보드로 즉시 이동 (한글 주석)
                    if (d.isQuickSetupCompleted) {
                        navigate('/driver-dashboard', { replace: true });
                        return;
                    }
                    setUserName(d.userName || '기사님');
                    setBusTypes(d.busTypes || []);
                    setMissingItems(d.missingItems || []);
                    if (d.licenseImg) {
                        setExistingLicenseUrl(d.licenseImg);
                        setLicensePreview(d.licenseImg);
                    }
                    setLicenseApproveStat(d.licenseApproveStat || null);
                    setVehicleNo(d.vehicleNo || '');
                    setServiceClass(d.serviceClass || '');
                    setExistingPhotos(Array.isArray(d.vehiclePhotos) ? d.vehiclePhotos : []);
                }
            } catch (err) {
                console.error('[DriverQuickSetup] Fetch error:', err);
                const msg = err.message || '초기 등록 정보를 불러오지 못했습니다.';
                if (msg.includes('인증') || msg.includes('토큰') || msg.includes('로그인')) {
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                notify.error('조회 오류', msg);
            } finally {
                setLoading(false);
            }
        };
        fetchSetupStatus();
    }, [navigate]);

    // 운전면허증 사진 선택 핸들러 (자동 이미지 압축 포함, 한글 주석)
    const handleLicenseFileChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        e.target.value = '';

        if (!file.type.startsWith('image/')) {
            notify.warn('파일 형식 오류', '이미지 파일(JPG, PNG 등)만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            notify.warn('용량 초과', '운전면허증 사진은 10MB 이하만 업로드할 수 있습니다.');
            return;
        }

        try {
            const compressed = await compressImage(file, 1600, 1600, 0.85);
            const finalFile = compressed instanceof File ? compressed : file;
            setLicenseFile(finalFile);
            const reader = new FileReader();
            reader.onloadend = () => setLicensePreview(reader.result);
            reader.readAsDataURL(finalFile);
        } catch (compErr) {
            console.warn('[DriverQuickSetup] License compress fallback:', compErr);
            setLicenseFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLicensePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // 차량 사진 다중 선택 핸들러 (기존 사진 + 신규 사진 합계 최대 8장, 한글 주석)
    const handleVehiclePhotosChange = async (e) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length === 0) return;
        e.target.value = '';

        const currentCount = existingPhotos.length + newPhotos.length;
        const remainSlots = 8 - currentCount;
        if (remainSlots <= 0) {
            notify.warn('최대 장수 초과', '차량 사진은 최대 8장까지 등록할 수 있습니다.');
            return;
        }

        const targetFiles = selected.slice(0, remainSlots);
        if (selected.length > remainSlots) {
            notify.warn('일부 사진 제외', `최대 8장까지 등록 가능하여 ${remainSlots}장만 추가됩니다.`);
        }

        const processed = [];
        for (const f of targetFiles) {
            if (!f.type.startsWith('image/')) {
                notify.warn('파일 형식 오류', `${f.name}: 이미지 파일만 업로드 가능합니다.`);
                continue;
            }
            if (f.size > 10 * 1024 * 1024) {
                notify.warn('용량 초과', `${f.name}: 10MB 이하의 이미지만 가능합니다.`);
                continue;
            }
            let finalFile = f;
            try {
                const compressed = await compressImage(f, 1600, 1600, 0.82);
                if (compressed instanceof File) finalFile = compressed;
            } catch (compErr) {
                console.warn('[DriverQuickSetup] Vehicle photo compress fallback:', compErr);
            }
            const previewUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(finalFile);
            });
            processed.push({ file: finalFile, preview: previewUrl });
        }

        if (processed.length > 0) {
            setNewPhotos(prev => [...prev, ...processed]);
        }
    };

    const handleRemoveExistingPhoto = (fileId) => {
        setExistingPhotos(prev => prev.filter(p => p.fileId !== fileId));
    };

    const handleRemoveNewPhoto = (idx) => {
        setNewPhotos(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        // 1. 운전면허증 사진 확인 (한글 주석)
        if (!licenseFile && !existingLicenseUrl) {
            notify.warn('필수 입력', '운전면허증 사진을 등록해 주세요.');
            return;
        }

        // 2. 차량 번호 형식 확인 (대한민국 번호판 패턴: 서울70자1234, 192너8567 등, 한글 주석)
        const cleanVehicleNo = vehicleNo.replace(/[\s-]/g, '').trim();
        const vehicleNoRegex = /^(?:[가-힣]{2})?\d{2,3}[가-힣]\d{4}$/;
        if (!cleanVehicleNo || !vehicleNoRegex.test(cleanVehicleNo)) {
            notify.warn('차량 번호 형식 오류', '올바른 차량 번호를 입력해 주세요. (예: 서울70자1234, 192너8567)');
            return;
        }

        // 3. 차량 승차 인원(차종) 확인 (한글 주석)
        if (!serviceClass) {
            notify.warn('필수 입력', '차량의 승차 인원(차종)을 선택해 주세요.');
            return;
        }

        // 4. 차량 사진 확인 (한글 주석)
        const totalPhotoCount = existingPhotos.length + newPhotos.length;
        if (totalPhotoCount < 1) {
            notify.warn('필수 입력', '차량 사진을 최소 1장 이상 등록해 주세요.');
            return;
        }

        try {
            setSubmitting(true);
            // 동일 내용 재시도 시 같은 요청 식별 키 유지 (한글 주석)
            if (!idempotencyKeyRef.current) {
                idempotencyKeyRef.current = generateIdempotencyKey();
            }
            const reqKey = idempotencyKeyRef.current;

            const formData = new FormData();
            formData.append('idempotencyKey', reqKey);
            formData.append('vehicleNo', cleanVehicleNo);
            formData.append('serviceClass', serviceClass);
            formData.append('keepPhotoIds', JSON.stringify(existingPhotos.map(p => p.fileId)));

            if (licenseFile) {
                formData.append('licenseImg', licenseFile);
            }
            newPhotos.forEach((item) => {
                formData.append('vehiclePhotos', item.file);
            });

            const res = await submitDriverQuickSetup(formData, reqKey);
            if (res.success) {
                idempotencyKeyRef.current = '';
                await Swal.fire({
                    icon: 'success',
                    title: '등록 완료!',
                    text: '기본 등록이 완료되었습니다. 지금 바로 청약 확인 및 서비스 이용이 가능합니다.',
                    confirmButtonColor: '#00685f',
                    confirmButtonText: '대시보드로 이동',
                    allowOutsideClick: false
                });
                navigate('/driver-dashboard', { replace: true });
            } else {
                notify.error('저장 실패', res.error || '등록 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('[DriverQuickSetup] Submit error:', err);
            notify.error('등록 실패', err.message || '서버 통신 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: '로그아웃',
            text: '등록을 중단하고 로그아웃 하시겠습니까?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00685f',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: '로그아웃',
            cancelButtonText: '계속 등록하기'
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                navigate('/login', { replace: true });
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-teal-900 font-bold text-sm">초기 등록 정보를 확인하는 중입니다...</p>
            </div>
        );
    }

    const totalPhotoCount = existingPhotos.length + newPhotos.length;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-body">
            {/* 상단 헤더 */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                    <img src="/app/assets/BUSTAAMS_IMAGE_LOGO.png" alt="BUSTAAMS" className="w-8 h-8 object-contain rounded-lg" />
                    <div>
                        <h1 className="text-base font-extrabold text-teal-900 leading-tight">기사님 간편 초기 등록</h1>
                        <p className="text-[11px] text-slate-500 font-medium">{userName}님, 4가지만 등록하면 바로 이용 가능합니다</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-bold text-slate-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                    로그아웃
                </button>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
                {/* 안내 배너 */}
                <div className="bg-gradient-to-br from-teal-800 to-teal-900 text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-300 text-2xl mt-0.5">bolt</span>
                        <div className="space-y-1 text-left">
                            <h2 className="font-extrabold text-base">빠른 시작을 위한 필수 정보</h2>
                            <p className="text-xs text-teal-100 leading-relaxed">
                                운전면허증 사진, 차량 번호, 승차 인원, 차량 사진만 등록하시면 바로 청약 목록 확인과 입찰을 시작할 수 있습니다.
                                나머지 상세 정보(자격증·사업자등록증·계좌 등)는 대시보드 메뉴에서 언제든 입력하실 수 있습니다.
                            </p>
                            {missingItems.length > 0 && missingItems.length < 4 && (
                                <p className="text-[11px] font-bold text-amber-200 pt-1">
                                    ※ 기존에 등록된 정보는 자동으로 불러왔습니다. 누락된 항목만 채워주세요!
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. 운전면허증 사진 */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">1</span>
                                <h3 className="font-extrabold text-slate-900 text-sm">운전면허증 사진 <span className="text-red-500">*</span></h3>
                            </div>
                            {existingLicenseUrl && !licenseFile && (
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    licenseApproveStat === 'APPROVE'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-teal-50 text-teal-700'
                                }`}>
                                    {licenseApproveStat === 'APPROVE' ? '승인 완료(유지됨)' : '등록됨'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">운전면허증 앞면이 선명하게 보이도록 촬영하거나 앨범에서 선택해 주세요.</p>

                        <input
                            ref={licenseInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLicenseFileChange}
                            className="hidden"
                        />

                        {licensePreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                <img src={licensePreview} alt="운전면허증 미리보기" className="w-full max-h-56 object-contain bg-slate-100" />
                                <button
                                    type="button"
                                    onClick={() => licenseInputRef.current?.click()}
                                    className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md"
                                >
                                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                                    사진 변경
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => licenseInputRef.current?.click()}
                                className="w-full py-10 border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                            >
                                <span className="material-symbols-outlined text-teal-700 text-4xl">badge</span>
                                <span className="text-sm font-bold text-teal-900">운전면허증 사진 촬영 / 업로드</span>
                                <span className="text-[11px] text-slate-400">JPG, PNG 등 이미지 파일 (최대 10MB)</span>
                            </button>
                        )}
                    </section>

                    {/* 2. 차량 번호 입력 */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 text-left">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">2</span>
                            <h3 className="font-extrabold text-slate-900 text-sm">차량 번호 <span className="text-red-500">*</span></h3>
                        </div>
                        <p className="text-xs text-slate-500">운행하실 버스의 차량 번호를 정확하게 입력해 주세요. (예: 서울70자1234)</p>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">directions_bus</span>
                            <input
                                type="text"
                                value={vehicleNo}
                                onChange={(e) => setVehicleNo(e.target.value)}
                                placeholder="예: 서울70자1234"
                                maxLength={20}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition-all"
                            />
                        </div>
                    </section>

                    {/* 3. 차량 승차 인원(차종) 선택 */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 text-left">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">3</span>
                            <h3 className="font-extrabold text-slate-900 text-sm">차량 승차 인원 (차종) <span className="text-red-500">*</span></h3>
                        </div>
                        <p className="text-xs text-slate-500">선택하신 승차 인원 기준으로 맞춤 여행 청약 목록이 자동 매칭됩니다.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {busTypes.map((bt) => {
                                const isSelected = serviceClass === bt.code;
                                return (
                                    <button
                                        key={bt.code}
                                        type="button"
                                        onClick={() => setServiceClass(bt.code)}
                                        className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                                            isSelected
                                                ? 'border-teal-700 bg-teal-50/70 shadow-sm'
                                                : 'border-slate-100 bg-slate-50/60 hover:border-slate-300'
                                        }`}
                                    >
                                        <div>
                                            <p className={`font-extrabold text-sm ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
                                                {bt.name}
                                            </p>
                                            {bt.description && (
                                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{bt.description}</p>
                                            )}
                                        </div>
                                        <span className={`material-symbols-outlined text-xl shrink-0 ml-2 ${
                                            isSelected ? 'text-teal-700' : 'text-slate-300'
                                        }`}>
                                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* 4. 차량 사진 업로드 */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">4</span>
                                <h3 className="font-extrabold text-slate-900 text-sm">차량 사진 <span className="text-red-500">*</span></h3>
                            </div>
                            <span className="text-xs font-bold text-teal-700">{totalPhotoCount} / 8장</span>
                        </div>
                        <p className="text-xs text-slate-500">차량 외관 및 실내 사진을 최소 1장 이상(최대 8장) 등록해 주세요.</p>

                        <input
                            ref={vehiclePhotoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleVehiclePhotosChange}
                            className="hidden"
                        />

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {/* 기존 서버에 저장된 사진 */}
                            {existingPhotos.map((photo) => (
                                <div key={photo.fileId} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                    <img src={photo.url} alt="기존 차량 사진" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExistingPhoto(photo.fileId)}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                        title="사진 삭제"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))}

                            {/* 새로 선택한 사진 */}
                            {newPhotos.map((photo, idx) => (
                                <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-teal-500 bg-slate-100">
                                    <img src={photo.preview} alt={`신규 차량 사진 ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveNewPhoto(idx)}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                        title="사진 삭제"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))}

                            {/* 사진 추가 버튼 */}
                            {totalPhotoCount < 8 && (
                                <button
                                    type="button"
                                    onClick={() => vehiclePhotoInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <span className="material-symbols-outlined text-teal-700 text-2xl">add_a_photo</span>
                                    <span className="text-[11px] font-bold text-teal-800">사진 추가</span>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* 저장 및 바로 시작하기 버튼 */}
                    <div className="pt-2 space-y-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full py-4 rounded-2xl font-extrabold text-base text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                submitting
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-teal-700 hover:bg-teal-800 active:scale-[0.99] shadow-teal-900/20'
                            }`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>등록 처리 중입니다...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                    <span>등록 완료하고 바로 시작하기</span>
                                </>
                            )}
                        </button>
                        <p className="text-center text-[11px] text-slate-400">
                            상세 기사 정보 및 사업자 서류는 완료 후 대시보드 메뉴에서 언제든 추가로 등록할 수 있습니다.
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default DriverQuickSetup;

