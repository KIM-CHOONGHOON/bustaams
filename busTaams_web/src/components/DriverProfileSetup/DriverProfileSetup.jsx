import React, { useState, useRef, useEffect, useCallback } from 'react';
import CommonView from '../CommonView/CommonView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const ACCEPT_DOC   = ALLOWED_DOC_TYPES.join(',');

/** 휴대전화 번호 표시용 (숫자만 입력 → XXX-XXXX-XXXX) */
function formatHpKrDigits(digits) {
  const d = String(digits ?? '').replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const a = d.slice(0, 3);
  const b = d.slice(3, 7);
  const c = d.slice(7, 11);
  if (!b.length) return a;
  if (!c.length) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

function loadDaumPostcode(cb) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const w = window;
  if (w.daum && w.daum.Postcode) {
    cb();
    return;
  }
  let s = document.getElementById('daum-postcode-script');
  if (!s) {
    s = document.createElement('script');
    s.id = 'daum-postcode-script';
    s.async = true;
    s.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.onload = cb;
    document.body.appendChild(s);
    return;
  }
  s.addEventListener('load', cb, { once: true });
}

function formatFileSizeBytes(n) {
  if (n == null || Number.isNaN(Number(n)) || Number(n) < 0) return '';
  const v = Number(n);
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
  if (v >= 1024) return `${Math.round(v / 1024)} KB`;
  return `${v} B`;
}

/** 서버 `TB_DRIVER_DOCS` 원본명 + 확장자로 표시용 파일명 */
function qualServerDisplayFilename(orgNm, ext) {
  const base = (orgNm || '').trim() || '자격증사본';
  const e = String(ext || '')
    .replace(/^\./, '')
    .trim()
    .toLowerCase();
  return e ? `${base}.${e}` : base;
}

/** 운송자격번호 비교용(서버 isQualCertUnchanged 와 동일 규칙: 하이픈·공백 무시) */
function normQualCertBaseline(s) {
  return String(s ?? '').replace(/[\s-]/g, '').trim();
}

/** ScrollSpy / 앵커 스크롤용 단계 (좌측 네비) */
const STEPS = [
  { id: 1, label: '기본 인적사항' },
  { id: 2, label: '운전면허 정보' },
  { id: 3, label: '운송종사자 자격' },
];

const DriverProfileSetup = ({ currentUser, onBack, close }) => {
  const [formData, setFormData] = useState({
    name: currentUser?.userNm || currentUser?.userName || currentUser?.name || '',
    phoneNo: (currentUser?.hpNo || currentUser?.phoneNo || currentUser?.phoneNumber || '').replace(/\D/g, ''),
    addrType: 'HOME',
    addrOtherLabel: '',
    zipcode: '',
    streetAddress: '',
    detailAddress: '',
    licenseType: '1종 대형',
    licenseNo: '',
    licenseSerialNo: '',
    licenseIssueDt: '2023-01-01',
    licenseExpiryDt: '2033-01-01',
    qualCertNo: '',
    bioText: '',
    /** 회원등급 TB_COMMON_CODE FEE_POLICY.DTL_CD */
    FEE_POLICY: ''
  });

  const profilePhotoBlobRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [qualCert, setQualCert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileModalTitle, setProfileModalTitle] = useState('');
  const [profileExistsOnServer, setProfileExistsOnServer] = useState(false);
  const [licenseFieldsLocked, setLicenseFieldsLocked] = useState(false);
  const [qualFieldsLocked, setQualFieldsLocked] = useState(false);
  const [hasProfilePhotoOnServer, setHasProfilePhotoOnServer] = useState(false);
  const [hasQualCertFileOnServer, setHasQualCertFileOnServer] = useState(false);
  const [qualCertFileId, setQualCertFileId] = useState(null);
  const [qualCertVerifyStatus, setQualCertVerifyStatus] = useState('UNVERIFIED');
  /** 서버에 등록된 자격증 원본 파일명·확장자 (GET 또는 POST 후) */
  const [qualCertServerOrgNm, setQualCertServerOrgNm] = useState('');
  const [qualCertServerExt, setQualCertServerExt] = useState('');
  const [qualCertServerSize, setQualCertServerSize] = useState(null);
  const [qualCertPickLabel, setQualCertPickLabel] = useState('');
  /** 서버 파일 이미지 미리보기 blob URL */
  const [qualCertServerThumbUrl, setQualCertServerThumbUrl] = useState(null);
  const qualCertThumbBlobRef = useRef(null);
  /** 자격증 사본 문서 보기 모달 */
  const [showQualCertViewer, setShowQualCertViewer] = useState(false);
  /** 저장 성공 안내 모달 */
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  /** 1: 기본 인적사항(프로필사진~인적) 2: 면허 3: 운송자격+자기소개+제출 */
  const [activeStep, setActiveStep] = useState(1);
  /** TB_COMMON_CODE 기반 회원등급 콤보 */
  const [feePolicyOptions, setFeePolicyOptions] = useState([]);
  /** TB_USER.RESIDENT_NO_ENC 조회·마스킹 문자열(본 모달에서 수정 불가) */
  const [residentNoDisplay, setResidentNoDisplay] = useState('');

  const certInputRef = useRef(null);
  const scrollRef = useRef(null);
  const section1Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  /** 각 단계 섹션 제목(h2) — 클릭 시 이 위치로 스크롤 */
  const title1Ref = useRef(null);
  const title2Ref = useRef(null);
  const title3Ref = useRef(null);
  /** 서버에 저장된 자격번호 스냅샷 — 변경 여부로 진위 호출 분기 */
  const qualCertBaselineRef = useRef('');

  const scrollToSection = useCallback((step) => {
    setActiveStep(step);
    const refs = [null, title1Ref, title2Ref, title3Ref];
    const el = refs[step]?.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const run = () => {
      const top =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  /** 이 화면에서만 문서 전체 스크롤 차단 — 우측 폼만 스크롤, 좌측 1·2·3 버튼은 고정 */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyOverscroll: body.style.overscrollBehavior,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
      rootMinH: root?.style.minHeight ?? '',
      rootDisplay: root?.style.display ?? '',
      rootFlex: root?.style.flexDirection ?? '',
    };
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.overscrollBehavior = 'none';
    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
    }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
        root.style.minHeight = prev.rootMinH;
        root.style.display = prev.rootDisplay;
        root.style.flexDirection = prev.rootFlex;
      }
    };
  }, []);

  /** 회원등급(FEE_POLICY) 콤보 — TB_COMMON_CODE FEE_POLICY + FEE_POLICY_CNT */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/driver/fee-policy-options`);
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setFeePolicyOptions(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setFeePolicyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 저장된 기사 정보 GET → 폼 채움 (`custId` 필수) */
  useEffect(() => {
    const custId = currentUser?.custId != null ? String(currentUser.custId).trim() : '';
    if (!custId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/driver/profile-setup?custId=${encodeURIComponent(custId)}`
        );
        const data = await res.json();
        if (cancelled || !res.ok) return;

        const nm = (data.userName || '').trim();
        if (nm) setProfileModalTitle(`${nm} 기사님`);

        setHasQualCertFileOnServer(!!data.hasQualCertFile);
        setQualCertFileId(data.qualCertFileId || null);
        setQualCertServerOrgNm(
          data.qualCertOrgFileNm != null ? String(data.qualCertOrgFileNm) : ''
        );
        setQualCertServerExt(
          data.qualCertFileExt != null ? String(data.qualCertFileExt).toLowerCase() : ''
        );
        setQualCertServerSize(
          typeof data.qualCertFileSize === 'number' ? data.qualCertFileSize : null
        );

        const feePolicyFromApi = data.feePolicy != null ? String(data.feePolicy).trim() : '';
        const feePolicyFromSession =
          currentUser?.subscription?.feePolicy != null
            ? String(currentUser.subscription.feePolicy).trim()
            : '';
        const feePolicyLoaded = (() => {
          let v = feePolicyFromApi || feePolicyFromSession;
          if (v === 'DRIVER_GENNERAL') v = 'DRIVER_GENERAL';
          return v || '';
        })();
        setFormData((prev) => ({
          ...prev,
          FEE_POLICY: feePolicyLoaded,
          ...(data.userNm || data.userName || data.phoneNo || data.hpNo
            ? {
                name: data.userNm || data.userName || prev.name,
                phoneNo: (
                  data.hpNo ||
                  data.phoneNo ||
                  currentUser?.hpNo ||
                  currentUser?.phoneNo ||
                  ''
                )
                  .replace(/\D/g, '')
                  .slice(0, 11),
                addrType: data.addrType || prev.addrType,
                addrOtherLabel: data.addrName || '',
                zipcode: data.zipcode ?? '',
                streetAddress: data.address ?? '',
                detailAddress: data.detailAddress ?? '',
                bioText: data.bioText ?? prev.bioText,
              }
            : {}),
        }));

        /** TB_USER.PROFILE_FILE_ID → GET /profile-photo (서버에서 TB_FILE_MASTER·GCS) — exists 무관 */
        setHasProfilePhotoOnServer(!!data.hasProfilePhoto);
        const profileFidResolved = data.profilePhotoFileId || data.profilePhotoId;

        const applyProfilePhotoBlob = async (fid) => {
          if (!fid) {
            if (profilePhotoBlobRef.current) {
              URL.revokeObjectURL(profilePhotoBlobRef.current);
              profilePhotoBlobRef.current = null;
            }
            setProfilePhoto(null);
            return;
          }
          const urlStr = `${API_BASE}/api/driver/profile-photo?custId=${encodeURIComponent(custId)}&fileId=${encodeURIComponent(fid)}`;
          try {
            const photoRes = await fetch(urlStr);
            if (cancelled) return;

            if (!photoRes.ok) {
              if (import.meta.env.DEV) {
                let errHint = '';
                try {
                  const ct = photoRes.headers.get('content-type') || '';
                  if (ct.includes('application/json')) {
                    const j = await photoRes.clone().json().catch(() => null);
                    if (j && typeof j.error === 'string') errHint = j.error;
                  }
                } catch (_) {
                  /* ignore */
                }
                console.warn('[DriverProfileSetup] profile-photo HTTP', photoRes.status, urlStr, errHint);
              }
              if (profilePhotoBlobRef.current) {
                URL.revokeObjectURL(profilePhotoBlobRef.current);
                profilePhotoBlobRef.current = null;
              }
              setProfilePhoto(null);
              return;
            }

            const blob = await photoRes.blob();
            if (cancelled) return;

            const ct = (blob.type || photoRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            if (!blob.size || ct.includes('application/json')) {
              if (import.meta.env.DEV) {
                console.warn('[DriverProfileSetup] profile-photo 빈/JSON 바디', blob.size, ct);
              }
              if (profilePhotoBlobRef.current) {
                URL.revokeObjectURL(profilePhotoBlobRef.current);
                profilePhotoBlobRef.current = null;
              }
              setProfilePhoto(null);
              return;
            }

            if (profilePhotoBlobRef.current) {
              URL.revokeObjectURL(profilePhotoBlobRef.current);
            }
            const objectUrl = URL.createObjectURL(blob);
            profilePhotoBlobRef.current = objectUrl;
            setProfilePhoto(objectUrl);
          } catch (e) {
            if (import.meta.env.DEV) console.warn('[DriverProfileSetup] profile-photo 예외:', e);
            if (!cancelled && profilePhotoBlobRef.current) {
              URL.revokeObjectURL(profilePhotoBlobRef.current);
              profilePhotoBlobRef.current = null;
            }
            if (!cancelled) setProfilePhoto(null);
          }
        };

        if (!data.exists) {
          setProfileExistsOnServer(false);
          setLicenseFieldsLocked(false);
          setQualFieldsLocked(false);
          qualCertBaselineRef.current = '';
          setResidentNoDisplay(data.residentNoDisplay || '');
          await applyProfilePhotoBlob(profileFidResolved);
          return;
        }
        setProfileExistsOnServer(true);
        setQualCertVerifyStatus(data.qualCertVerifyStatus || 'UNVERIFIED');
        setLicenseFieldsLocked(true);
        setQualFieldsLocked(true);
        qualCertBaselineRef.current = normQualCertBaseline(
          data.qualCertNo != null ? data.qualCertNo : ''
        );
        setFormData((prev) => ({
          ...prev,
          FEE_POLICY: feePolicyLoaded,
          name: data.userNm || data.userName || prev.name,
          phoneNo: (data.hpNo || data.phoneNo || prev.phoneNo || '').replace(/\D/g, '').slice(0, 11),
          addrType: data.addrType || prev.addrType,
          addrOtherLabel: data.addrName || '',
          zipcode: data.zipcode ?? prev.zipcode,
          streetAddress: data.address ?? prev.streetAddress,
          detailAddress: data.detailAddress ?? prev.detailAddress,
          licenseType: data.licenseType || prev.licenseType,
          licenseNo: data.licenseNo ?? '',
          licenseSerialNo: data.licenseSerialNo ?? '',
          licenseIssueDt: data.licenseIssueDt || prev.licenseIssueDt,
          licenseExpiryDt: data.licenseExpiryDt || prev.licenseExpiryDt,
          qualCertNo: data.qualCertNo ?? '',
          bioText: data.bioText ?? prev.bioText,
        }));

        setResidentNoDisplay(data.residentNoDisplay || '');

        await applyProfilePhotoBlob(profileFidResolved);
      } catch (e) {
        console.error('기사 프로필 조회 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
      if (profilePhotoBlobRef.current) {
        URL.revokeObjectURL(profilePhotoBlobRef.current);
        profilePhotoBlobRef.current = null;
      }
    };
  }, [currentUser?.custId]);

  /** 등록된 자격증 이미지(JPEG/PNG/…)일 때 업로드 영역에 썸네일 표시 */
  useEffect(() => {
    let cancelled = false;

    const prevThumb = qualCertThumbBlobRef.current;
    if (prevThumb) {
      URL.revokeObjectURL(prevThumb);
      qualCertThumbBlobRef.current = null;
    }
    setQualCertServerThumbUrl(null);

    const custId = currentUser?.custId != null ? String(currentUser.custId).trim() : '';
    const fid = qualCertFileId;

    if (!custId || !fid || qualCert) {
      return () => {};
    }

    const extHint = String(qualCertServerExt || '')
      .replace(/^\./, '')
      .trim()
      .toLowerCase();
    const likelyPdf = extHint === 'pdf';

    const run = async () => {
      if (likelyPdf) return;
      try {
        const r = await fetch(
          `${API_BASE}/api/driver/qual-cert/file?custId=${encodeURIComponent(custId)}&fileId=${encodeURIComponent(fid)}`
        );
        const rawCt = r.headers.get('content-type') || '';
        const ct = rawCt.split(';')[0].trim().toLowerCase();
        if (cancelled || !r.ok) return;
        if (!ct.startsWith('image/')) return;
        const blob = await r.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        qualCertThumbBlobRef.current = url;
        setQualCertServerThumbUrl(url);
      } catch (_) {
        /* ignore */
      }
    };
    run();

    return () => {
      cancelled = true;
      if (qualCertThumbBlobRef.current) {
        URL.revokeObjectURL(qualCertThumbBlobRef.current);
        qualCertThumbBlobRef.current = null;
      }
    };
  }, [currentUser?.custId, qualCertFileId, qualCert, qualCertServerExt]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const refs = [null, section1Ref, section2Ref, section3Ref];
      const scrollTop = container.scrollTop;
      let next = 1;
      for (let s = 1; s <= 3; s++) {
        const el = refs[s]?.current;
        if (!el) continue;
        if (el.offsetTop <= scrollTop + 32) next = s;
      }
      setActiveStep((prev) => (prev === next ? prev : next));
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'addrType') {
      const vt = String(value).toUpperCase();
      setFormData((prev) => ({
        ...prev,
        addrType: vt,
        addrOtherLabel: vt === 'OTHER' ? prev.addrOtherLabel : ''
      }));
      return;
    }
    if (name === 'addrOtherLabel') {
      const clipped = [...String(value)].slice(0, 10).join('');
      setFormData((prev) => ({ ...prev, addrOtherLabel: clipped }));
      return;
    }
    if (name === 'detailAddress') {
      const clipped = [...String(value)].slice(0, 100).join('');
      setFormData((prev) => ({ ...prev, detailAddress: clipped }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDaumPostcode = () => {
    loadDaumPostcode(() => {
      try {
        // eslint-disable-next-line no-new
        new window.daum.Postcode({
          oncomplete: (data) => {
            const road =
              data.roadAddress ||
              data.autoRoadAddress ||
              data.jibunAddress ||
              data.address ||
              '';
            setFormData((prev) => ({
              ...prev,
              zipcode: String(data.zonecode || '').trim(),
              streetAddress: road.trim(),
            }));
          },
        }).open();
      } catch (err) {
        console.error(err);
        alert('주소 검색 창을 열 수 없습니다. 네트워크·팝업 차단을 확인해 주세요.');
      }
    });
  };

  const handleFileChangeCert = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다.\n허용 형식: JPG, PNG, WEBP, GIF 이미지 또는 PDF');
      e.target.value = '';
      return;
    }

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`파일 크기가 너무 큽니다. ${MAX_MB}MB 이하 파일을 선택해 주세요.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setQualCert(reader.result);
      setQualCertPickLabel(file.name || '선택된 파일');
    };
    reader.readAsDataURL(file);
  };

  /**
   * @param {{ successMessage?: string }} [opts]
   * @returns {Promise<boolean>} 저장·검증 성공 시 true
   */
  const handleSubmit = async (opts = {}) => {
    if (isSubmitting) return false;
    const loginId = (currentUser?.userId != null && String(currentUser.userId).trim()) || '';
    if (!loginId) {
      alert('로그인 ID가 없습니다. 다시 로그인해 주세요.');
      return false;
    }
    const nameTrim = (formData.name || '').trim();
    if (!nameTrim) {
      alert('성명을 입력해 주세요. 자격 진위 연동 시에도 성명이 필요합니다.');
      return false;
    }
    if (!['HOME', 'OFFICE', 'OTHER'].includes(formData.addrType || '')) {
      alert('주소 구분을 선택해 주세요.');
      return false;
    }
    if (formData.addrType === 'OTHER' && !String(formData.addrOtherLabel || '').trim()) {
      alert('주소 구분이 OTHER일 때 주소구분명칭을 입력해 주세요(최대 10자).');
      return false;
    }
    const addrLine = String(formData.streetAddress || '').trim();
    const zip = String(formData.zipcode || '').trim();
    if (!zip || !addrLine) {
      alert('우편번호와 기본 주소는 주소 검색으로 입력해 주세요.');
      return false;
    }
    const feePol = String(formData.FEE_POLICY || '').trim();
    if (!feePol) {
      alert('회원등급을 선택해 주세요.');
      return false;
    }
    setIsSubmitting(true);
    const wasExistingProfile = profileExistsOnServer;

    try {
      const payload = {
        userId: loginId,
        driverName: nameTrim,
        licenseType: formData.licenseType,
        licenseNo: formData.licenseNo,
        licenseSerialNo: formData.licenseSerialNo || undefined,
        licenseIssueDt: formData.licenseIssueDt,
        licenseExpiryDt: formData.licenseExpiryDt,
        qualCertNo: String(formData.qualCertNo ?? '').trim(),
        bioText: formData.bioText,
        addrType: formData.addrType,
        addrName:
          formData.addrType === 'OTHER' ? String(formData.addrOtherLabel || '').trim() : undefined,
        zipcode: zip,
        address: addrLine,
        detailAddress: formData.detailAddress || '',
        feePolicy: feePol,
        qualCertBase64:
          qualCert && String(qualCert).startsWith('data:') ? qualCert : undefined,
        qualCertFileName:
          qualCert && String(qualCert).startsWith('data:')
            ? String(qualCertPickLabel || '').trim() || undefined
            : undefined,
      };

      const res = await fetch(`${API_BASE}/api/driver/profile-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '프로필 저장 실패');

      qualCertBaselineRef.current = normQualCertBaseline(formData.qualCertNo);

      if (!wasExistingProfile) {
        setProfileExistsOnServer(true);
        setLicenseFieldsLocked(true);
        setQualFieldsLocked(true);
      }
      // POST 응답의 최신 검증 상태로 갱신
      if (data.qualCertVerifyStatus) {
        setQualCertVerifyStatus(data.qualCertVerifyStatus);
      }
      // POST 후 새로 저장된 자격증 파일 UUID 갱신
      const newQualFid = data.qualCertFileId;
      if (newQualFid) {
        setQualCertFileId(newQualFid);
        setHasQualCertFileOnServer(true);
      }
      if (typeof data.hasQualCertFile === 'boolean' && data.hasQualCertFile) {
        setHasQualCertFileOnServer(true);
      }
      if (data.qualCertOrgFileNm != null || data.qualCertFileExt != null) {
        if (data.qualCertOrgFileNm != null) {
          setQualCertServerOrgNm(String(data.qualCertOrgFileNm));
        }
        if (data.qualCertFileExt != null) {
          setQualCertServerExt(String(data.qualCertFileExt).toLowerCase());
        }
        setQualCertServerSize((prevSz) =>
          typeof data.qualCertFileSize === 'number' ? data.qualCertFileSize : prevSz
        );
      }
      setQualCert(null);
      setQualCertPickLabel('');
      setSuccessModal({
        open: true,
        message:
          opts.successMessage != null && String(opts.successMessage).trim() !== ''
            ? opts.successMessage
            : wasExistingProfile
              ? '버스 기사 기본 정보가 수정 되었습니다.'
              : '버스 기사 기본 정보가 등록되었습니다.',
      });
      return true;
    } catch (error) {
      console.error('Submit error:', error);
      alert(`오류: ${error.message}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPrimaryLabel = profileExistsOnServer ? '수정' : '등록';

  const commonViewCustId =
    currentUser?.custId != null ? String(currentUser.custId).trim() : '';

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex min-h-0 items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        style={{ fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="absolute inset-0" aria-hidden />
        <div className="relative my-auto flex min-h-0 w-full max-w-6xl max-h-[95vh] flex-col overflow-hidden rounded-3xl bg-surface-lowest bg-background shadow-ambient animate-in zoom-in-95 duration-200 text-on-background">
        <div className="bg-background font-body text-on-surface flex w-full flex-1 min-h-0 flex-col overflow-hidden">
      {showQualCertViewer && qualCertFileId && commonViewCustId && (
        <CommonView
          close={() => setShowQualCertViewer(false)}
          fileId={qualCertFileId}
          custId={commonViewCustId}
          docTitle="버스운전 자격증 사본"
          metaPath="/api/driver/qual-cert/meta"
          streamPath="/api/driver/qual-cert/file"
          downloadPath="/api/driver/qual-cert/download"
        />
      )}
      {successModal.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setSuccessModal({ open: false, message: '' })}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-profile-success-title"
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="driver-profile-success-title"
              className="text-center text-base font-bold text-on-surface leading-relaxed"
            >
              {successModal.message}
            </p>
            <button
              type="button"
              className="mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95"
              onClick={() => setSuccessModal({ open: false, message: '' })}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        {/* Main */}
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-start justify-between border-b border-outline-variant/10 bg-background px-4 md:px-8 lg:px-10 pt-4 pb-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">
                운전 기사 기본 정보
              </h2>
              <p className="text-on-surface-variant font-medium">
                busTaams의 프리미엄 캡틴이 되기 위한 필수 정보를 입력해주세요.
              </p>
              {profileExistsOnServer && (
                <p className="mt-2 text-sm font-medium text-primary">
                  저장된 기사 정보를 불러왔습니다. 운전면허·운송종사자 자격은 「수정」을 눌러 변경할 수 있습니다.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={close || onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 text-gray-500 shrink-0 ml-4"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col items-stretch gap-6 overflow-hidden px-4 pb-4 pt-4 md:px-8 lg:flex-row lg:gap-8 lg:px-10">
            {/* 단계 버튼: 우측 scrollRef와 형제 — 뷰포트 고정 시 여기만 고정, 폼만 스크롤 */}
            <div className="hidden min-h-0 shrink-0 flex-col gap-8 self-stretch overflow-hidden border-r border-outline-variant/10 pr-6 lg:flex lg:w-72">
              <nav className="space-y-4" aria-label="등록 단계">
                {STEPS.map((step) => {
                  const active = activeStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-current={active ? 'step' : undefined}
                      onClick={() => scrollToSection(step.id)}
                      className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        active
                          ? 'bg-white text-primary shadow-md ring-1 ring-primary/10'
                          : 'bg-transparent text-slate-500 hover:bg-slate-100/70'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          active
                            ? 'bg-primary text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {step.id}
                      </div>
                      <span
                        className={`font-bold ${
                          active ? 'text-primary' : 'font-semibold text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-auto pt-6 border-t border-outline-variant/20">
                <div className="p-6 bg-secondary-container/10 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                  <h4 className="font-headline font-bold text-secondary mb-2">주의사항</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    등록하신 정보는 관리자 승인 후 활성화됩니다. 허위 사실 기재 시 서비스 이용이 제한될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 lg:hidden">
              {STEPS.map((step) => {
                const active = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => scrollToSection(step.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-transparent bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.id}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              ref={scrollRef}
              className="relative mx-auto w-full max-w-3xl min-h-0 min-w-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable] lg:pr-2"
            >
              <div ref={section1Ref} className="space-y-12">
              {/* Photo Upload */}
              <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] relative">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary/10">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="프로필 미리보기" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-outline">account_circle</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-headline font-bold text-primary mb-2">
                      {profileModalTitle ||
                        (formData.name ? `${formData.name.trim()} 기사님` : '기사님')}
                    </h3>
                    {hasProfilePhotoOnServer && !profilePhoto && (
                      <p className="text-xs text-amber-700 font-semibold mt-2">
                        서버에 등록된 사진이 있으나 미리보기를 불러오지 못했습니다. 네트워크를 확인해 주세요.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Personal Info */}
              <section className="space-y-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h2
                    ref={title1Ref}
                    id="driver-step-title-1"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    기본 인적사항
                  </h2>
                  <span className="text-xs text-secondary font-bold">* 필수 입력</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">성명</label>
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                      placeholder="홍길동" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">주민등록번호</label>
                    <input
                      readOnly
                      name="residentNoDisplay"
                      value={residentNoDisplay || ''}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-outline-variant/20 font-bold cursor-not-allowed opacity-95 tracking-wide"
                      placeholder="등록된 주민번호가 없습니다. 회원가입·본인인증 등에서 등록해 주세요."
                      type="text"
                      aria-readonly="true"
                    />
                  </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="driver-fee-policy" className="text-sm font-bold text-on-surface-variant px-1">
                      회원등급
                    </label>
                    <select
                      id="driver-fee-policy"
                      name="FEE_POLICY"
                      value={formData.FEE_POLICY}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold"
                    >
                      <option value="">등급 선택</option>
                      {feePolicyOptions.map((opt) => (
                        <option key={opt.dtlCd} value={opt.dtlCd}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">휴대전화 번호</label>
                    <input 
                      readOnly
                      name="phoneNoDisplay"
                      value={formatHpKrDigits(formData.phoneNo)}
                      className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-outline-variant/20 font-bold cursor-not-allowed opacity-95" 
                      placeholder="000-0000-0000"
                      type="text" 
                      aria-readonly="true"
                    />
                  </div>
                </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-2 md:col-span-2 flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[220px] space-y-2">
                        <label className="text-sm font-bold text-on-surface-variant px-1">주소 구분</label>
                        <select 
                          name="addrType"
                          value={formData.addrType}
                          onChange={handleChange}
                          className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold"
                        >
                          <option value="HOME">자택 · HOME</option>
                          <option value="OFFICE">회사 · OFFICE</option>
                          <option value="OTHER">이외 · OTHER</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-2 md:flex-initial md:w-72">
                        <label className="text-sm font-bold text-on-surface-variant px-1 flex justify-between gap-2">
                          <span>주소구분명칭</span>
                          {formData.addrType === 'OTHER' && (
                            <span className="text-secondary text-xs font-black">OTHER 시 필수·최대 10자</span>
                          )}
                        </label>
                        <input
                          name="addrOtherLabel"
                          value={formData.addrOtherLabel}
                          onChange={handleChange}
                          disabled={formData.addrType !== 'OTHER'}
                          maxLength={10}
                          className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold disabled:opacity-45 disabled:cursor-not-allowed"
                          placeholder={formData.addrType === 'OTHER' ? '명칭 입력' : 'OTHER 선택 시 입력'}
                          type="text"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleOpenDaumPostcode}
                        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
                      >
                        주소 검색
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">우편번호</label>
                      <input
                        readOnly
                        value={formData.zipcode}
                        className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-outline-variant/15 font-bold"
                        placeholder="주소 검색 시 입력"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">기본 주소(도로명/지번)</label>
                      <input
                        readOnly
                        value={formData.streetAddress}
                        className="w-full h-14 px-5 rounded-xl bg-slate-50 border border-outline-variant/15 font-bold"
                        placeholder="주소 검색 시 입력"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">상세 주소(동·호수 등)</label>
                      <input
                        name="detailAddress"
                        value={formData.detailAddress}
                        onChange={handleChange}
                        maxLength={100}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold"
                        placeholder="최대 100자까지 입력 가능"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
              </section>
              </div>

              <div ref={section2Ref} className="pt-8">
              {/* License Info */}
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    ref={title2Ref}
                    id="driver-step-title-2"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    운전면허 정보
                  </h2>
                  {profileExistsOnServer && (
                    <button
                      type="button"
                      onClick={() => setLicenseFieldsLocked((v) => !v)}
                      className="shrink-0 rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      {licenseFieldsLocked ? '수정' : '수정 완료'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 종류</label>
                    <select 
                      name="licenseType"
                      value={formData.licenseType}
                      onChange={handleChange}
                      disabled={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option>1종 대형</option>
                      <option>1종 보통</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 번호</label>
                    <input 
                      name="licenseNo"
                      value={formData.licenseNo}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      placeholder="00-00-000000-00" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">발급 일자</label>
                    <input 
                      name="licenseIssueDt"
                      value={formData.licenseIssueDt}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      type="date" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">유효 기간</label>
                    <input 
                      name="licenseExpiryDt"
                      value={formData.licenseExpiryDt}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      type="date" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">암호일련번호 (면허증 우측 소형 사진 아래 영문·숫자)</label>
                    <input 
                      name="licenseSerialNo"
                      value={formData.licenseSerialNo}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      placeholder="진위 확인(도로교통공단·경찰청 연계 API) 시 사용" 
                      type="text" 
                      autoComplete="off"
                    />
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      운전면허 진위 확인에는 면허번호·성명·생년월일·암호일련번호 대조가 필요합니다. 공공데이터포털 「운전면허정보 자동검증시스템」 또는 민간 연동(CODEF 등) API 도입 시 서버에서 호출합니다.
                    </p>
                  </div>
                </div>
              </section>
              </div>

              <div ref={section3Ref} className="pt-8">
              {/* Qualification */}
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    ref={title3Ref}
                    id="driver-step-title-3"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    운송종사자 자격 정보
                  </h2>
                  {profileExistsOnServer && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (qualFieldsLocked) {
                          setQualFieldsLocked(false);
                          return;
                        }
                        const qualChanged =
                          normQualCertBaseline(formData.qualCertNo) !==
                          normQualCertBaseline(qualCertBaselineRef.current);
                        if (qualChanged) {
                          const ok = await handleSubmit({
                            successMessage:
                              '운송종사자 자격번호가 저장되었습니다. 변경된 경우 자격 진위 검증이 서버에서 수행됩니다.',
                          });
                          if (ok) setQualFieldsLocked(true);
                        } else {
                          setQualFieldsLocked(true);
                        }
                      }}
                      className="shrink-0 rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      {qualFieldsLocked ? '수정' : '수정 완료'}
                    </button>
                  )}
                </div>
                <div className="p-8 bg-surface-container-lowest rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">버스운전 자격번호</label>
                      <input 
                        name="qualCertNo"
                        value={formData.qualCertNo}
                        onChange={handleChange}
                        readOnly={profileExistsOnServer && qualFieldsLocked}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                        placeholder="자격번호를 입력하세요" 
                        type="text" 
                      />
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        진위 확인은 한국교통안전공단(TS) 데이터를 활용합니다. 공공데이터포털 「한국교통안전공단_운수종사자 자격증 진위여부 확인 API」로 성명·생년월일·자격증 번호를 조회할 수 있습니다(버스·택시·화물 등 운수종사 자격 공통).
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-bold text-on-surface-variant">자격증 사본 업로드</p>

                      {/* 자격번호 검증 상태 — 정보성 배지 (업로드 차단 목적이 아님) */}
                      {profileExistsOnServer && (
                        qualCertVerifyStatus === 'VERIFIED'
                          ? (
                            <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              자격번호 검증 완료
                            </p>
                          ) : qualCertVerifyStatus === 'SKIPPED'
                          ? (
                            <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              자격 API 비활성(개발 환경)
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">info</span>
                              자격번호 검증 전입니다. 정보 저장 시 검증이 진행됩니다.
                            </p>
                          )
                      )}

                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        서버에 자격증 사본이 있어도 아래 영역을 클릭하면 언제든지 다른 파일을 선택할 수 있습니다. 하단
                        「{submitPrimaryLabel}」제출 시 새 파일로 반영됩니다. (자격번호 입력란만 「수정」으로 잠금 해제 후
                        편집할 수 있습니다.)
                      </p>
                      <input 
                        type="file" 
                        ref={certInputRef} 
                        className="hidden" 
                        accept={ACCEPT_DOC} 
                        onChange={handleFileChangeCert} 
                        disabled={isSubmitting}
                      />
                      {/* 자격증 파일: 자격번호 필드 잠금(qualFieldsLocked)과 무관하게 항상 교체 선택 가능 */}
                      {(() => {
                        const disabled = isSubmitting;
                        const serverRegistered = hasQualCertFileOnServer && !qualCert;
                        const serverFullName = qualServerDisplayFilename(
                          qualCertServerOrgNm,
                          qualCertServerExt
                        );
                        const localPdf =
                          !!(qualCert && String(qualCert).includes('application/pdf'));
                        return (
                          <div 
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            onKeyDown={(ev) => {
                              if (disabled) return;
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                certInputRef.current?.click();
                              }
                            }}
                            onClick={() => {
                              if (disabled) return;
                              certInputRef.current?.click();
                            }}
                            className={`w-full min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col items-stretch justify-center gap-3 transition-colors group px-2 py-4 ${
                              disabled
                                ? 'cursor-not-allowed bg-slate-50/80 opacity-60 border-outline-variant'
                                : 'cursor-pointer hover:bg-slate-50 hover:border-primary/30 border-outline-variant'
                            }`}
                          >
                            {qualCert ? (
                              <div className="flex w-full max-w-xl mx-auto gap-4 items-center">
                                {!localPdf ? (
                                  <div className="h-36 w-28 shrink-0 overflow-hidden rounded-xl border border-primary/15 bg-black/5 flex items-center justify-center">
                                    <img
                                      src={qualCert}
                                      alt=""
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-36 w-28 shrink-0 rounded-xl border border-outline-variant bg-surface-container-high flex flex-col items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-5xl text-rose-700">
                                      picture_as_pdf
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                                      PDF
                                    </span>
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-xs font-bold text-primary mb-1">새로 선택한 파일</p>
                                  <p className="text-sm font-extrabold text-on-surface truncate" title={qualCertPickLabel}>
                                    {qualCertPickLabel || '파일이 선택되었습니다'}
                                  </p>
                                  <p className="text-[11px] text-on-surface-variant mt-1">
                                    「등록」또는「수정」제출 후 서버에 반영됩니다.
                                  </p>
                                </div>
                              </div>
                            ) : serverRegistered ? (
                              <div className="flex w-full max-w-xl mx-auto gap-4 items-center">
                                <div className="h-40 w-[7.25rem] shrink-0 overflow-hidden rounded-xl border-2 border-primary/10 bg-surface-container-low flex items-center justify-center">
                                  {qualCertServerThumbUrl ? (
                                    <img
                                      src={qualCertServerThumbUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-1 px-2 text-center">
                                      <span className={`material-symbols-outlined ${String(qualCertServerExt || '').toLowerCase() === 'pdf' ? 'text-5xl text-rose-700' : 'text-5xl text-slate-500'}`}>
                                        {String(qualCertServerExt || '').toLowerCase() === 'pdf'
                                          ? 'picture_as_pdf'
                                          : 'description'}
                                      </span>
                                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                                        {qualCertServerExt || '파일'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 text-left space-y-1">
                                  <p className="text-xs font-black text-teal-800 tracking-tight flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                                    서버에 등록된 자격증 사본
                                  </p>
                                  <p
                                    className="text-sm md:text-base font-extrabold text-on-surface break-all"
                                    title={serverFullName}
                                  >
                                    {serverFullName}
                                  </p>
                                  {(qualCertServerExt || '').length > 0 && (
                                    <p className="text-[11px] font-bold uppercase text-secondary">
                                      형식 · {qualCertServerExt}
                                    </p>
                                  )}
                                  {formatFileSizeBytes(qualCertServerSize) && (
                                    <p className="text-[11px] text-on-surface-variant">
                                      용량 {formatFileSizeBytes(qualCertServerSize)}
                                    </p>
                                  )}
                                  {!disabled && (
                                    <p className="text-[11px] font-semibold text-primary pt-1">
                                      클릭하여 다른 파일로 교체
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className={`material-symbols-outlined text-3xl mx-auto transition-colors ${disabled ? 'text-outline/40' : 'text-outline group-hover:text-primary'}`}>cloud_upload</span>
                                <span className="text-sm text-outline-variant font-medium text-center px-4">
                                  JPG, PNG, WEBP, GIF, PDF (최대 10MB)
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* 문서 보기 버튼 — 서버에 등록된 파일이 있을 때만 활성화 */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!hasQualCertFileOnServer}
                          title={hasQualCertFileOnServer ? '자격증 사본 문서 보기' : '서버에 등록된 파일이 없습니다'}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                            hasQualCertFileOnServer
                              ? 'bg-secondary text-white hover:bg-secondary/90 active:scale-95 shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => setShowQualCertViewer(true)}
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                          문서 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bio / Strengths */}
              <section className="space-y-6 pt-8 mt-2">
                <h2 className="text-2xl font-headline font-bold text-primary">자기소개 및 강점</h2>
                <textarea 
                  name="bioText"
                  value={formData.bioText}
                  onChange={handleChange}
                  className="w-full h-40 px-5 py-4 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none" 
                  placeholder="당신의 15년 이상의 경력과 안전 노하우를 기재해주세요. 예: '15년 경력의 베테랑 기사로서 고객의 안전을 최우선으로 생각합니다...'" 
                />
              </section>

              {/* Action Buttons */}
              <footer className="flex items-center justify-end gap-4 pt-12">
                <button 
                  onClick={onBack}
                  className="px-10 py-4 font-bold text-primary hover:bg-surface-container-high rounded-full transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-12 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? '처리 중...' : submitPrimaryLabel}
                </button>
              </footer>
            </div>
            </div>
          </div>
        </main>
      </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default DriverProfileSetup;
