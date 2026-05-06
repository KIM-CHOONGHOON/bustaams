import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CommonView from '../CommonView/CommonView';

/** API 필드 `busId` = DB `TB_BUS_DRIVER_VEHICLE.BUS_ID` (`VARCHAR(10)` 0패딩 — `BusTaams 테이블.md`). */
/** `ownerId` = 세션 `userId` | `custId` | `userUuid` | `uuid` — REST에는 `userId` 필드로 전달. */
/** 끝 슬래시 제거. 비어 있으면 동일 출처 `/api` + Vite proxy(개발) 사용 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const ACCEPT_IMAGE = ALLOWED_IMAGE_TYPES.join(',');
const ACCEPT_DOC   = ALLOWED_DOC_TYPES.join(',');

/**
 * HTML(index)이 오면 JSON 파싱 전에 안내 — `Unexpected token '<'` 방지
 * @returns {{ res: Response, data: unknown }}
 */
async function fetchJson(url, init) {
    const res = await fetch(url, init);
    const text = await res.text();
    const trimmed = text.trimStart();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
        throw new Error(
            'API가 JSON 대신 HTML을 반환했습니다. 백엔드(예: 8080)가 실행 중인지, VITE_API_BASE_URL이 올바른지 확인하세요. 개발 시 Vite에 /api 프록시가 적용됩니다.'
        );
    }
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`서버 응답을 JSON으로 읽을 수 없습니다. (${res.status})`);
        }
    }
    return { res, data };
}

/** 제작 연도 선택 범위: 당해 기준 최대 20년 전 ~ 당해 */
const MANUFACTURE_YEAR_RANGE_BACK = 20;

function parseManufactureYearLabel(s) {
    if (!s || typeof s !== 'string') return null;
    const t = s.trim();
    const m1 = /^(\d{4})년형$/.exec(t);
    if (m1) return parseInt(m1[1], 10);
    const m2 = /^(\d{4})$/.exec(t);
    if (m2) return parseInt(m2[1], 10);
    return null;
}

function toManufactureYearLabel(y) {
    return `${y}년형`;
}

const defaultAmenities = () => ({
    wifi: false,
    usb: true,
    screen: false,
    fridge: true,
    table: false,
});

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

const BusInformationSetup = ({ close, currentUser }) => {
    const ownerId =
        currentUser?.userId ||
        currentUser?.custId ||
        '';

    const [busCodes, setBusCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [existingBusId, setExistingBusId] = useState(null);

    const [formData, setFormData] = useState({
        vehicleNo: '',
        modelNm: '',
        manufactureYear: toManufactureYearLabel(new Date().getFullYear()),
        mileage: '',
        serviceClass: '',
        amenities: defaultAmenities(),
        hasAdas: false,
        lastInspectDt: '',
        insuranceExpDt: '',
    });

    /** @type {{ biz: object|null, trans: object|null, ins: object|null }} */
    const [docSlots, setDocSlots] = useState({ biz: null, trans: null, ins: null });
    /** @type {(object|null)[]} */
    const [photoSlots, setPhotoSlots] = useState(() => Array(8).fill(null));

    const [isSubmitting, setIsSubmitting] = useState(false);
    /** null이면 formData 기준으로 표시, 포커스 시 네 자리 입력용 */
    const [yearDigitsInput, setYearDigitsInput] = useState(null);
    /** CommonView 대상: { fileId, docTitle } | null (TB_FILE_MASTER.FILE_ID) */
    const [commonViewTarget, setCommonViewTarget] = useState(null);

    const currentYear = new Date().getFullYear();
    const yearMax = currentYear;
    const yearMin = currentYear - MANUFACTURE_YEAR_RANGE_BACK;

    const manufactureYearOptions = useMemo(() => {
        const years = [];
        for (let y = yearMax; y >= yearMin; y--) years.push(y);
        const parsed = parseManufactureYearLabel(formData.manufactureYear);
        if (parsed != null && (parsed < yearMin || parsed > yearMax)) {
            if (!years.includes(parsed)) years.push(parsed);
            years.sort((a, b) => b - a);
        }
        return years;
    }, [formData.manufactureYear, yearMin, yearMax]);

    const fileUrl = useCallback(
        (fileId) => {
            const base = API_BASE || '';
            const path = `/api/driver/bus-documents/file?userId=${encodeURIComponent(ownerId || '')}&fileId=${encodeURIComponent(fileId)}`;
            return base ? `${base}${path}` : path;
        },
        [ownerId]
    );

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!ownerId) {
                setLoading(false);
                setLoadError('로그인 정보가 없습니다.');
                return;
            }
            setLoading(true);
            setLoadError(null);
            try {
                const api = (p) => (API_BASE ? `${API_BASE}${p}` : p);
                const [codesOut, busOut] = await Promise.all([
                    fetchJson(api(`/api/common-codes?grpCd=BUS_TYPE`)),
                    fetchJson(api(`/api/driver/bus?userId=${encodeURIComponent(ownerId)}`)),
                ]);
                const codesData = codesOut.data;
                const busData = busOut.data;
                const codesRes = codesOut.res;
                const busRes = busOut.res;
                if (cancelled) return;
                if (!codesRes.ok) throw new Error(codesData?.error || '공통코드를 불러오지 못했습니다.');
                if (!busRes.ok) throw new Error(busData?.error || '차량 정보를 불러오지 못했습니다.');

                const items = codesData?.items || [];
                setBusCodes(items);

                const bus = busData?.bus;
                if (bus) {
                    setExistingBusId(bus.busId);
                    const am = bus.amenities && typeof bus.amenities === 'object' ? { ...defaultAmenities(), ...bus.amenities } : defaultAmenities();
                    delete am.adas;
                    const myParsed = parseManufactureYearLabel(bus.manufactureYear || '');
                    const myLabel =
                        myParsed != null
                            ? toManufactureYearLabel(myParsed)
                            : bus.manufactureYear || toManufactureYearLabel(currentYear);
                    setFormData({
                        vehicleNo: bus.vehicleNo || '',
                        modelNm: bus.modelNm || '',
                        manufactureYear: myLabel,
                        mileage: bus.mileage != null ? String(bus.mileage) : '',
                        serviceClass: bus.serviceClass || (items[0]?.dtlCd ?? ''),
                        amenities: am,
                        hasAdas: !!bus.hasAdas,
                        lastInspectDt: bus.lastInspectDt || '',
                        insuranceExpDt: bus.insuranceExpDt || '',
                    });
                    setDocSlots({
                        biz: bus.bizRegFile?.fileId ? { mode: 'remote', fileId: bus.bizRegFile.fileId } : null,
                        trans: bus.transLicFile?.fileId ? { mode: 'remote', fileId: bus.transLicFile.fileId } : null,
                        ins: bus.insCertFile?.fileId ? { mode: 'remote', fileId: bus.insCertFile.fileId } : null,
                    });
                    const nextPhotos = Array(8).fill(null);
                    (bus.vehiclePhotoFileIds || []).slice(0, 8).forEach((fid, i) => {
                        if (fid) nextPhotos[i] = { mode: 'remote', fileId: fid };
                    });
                    setPhotoSlots(nextPhotos);
                } else {
                    setExistingBusId(null);
                    setFormData((prev) => ({
                        ...prev,
                        serviceClass: items[0]?.dtlCd || 'NORMAL',
                    }));
                    setDocSlots({ biz: null, trans: null, ins: null });
                    setPhotoSlots(Array(8).fill(null));
                }
            } catch (e) {
                if (!cancelled) setLoadError(e.message || String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [ownerId]);

    useEffect(() => {
        return () => {
            Object.values(docSlots).forEach((s) => {
                if (s?.mode === 'local' && s.previewUrl) URL.revokeObjectURL(s.previewUrl);
            });
            photoSlots.forEach((s) => {
                if (s?.mode === 'local' && s.previewUrl) URL.revokeObjectURL(s.previewUrl);
            });
        };
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name !== 'hasAdas') {
            setFormData((prev) => ({
                ...prev,
                amenities: { ...prev.amenities, [name]: checked },
            }));
        } else if (name === 'hasAdas') {
            setFormData((prev) => ({ ...prev, hasAdas: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleClassChange = (val) => {
        setFormData((prev) => ({ ...prev, serviceClass: val }));
    };

    const setDocFile = async (key, file) => {
        if (!file) return;
        if (!ALLOWED_DOC_TYPES.includes(file.type)) {
            alert('지원하지 않는 파일 형식입니다.\n허용 형식: JPG, PNG, WEBP, GIF 이미지 또는 PDF');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기가 너무 큽니다. 10MB 이하 파일을 선택해 주세요.');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setDocSlots((prev) => {
            const cur = prev[key];
            if (cur?.mode === 'local' && cur.previewUrl) URL.revokeObjectURL(cur.previewUrl);
            return { ...prev, [key]: { mode: 'local', file, previewUrl } };
        });
    };

    const setPhotoAt = async (index, file) => {
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert('지원하지 않는 파일 형식입니다.\n허용 형식: JPG, PNG, WEBP, GIF 이미지');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기가 너무 큽니다. 10MB 이하 파일을 선택해 주세요.');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setPhotoSlots((prev) => {
            const next = [...prev];
            const cur = next[index];
            if (cur?.mode === 'local' && cur.previewUrl) URL.revokeObjectURL(cur.previewUrl);
            next[index] = { mode: 'local', file, previewUrl };
            return next;
        });
    };

    const clearDoc = (key) => {
        setDocSlots((prev) => {
            const cur = prev[key];
            if (cur?.mode === 'local' && cur.previewUrl) URL.revokeObjectURL(cur.previewUrl);
            return { ...prev, [key]: null };
        });
    };

    const clearPhoto = (index) => {
        setPhotoSlots((prev) => {
            const next = [...prev];
            const cur = next[index];
            if (cur?.mode === 'local' && cur.previewUrl) URL.revokeObjectURL(cur.previewUrl);
            next[index] = null;
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ownerId) {
            alert('로그인 정보가 없습니다.');
            return;
        }
        if (!formData.serviceClass) {
            alert('서비스 등급(버스 종류)을 선택해 주세요.');
            return;
        }

        const myYear = parseManufactureYearLabel(formData.manufactureYear);
        if (myYear == null) {
            alert('제작 연도를 네 자리 연도(예: 2024) 또는 목록에서 선택해 주세요.');
            return;
        }
        if (!existingBusId && (myYear < yearMin || myYear > yearMax)) {
            alert(`제작 연도는 ${yearMin}년 ~ ${yearMax}년 사이로 선택해 주세요.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const amenitiesPayload = { ...formData.amenities };

            if (!existingBusId) {
                const body = {
                    userId: ownerId,
                    vehicleNo: formData.vehicleNo,
                    modelNm: formData.modelNm,
                    manufactureYear: formData.manufactureYear,
                    mileage: Number(formData.mileage) || 0,
                    serviceClass: formData.serviceClass,
                    amenities: amenitiesPayload,
                    hasAdas: formData.hasAdas,
                    lastInspectDt: formData.lastInspectDt || null,
                    insuranceExpDt: formData.insuranceExpDt || null,
                };

                if (docSlots.biz?.mode === 'local' && docSlots.biz.file) {
                    body.businessLicenseBase64 = await readFileAsDataUrl(docSlots.biz.file);
                    body.businessLicenseFileName = docSlots.biz.file.name;
                }
                if (docSlots.trans?.mode === 'local' && docSlots.trans.file) {
                    body.transportationLicenseBase64 = await readFileAsDataUrl(docSlots.trans.file);
                    body.transportationLicenseFileName = docSlots.trans.file.name;
                }
                if (docSlots.ins?.mode === 'local' && docSlots.ins.file) {
                    body.insurancePolicyBase64 = await readFileAsDataUrl(docSlots.ins.file);
                    body.insurancePolicyFileName = docSlots.ins.file.name;
                }

                const vPhotos = [];
                for (const s of photoSlots) {
                    if (s?.mode === 'local' && s.file) {
                        vPhotos.push({
                            base64: await readFileAsDataUrl(s.file),
                            fileName: s.file.name,
                        });
                    }
                }
                if (vPhotos.length) body.vehiclePhotos = vPhotos;

                const api = (p) => (API_BASE ? `${API_BASE}${p}` : p);
                const { res, data } = await fetchJson(api(`/api/driver/bus`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(data?.error || '차량 등록에 실패했습니다.');
                if (data?.busId) setExistingBusId(data.busId);
                alert('차량 정보 등록이 완료되었습니다.');
                return;
            }

            const patchBody = {
                userId: ownerId,
                busId: existingBusId,
                vehicleNo: formData.vehicleNo,
                modelNm: formData.modelNm,
                manufactureYear: formData.manufactureYear,
                mileage: Number(formData.mileage) || 0,
                serviceClass: formData.serviceClass,
                amenities: amenitiesPayload,
                hasAdas: formData.hasAdas,
                lastInspectDt: formData.lastInspectDt || null,
                insuranceExpDt: formData.insuranceExpDt || null,
            };

            const api = (p) => (API_BASE ? `${API_BASE}${p}` : p);
            const { res: patchRes, data: patchData } = await fetchJson(api(`/api/driver/bus`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody),
            });
            if (!patchRes.ok) throw new Error(patchData?.error || '차량 정보 수정에 실패했습니다.');

            const docBody = { userId: ownerId, busId: existingBusId };
            let hasDoc = false;
            if (docSlots.biz?.mode === 'local' && docSlots.biz.file) {
                docBody.businessLicenseBase64 = await readFileAsDataUrl(docSlots.biz.file);
                docBody.businessLicenseFileName = docSlots.biz.file.name;
                hasDoc = true;
            }
            if (docSlots.trans?.mode === 'local' && docSlots.trans.file) {
                docBody.transportationLicenseBase64 = await readFileAsDataUrl(docSlots.trans.file);
                docBody.transportationLicenseFileName = docSlots.trans.file.name;
                hasDoc = true;
            }
            if (docSlots.ins?.mode === 'local' && docSlots.ins.file) {
                docBody.insurancePolicyBase64 = await readFileAsDataUrl(docSlots.ins.file);
                docBody.insurancePolicyFileName = docSlots.ins.file.name;
                hasDoc = true;
            }
            if (hasDoc) {
                const { res: dr, data: dd } = await fetchJson(api(`/api/driver/bus/documents`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(docBody),
                });
                if (!dr.ok) throw new Error(dd?.error || '서류 갱신에 실패했습니다.');
            }

            const vehiclePhotos = [];
            for (const s of photoSlots) {
                if (!s) continue;
                if (s.mode === 'remote') {
                    vehiclePhotos.push({ fileId: s.fileId });
                } else if (s.mode === 'local' && s.file) {
                    vehiclePhotos.push({
                        dataUrl: await readFileAsDataUrl(s.file),
                        fileName: s.file.name,
                    });
                }
            }
            const { res: photoRes, data: photoData } = await fetchJson(api(`/api/driver/bus/photos`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: ownerId,
                    busId: existingBusId,
                    vehiclePhotos,
                }),
            });
            if (!photoRes.ok) throw new Error(photoData?.error || '차량 사진 갱신에 실패했습니다.');

            alert('차량 정보 수정이 완료되었습니다.');
        } catch (err) {
            console.error(err);
            alert(err.message || '처리 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const docPreview = (slot) => {
        if (!slot) return null;
        if (slot.mode === 'remote') {
            return (
                <img
                    src={fileUrl(slot.fileId)}
                    alt=""
                    className="max-h-28 object-contain mx-auto"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }
        if (slot.file?.type === 'application/pdf') {
            return <span className="text-xs text-outline">{slot.file.name}</span>;
        }
        return <img src={slot.previewUrl} alt="" className="max-h-28 object-contain mx-auto" />;
    };

    const photoPreview = (slot) => {
        if (!slot) return null;
        if (slot.mode === 'remote') {
            return (
                <img
                    src={fileUrl(slot.fileId)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }
        return <img src={slot.previewUrl} alt="" className="w-full h-full object-cover" />;
    };

    const gridCols = busCodes.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3';

    return (
        <>
        <div
            className="fixed inset-0 z-[100] flex min-h-0 items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            style={{ fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" }}
        >
            <div className="absolute inset-0" aria-hidden />
            <div className="relative my-auto flex min-h-0 w-full max-w-6xl max-h-[95vh] flex-col overflow-hidden rounded-3xl bg-surface-lowest shadow-ambient animate-in zoom-in-95 duration-200 bg-background text-on-background">
                <header className="flex shrink-0 items-center justify-between border-b border-surface-container-low bg-white/80 px-8 py-6 backdrop-blur-md">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-secondary uppercase mb-1">
                            {existingBusId ? '자산 정보' : '신규 자산 등록'}
                        </span>
                        <h1 className="font-extrabold text-2xl text-primary tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            차량 정보 {existingBusId ? '수정' : '등록'}
                        </h1>
                        <p className="text-sm text-outline-variant mt-1">
                            busTaams에 차량 정보를 등록·수정합니다. 저장 시 관리자 검토 후 반영됩니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 text-gray-500"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 md:px-12 py-8 no-scrollbar touch-pan-y">
                    {loadError && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-800 text-sm">{loadError}</div>
                    )}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-outline">
                            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                            <p className="font-bold">불러오는 중…</p>
                        </div>
                    ) : (
                        <form className="space-y-20" onSubmit={handleSubmit}>
                            {/* 01 */}
                            <section className="grid grid-cols-12 gap-8 items-start">
                                <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                    <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                                        01. 기본 정보
                                    </h2>
                                    <p className="text-sm text-outline">차량의 핵심 식별 정보를 입력해 주세요.</p>
                                </div>
                                <div className="col-span-12 md:col-span-8 bg-surface-container-low p-8 rounded-3xl space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary px-1">차량 번호</label>
                                            <input
                                                name="vehicleNo"
                                                value={formData.vehicleNo}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900"
                                                placeholder="예: 70아 1234"
                                                type="text"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary px-1">모델명</label>
                                            <input
                                                name="modelNm"
                                                value={formData.modelNm}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900"
                                                placeholder="예: 유니버스 노블 EX"
                                                type="text"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-bold text-primary px-1">제작 연도</label>
                                            <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
                                                <select
                                                    name="manufactureYear"
                                                    value={formData.manufactureYear}
                                                    onChange={(e) => {
                                                        setYearDigitsInput(null);
                                                        handleChange(e);
                                                    }}
                                                    className="w-full flex-1 min-w-0 bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900"
                                                >
                                                    {manufactureYearOptions.map((y) => {
                                                        const label = toManufactureYearLabel(y);
                                                        return (
                                                            <option key={label} value={label}>
                                                                {label}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <div className="flex items-center gap-2 sm:w-44 shrink-0">
                                                    <span className="text-xs text-outline whitespace-nowrap">직접 입력</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        placeholder="YYYY"
                                                        aria-label="제작 연도 네 자리"
                                                        className="w-full min-w-0 bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900 text-center tracking-widest"
                                                        value={
                                                            yearDigitsInput !== null
                                                                ? yearDigitsInput
                                                                : parseManufactureYearLabel(formData.manufactureYear) != null
                                                                  ? String(parseManufactureYearLabel(formData.manufactureYear))
                                                                  : ''
                                                        }
                                                        onFocus={() => {
                                                            const p = parseManufactureYearLabel(formData.manufactureYear);
                                                            setYearDigitsInput(p != null ? String(p) : '');
                                                        }}
                                                        onChange={(e) => {
                                                            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                            setYearDigitsInput(v);
                                                            if (v.length === 4) {
                                                                const num = parseInt(v, 10);
                                                                if (num >= yearMin && num <= yearMax) {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        manufactureYear: toManufactureYearLabel(num),
                                                                    }));
                                                                }
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            setYearDigitsInput(null);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-outline px-1">
                                                {yearMin}년형 ~ {yearMax}년형까지 스크롤하여 선택하거나, 네 자리 연도를 입력할 수 있습니다.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary px-1">주행 거리 (km)</label>
                                            <input
                                                name="mileage"
                                                value={formData.mileage}
                                                onChange={handleChange}
                                                className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900"
                                                placeholder="0"
                                                type="number"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 02 */}
                            <section className="grid grid-cols-12 gap-8 items-start">
                                <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                    <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                                        02. 서비스 등급
                                    </h2>
                                    <p className="text-sm text-outline">버스 종류(공통코드 BUS_TYPE) 중 하나를 선택합니다.</p>
                                </div>
                                <div className={`col-span-12 md:col-span-8 grid ${gridCols} gap-3`}>
                                    {busCodes.map((c) => (
                                        <button
                                            key={c.dtlCd}
                                            type="button"
                                            onClick={() => handleClassChange(c.dtlCd)}
                                            className={`p-4 rounded-2xl text-left transition-colors border-2 ${
                                                formData.serviceClass === c.dtlCd
                                                    ? 'bg-primary text-white border-primary shadow-lg'
                                                    : 'bg-surface-container-low border-transparent hover:bg-white hover:border-outline-variant'
                                            }`}
                                        >
                                            <span className="font-bold text-sm block">{c.cdNmKo}</span>
                                            {c.cdDescKo && (
                                                <span
                                                    className={`text-[10px] block mt-1 ${
                                                        formData.serviceClass === c.dtlCd ? 'text-white/85' : 'text-outline'
                                                    }`}
                                                >
                                                    {c.cdDescKo}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    {!busCodes.length && (
                                        <p className="col-span-full text-sm text-outline">버스 종류 코드를 불러오지 못했습니다.</p>
                                    )}
                                </div>
                            </section>

                            {/* 03 */}
                            <section className="grid grid-cols-12 gap-8 items-start">
                                <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                    <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                                        03. 편의 및 사양
                                    </h2>
                                    <p className="text-sm text-outline">편의 옵션과 최신 ADAS 여부를 설정합니다.</p>
                                </div>
                                <div className="col-span-12 md:col-span-8 space-y-6">
                                    <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-6 rounded-3xl">
                                        <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            security
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold">최신 ADAS</h4>
                                            <p className="text-[10px] text-outline">긴급제동, 차선이탈방지 등 (장착 시 ON)</p>
                                        </div>
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                name="hasAdas"
                                                checked={formData.hasAdas}
                                                onChange={handleChange}
                                                type="checkbox"
                                                className="rounded text-teal-600 w-5 h-5"
                                            />
                                            <span className="text-sm font-bold">장착</span>
                                        </label>
                                    </div>
                                    <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)]">
                                        <h4 className="text-xs font-bold text-primary mb-6">제공 가능한 어메니티</h4>
                                        <div className="flex flex-wrap gap-4">
                                            {[
                                                ['wifi', '와이파이'],
                                                ['usb', 'USB 충전'],
                                                ['screen', '개별 스크린'],
                                                ['fridge', '냉장고'],
                                                ['table', '테이블'],
                                            ].map(([k, label]) => (
                                                <label
                                                    key={k}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${
                                                        formData.amenities[k]
                                                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                                            : 'bg-surface-container hover:bg-surface-container-high'
                                                    }`}
                                                >
                                                    <input
                                                        name={k}
                                                        checked={!!formData.amenities[k]}
                                                        onChange={handleChange}
                                                        className="rounded text-teal-600 focus:ring-teal-500 border-none"
                                                        type="checkbox"
                                                    />
                                                    <span className="text-sm font-bold">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 04 */}
                            <section className="grid grid-cols-12 gap-8 items-start">
                                <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                    <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                                        04. 검사 및 서류
                                    </h2>
                                    <p className="text-sm text-outline">정기 검사 일정과 필수 운영 서류를 업로드해 주세요.</p>
                                </div>
                                <div className="col-span-12 md:col-span-8 space-y-6">
                                    <div className="bg-surface-container-low p-8 rounded-3xl grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary px-1">최근 정기점검일</label>
                                            <input
                                                name="lastInspectDt"
                                                value={formData.lastInspectDt}
                                                onChange={handleChange}
                                                className="w-full bg-white border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-gray-800 font-bold tracking-wider"
                                                type="date"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary px-1">보험 만료 예정일</label>
                                            <input
                                                name="insuranceExpDt"
                                                value={formData.insuranceExpDt}
                                                onChange={handleChange}
                                                className="w-full bg-white border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-gray-800 font-bold tracking-wider"
                                                type="date"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { key: 'biz',   title: '사업자 등록증',   hint: 'PDF/JPG (최대 10MB)', icon: 'upload_file' },
                                            { key: 'trans', title: '운송사업 허가증',  hint: '인증 완료 시 필수',   icon: 'assignment_turned_in' },
                                            { key: 'ins',   title: '보험증권',         hint: '대인/대물 배상 확인', icon: 'verified' },
                                        ].map(({ key, title, hint, icon }) => {
                                            const slot = docSlots[key];
                                            const hasRemote = slot?.mode === 'remote';
                                            return (
                                            <div key={key} className="relative bg-surface-container-high rounded-3xl border-2 border-dashed border-outline-variant flex flex-col overflow-hidden">
                                                {/* ── 업로드 영역 ── */}
                                                <label className="flex flex-col items-center justify-center text-center gap-2 cursor-pointer flex-1 p-4 min-h-[120px]">
                                                    <span className="material-symbols-outlined text-outline">{icon}</span>
                                                    <span className="text-xs font-bold">{title}</span>
                                                    <span className="text-[10px] text-outline">{hint}</span>
                                                    <input
                                                        type="file"
                                                        accept={ACCEPT_DOC}
                                                        className="hidden"
                                                        onChange={(ev) => setDocFile(key, ev.target.files?.[0])}
                                                    />
                                                </label>

                                                {/* ── 업로드된 파일 미리보기 + 제거 ── */}
                                                {slot && (
                                                    <div className="px-4 pb-2 text-center">
                                                        {docPreview(slot)}
                                                        <button
                                                            type="button"
                                                            onClick={() => clearDoc(key)}
                                                            className="mt-1 text-[10px] font-bold text-red-500 hover:underline"
                                                        >
                                                            제거
                                                        </button>
                                                    </div>
                                                )}

                                                {/* ── 파일보기 버튼 (항상 고정) ── */}
                                                <div className="border-t border-outline-variant/50 px-3 py-2">
                                                    <button
                                                        type="button"
                                                        title={hasRemote ? `${title} 파일보기` : '서버에 등록된 파일이 없습니다'}
                                                        onClick={() => {
                                                            if (hasRemote) {
                                                                setCommonViewTarget({ fileId: slot.fileId, docTitle: title });
                                                            }
                                                        }}
                                                        disabled={!hasRemote}
                                                        className={`w-full flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-all
                                                            ${hasRemote
                                                                ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                                                                : 'bg-slate-100 text-outline/40 cursor-not-allowed opacity-60'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                        파일보기
                                                    </button>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* 05 */}
                            <section className="grid grid-cols-12 gap-8 items-start mb-12">
                                <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                    <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                                        05. 차량 사진
                                    </h2>
                                    <p className="text-sm text-outline">최대 8장까지 등록할 수 있습니다.</p>
                                </div>
                                <div className="col-span-12 md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {photoSlots.map((slot, i) => (
                                        <div
                                            key={i}
                                            className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-outline-variant overflow-hidden bg-surface-container-high"
                                        >
                                            {slot ? (
                                                <>
                                                    {photoPreview(slot)}
                                                    <button
                                                        type="button"
                                                        onClick={() => clearPhoto(i)}
                                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-xs font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </>
                                            ) : (
                                                <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept={ACCEPT_IMAGE}
                                                        className="hidden"
                                                        onChange={(ev) => setPhotoAt(i, ev.target.files?.[0])}
                                                    />
                                                    <span className="material-symbols-outlined text-3xl text-outline">add_a_photo</span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <footer className="sticky bottom-0 bg-background/95 backdrop-blur-md pt-6 pb-6 border-t border-surface-container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 z-20">
                                <div className="flex items-center gap-4 px-1">
                                    <span className="w-3 h-3 rounded-full bg-secondary animate-pulse shrink-0" />
                                    <p className="text-sm font-bold text-on-surface-variant">
                                        모든 정보는 관리자 승인 후 플랫폼에 게시됩니다.
                                    </p>
                                </div>
                                <div className="flex gap-4 justify-end">
                                    <button
                                        className="px-8 py-4 rounded-full font-bold text-outline hover:bg-surface-container-high transition-colors"
                                        type="button"
                                        onClick={close}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className="bg-gradient-to-r from-[#004e47] to-[#00685f] px-12 py-4 rounded-full font-bold text-white shadow-xl shadow-teal-900/20 hover:scale-[1.02] transition-transform active:scale-[0.98] disabled:opacity-75"
                                        type="submit"
                                        disabled={isSubmitting || loading || !!loadError}
                                    >
                                        {isSubmitting
                                            ? '처리 중…'
                                            : loading
                                              ? '불러오는 중…'
                                              : existingBusId
                                                ? '차량 수정 완료'
                                                : '차량 등록 완료'}
                                    </button>
                                </div>
                            </footer>
                        </form>
                    )}
                </div>
            </div>
        </div>
        {/* 서류 뷰어 — CommonView 중첩 모달 (소유 기사 본인 파일만) */}
        {commonViewTarget && (
            <CommonView
                close={() => setCommonViewTarget(null)}
                fileId={commonViewTarget.fileId}
                userId={ownerId}
                docTitle={commonViewTarget.docTitle}
            />
        )}
        </>
    );
};

export default BusInformationSetup;