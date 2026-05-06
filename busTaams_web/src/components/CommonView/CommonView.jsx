import React, { useEffect, useState, useCallback } from 'react';

/** Same-origin `/api` + Vite proxy; trim trailing slash from env */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const COMMON_VIEW_ROOT_ID = 'common-view-root';
const COMMON_VIEW_MODAL_ID = 'common-view-modal';

/** 문서 카테고리 코드 → 한국어 표시 */
const COMMON_VIEW_CATEGORY_LABEL = {
    Business_License: '사업자 등록증',
    Transportation_Business_License: '운송사업 허가증',
    Insurance_Policy: '보험증권',
    BUS_PHOTO: '차량 사진',
    BUS_QUAL_CERT: '버스운전 자격증 사본',
};

const defaultCommonViewDocument = {
    commonViewDocumentId: 'cv-doc-2024-contract-09',
    fileName: '2024_운행_계약서.pdf',
    fileType: 'PDF',
    fileSizeBytes: 1258291,
    fileSizeLabel: '1.2MB',
    authorName: '운영지원팀 김태영',
    createdAtLabel: '2024년 05월 12일',
    securityLevel: '대외비 (Internal Use)',
    reportNo: '2024-CONTRACT-09',
    totalPages: 12,
};

async function fetchCommonViewDocument() {
    const path = '/api/common-view/document';
    const url = API_BASE ? `${API_BASE}${path}` : path;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('CommonView document fetch failed');
    return res.json();
}

/** 기사 서류 메타 조회 — doc mode (`userId` = TB_USER; `fileId` = TB_FILE_MASTER.FILE_ID) */
async function fetchCommonViewBusDocMeta(ownerId, fileId, metaPath) {
    const base = (metaPath || '/api/common-view/bus-document/meta');
    const path = `${base}?userId=${encodeURIComponent(ownerId)}&fileId=${encodeURIComponent(fileId)}`;
    const url = API_BASE ? `${API_BASE}${path}` : path;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '파일 메타 조회 실패');
    }
    return res.json();
}

/**
 * 문서 뷰어 모달 (CommonView).
 *
 * — 일반 모드 (props: `close`): 샘플 계약서 문서를 표시합니다.
 * — 문서 모드 (props: `close` + `fileId` = TB_FILE_MASTER.FILE_ID + `userId` 권장 또는 `userUuid` 레거시 + `docTitle?`):
 *     기사 본인 서류 파일의 실제 내용을 뷰어에 표시하고,
 *     출력·다운로드 기능을 제공합니다.
 *
 * 선택 props (doc mode 시 API 경로 오버라이드):
 *   metaPath     — 메타 조회 API 경로 (기본: /api/common-view/bus-document/meta)
 *   streamPath   — 파일 스트리밍 경로  (기본: /api/driver/bus-documents/file)
 *   downloadPath — 다운로드 경로       (기본: /api/common-view/bus-document/download)
 *
 * @param {{ close: () => void, fileId?: string, userId?: string, docTitle?: string, metaPath?: string, streamPath?: string, downloadPath?: string }} props
 */
function CommonView({ close, fileId, userId, docTitle, metaPath, streamPath, downloadPath }) {
    const docFileId = (fileId && String(fileId).trim()) || '';
    const ownerId = (userId && String(userId).trim()) || '';
    const isDocMode = !!(docFileId && ownerId);

    const META_PATH   = metaPath   || '/api/common-view/bus-document/meta';
    const STREAM_PATH = streamPath || '/api/driver/bus-documents/file';
    const DL_PATH     = downloadPath || '/api/common-view/bus-document/download';

    /* ── doc mode 상태 ── */
    const [docMeta, setDocMeta] = useState(null);
    const [metaLoading, setMetaLoading] = useState(false);
    const [metaError, setMetaError] = useState(null);

    /* ── general mode 상태 ── */
    const [doc, setDoc] = useState(defaultCommonViewDocument);
    const [loadError, setLoadError] = useState(null);
    const [page, setPage] = useState(1);

    /* body 스크롤 잠금 */
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    /* doc mode: 메타 조회 */
    useEffect(() => {
        if (!isDocMode) return;
        let cancelled = false;
        setMetaLoading(true);
        (async () => {
            try {
                const data = await fetchCommonViewBusDocMeta(ownerId, docFileId, META_PATH);
                if (!cancelled) setDocMeta(data);
            } catch (e) {
                if (!cancelled) setMetaError(e.message);
            } finally {
                if (!cancelled) setMetaLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isDocMode, ownerId, docFileId, META_PATH]);

    /* general mode: 샘플 문서 메타 조회 */
    useEffect(() => {
        if (isDocMode) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await fetchCommonViewDocument();
                if (!cancelled) setDoc((prev) => ({ ...prev, ...data }));
            } catch (e) {
                if (!cancelled) setLoadError(e.message);
            }
        })();
        return () => { cancelled = true; };
    }, [isDocMode]);

    /* ── URL 헬퍼 ── */
    const streamUrl = isDocMode
        ? `${API_BASE || ''}${STREAM_PATH}?userId=${encodeURIComponent(ownerId)}&fileId=${encodeURIComponent(docFileId)}`
        : null;
    const downloadUrl = isDocMode
        ? `${API_BASE || ''}${DL_PATH}?userId=${encodeURIComponent(ownerId)}&fileId=${encodeURIComponent(docFileId)}`
        : null;

    const ext = (docMeta?.fileExt || '').toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isPdf = ext === 'pdf';

    /* 출력: doc mode → 새 탭에서 브라우저 인쇄, general mode → window.print() */
    const handlePrint = useCallback(() => {
        if (isDocMode && streamUrl) {
            window.open(streamUrl, '_blank');
        } else {
            window.print();
        }
    }, [isDocMode, streamUrl]);

    /* 다운로드: ORG_FILE_NM.FILE_EXT */
    const handleDownload = useCallback(() => {
        if (!isDocMode || !downloadUrl) {
            alert('CommonView: 다운로드 (연동 예정)');
            return;
        }
        const a = document.createElement('a');
        a.href = downloadUrl;
        if (docMeta) a.download = `${docMeta.orgFileNm}.${docMeta.fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [isDocMode, downloadUrl, docMeta]);

    /* general mode 페이지네이션 */
    const totalPages = doc.totalPages || 12;
    const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
    const goNext = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

    const categoryLabel = docMeta
        ? (COMMON_VIEW_CATEGORY_LABEL[docMeta.fileCategory] || docMeta.fileCategory || '문서')
        : '';
    const displayTitle = docTitle || categoryLabel || '문서 뷰어';

    return (
        <div
            id={COMMON_VIEW_ROOT_ID}
            data-common-view-id="commonViewDocumentViewer"
            className="fixed inset-0 z-[200] flex min-h-0 items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="common-view-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close overlay" onClick={close} />
            <div
                id={COMMON_VIEW_MODAL_ID}
                className="relative my-auto flex min-h-0 w-full max-w-[min(1400px,100vw)] max-h-[95vh] flex-col overflow-hidden rounded-3xl bg-surface shadow-ambient animate-in zoom-in-95 duration-200 text-on-surface"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── TopNavBar ── */}
                <nav className="shrink-0 border-b border-surface-container-low bg-slate-50/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,104,95,0.06)]">
                    <div className="flex justify-between items-center px-4 sm:px-8 py-4 w-full max-w-screen-2xl mx-auto">
                        <span className="text-xl font-extrabold text-teal-900 font-headline tracking-tight">busTaams</span>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
                                <span className="hover:text-teal-700 transition-colors cursor-default">Dashboard</span>
                                <span className="text-teal-700 font-bold border-b-2 border-teal-700 pb-1">
                                    {isDocMode ? displayTitle : '문서 뷰어'}
                                </span>
                                <span className="hover:text-teal-700 transition-colors cursor-default">Library</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    id="common-view-action-print-top"
                                    className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-600"
                                    title="출력"
                                    onClick={handlePrint}
                                >
                                    <span className="material-symbols-outlined">print</span>
                                </button>
                                {isDocMode && (
                                    <button
                                        type="button"
                                        id="common-view-action-download-top"
                                        className="p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-600"
                                        title="파일 다운로드"
                                        onClick={handleDownload}
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                    </button>
                                )}
                                {/* ── 상단 우측 X 닫기 버튼 ── */}
                                <button
                                    type="button"
                                    id="common-view-close-top"
                                    aria-label="모달 닫기"
                                    title="닫기"
                                    className="ml-2 p-2 rounded-full hover:bg-red-100/70 transition-colors text-slate-500 hover:text-red-600"
                                    onClick={close}
                                >
                                    <span className="material-symbols-outlined text-[22px]">close</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* ── SideBar ── */}
                    <aside
                        id="common-view-sidebar"
                        className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-50 py-8 px-6 border-r border-surface-container-low overflow-y-auto"
                    >
                        <div className="mb-8">
                            <h1 className="text-lg font-black text-teal-800 font-headline uppercase tracking-widest">busTaams</h1>
                            <p className="text-[10px] tracking-wide uppercase text-slate-400 mt-1">
                                {isDocMode ? 'Document Viewer' : 'Editorial Velocity'}
                            </p>
                        </div>

                        {isDocMode ? (
                            /* ── doc mode 좌측: 문서 세부 정보 ── */
                            <section id="common-view-meta-panel" className="flex-1">
                                <h3 className="font-headline font-bold text-base mb-6 text-primary">문서 정보</h3>
                                {metaLoading && (
                                    <div className="flex items-center gap-2 text-outline text-sm">
                                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                        불러오는 중…
                                    </div>
                                )}
                                {metaError && (
                                    <p className="text-sm text-error" id="common-view-load-error">{metaError}</p>
                                )}
                                {!metaLoading && !metaError && docMeta && (
                                    <ul className="space-y-5">
                                        <li className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">문서 종류</span>
                                            <span className="text-sm font-semibold text-on-surface">{displayTitle}</span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">파일명</span>
                                            <span className="text-sm font-semibold text-on-surface break-all">
                                                {docMeta.orgFileNm}.{docMeta.fileExt}
                                            </span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">파일 형식</span>
                                            <span className="text-sm font-semibold text-on-surface">
                                                {(docMeta.fileExt || '').toUpperCase()}
                                            </span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">크기</span>
                                            <span className="text-sm font-semibold text-on-surface">{docMeta.fileSizeLabel}</span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">등록일</span>
                                            <span className="text-sm font-semibold text-on-surface">{docMeta.regDtLabel}</span>
                                        </li>
                                    </ul>
                                )}
                                {/* 출력·다운로드 버튼 (사이드 하단) */}
                                {!metaLoading && !metaError && docMeta && (
                                    <div className="mt-auto pt-10 space-y-3">
                                        <button
                                            type="button"
                                            id="common-view-action-print-side"
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-bold text-sm shadow-ambient hover:scale-[1.02] transition-transform"
                                            onClick={handlePrint}
                                        >
                                            <span className="material-symbols-outlined text-base">print</span>
                                            문서 출력
                                        </button>
                                        <button
                                            type="button"
                                            id="common-view-action-download-side"
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full font-bold text-sm shadow-ambient hover:scale-[1.02] transition-transform"
                                            onClick={handleDownload}
                                        >
                                            <span className="material-symbols-outlined text-base">download</span>
                                            파일 다운로드
                                        </button>
                                    </div>
                                )}
                            </section>
                        ) : (
                            /* ── general mode 좌측: 내비 메뉴 ── */
                            <>
                                <nav className="flex-1 space-y-2">
                                    {[
                                        ['folder_open', 'Library'],
                                        ['schedule', 'Recent'],
                                        ['group', 'Shared'],
                                        ['inventory_2', 'Archived'],
                                    ].map(([icon, label]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            id={`common-view-nav-${label.toLowerCase()}`}
                                            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-left transition-transform hover:translate-x-1 ${
                                                label === 'Library'
                                                    ? 'text-teal-900 border-r-4 border-orange-500 bg-slate-200/50 font-bold'
                                                    : 'text-slate-400 hover:text-teal-900 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                            <span className="text-[10px] tracking-wide uppercase font-label">{label}</span>
                                        </button>
                                    ))}
                                </nav>
                                <button
                                    type="button"
                                    id="common-view-new-document"
                                    className="mt-auto py-4 w-full bg-primary text-white rounded-full font-bold text-sm shadow-xl shadow-teal-900/20 hover:scale-[1.02] transition-transform"
                                >
                                    New Document
                                </button>
                            </>
                        )}
                    </aside>

                    {/* ── Main scroll ── */}
                    <div
                        id="common-view-main-scroll"
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-4 pb-8 px-4 md:px-12 max-w-7xl mx-auto w-full"
                    >
                        {/* ─────────── doc mode 메인 ─────────── */}
                        {isDocMode ? (
                            <>
                                {/* 헤더 */}
                                <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                                    <div>
                                        <span className="text-orange-600 font-label text-xs tracking-[0.2em] uppercase mb-3 block">
                                            Documents Explorer
                                        </span>
                                        <h2 id="common-view-title" className="text-3xl sm:text-4xl font-headline font-extrabold text-primary leading-tight tracking-tighter">
                                            {displayTitle}
                                        </h2>
                                        {docMeta && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">
                                                    {docMeta.orgFileNm}.{docMeta.fileExt}
                                                </div>
                                                <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">
                                                    {(docMeta.fileExt || '').toUpperCase()}
                                                </div>
                                                <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">
                                                    {docMeta.fileSizeLabel}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            id="common-view-action-print-primary"
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-bold shadow-ambient hover:scale-105 transition-transform"
                                            onClick={handlePrint}
                                        >
                                            <span className="material-symbols-outlined">print</span>
                                            문서 출력
                                        </button>
                                        <button
                                            type="button"
                                            id="common-view-action-download-primary"
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full font-bold shadow-ambient hover:scale-105 transition-transform"
                                            onClick={handleDownload}
                                        >
                                            <span className="material-symbols-outlined">download</span>
                                            파일 다운로드
                                        </button>
                                    </div>
                                </header>

                                {/* 문서 뷰어 캔버스 */}
                                <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
                                    {metaLoading && (
                                        <div className="flex flex-col items-center justify-center py-32 gap-3 text-outline">
                                            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                                            <p className="font-bold">파일 정보를 불러오는 중…</p>
                                        </div>
                                    )}
                                    {metaError && (
                                        <div className="flex flex-col items-center justify-center py-32 gap-3">
                                            <span className="material-symbols-outlined text-4xl text-error">error</span>
                                            <p className="text-error font-bold">{metaError}</p>
                                        </div>
                                    )}
                                    {!metaLoading && !metaError && docMeta && streamUrl && (
                                        isPdf ? (
                                            <iframe
                                                id="common-view-doc-iframe"
                                                src={streamUrl}
                                                className="w-full border-none"
                                                style={{ minHeight: 'clamp(400px, 70vh, 900px)' }}
                                                title={displayTitle}
                                            />
                                        ) : isImage ? (
                                            <div className="flex items-center justify-center p-8 bg-surface-container-lowest">
                                                <img
                                                    id="common-view-doc-img"
                                                    src={streamUrl}
                                                    alt={displayTitle}
                                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                                    style={{ maxHeight: '75vh' }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-32 gap-3 text-outline">
                                                <span className="material-symbols-outlined text-5xl">description</span>
                                                <p className="font-bold text-sm">미리보기 불가 형식입니다.</p>
                                                <button
                                                    type="button"
                                                    onClick={handleDownload}
                                                    className="mt-2 flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full font-bold shadow-ambient hover:scale-105 transition-transform"
                                                >
                                                    <span className="material-symbols-outlined">download</span>
                                                    파일 다운로드
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            /* ─────────── general mode 메인 ─────────── */
                            <>
                                {loadError && (
                                    <p className="mb-4 text-sm text-error" id="common-view-load-error">
                                        {loadError} (기본 샘플 데이터 표시)
                                    </p>
                                )}
                                <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-6 sm:gap-8">
                                    <div className="max-w-2xl">
                                        <span className="text-orange-600 font-label text-xs tracking-[0.2em] uppercase mb-4 block">Documents Explorer</span>
                                        <h2 id="common-view-title" className="text-3xl sm:text-5xl font-headline font-extrabold text-primary leading-tight tracking-tighter">
                                            문서 뷰어
                                        </h2>
                                        <div className="mt-6 flex flex-wrap gap-3 sm:gap-4">
                                            <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">파일명: {doc.fileName}</div>
                                            <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">파일 형식: {doc.fileType}</div>
                                            <div className="bg-surface-container-high px-4 py-2 rounded-full text-sm text-on-surface-variant font-medium">용량: {doc.fileSizeLabel}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 sm:gap-4">
                                        <button
                                            type="button"
                                            id="common-view-action-print-primary"
                                            className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-bold shadow-ambient hover:scale-105 transition-transform"
                                            onClick={handlePrint}
                                        >
                                            <span className="material-symbols-outlined">print</span>
                                            <span>문서 출력</span>
                                        </button>
                                        <button
                                            type="button"
                                            id="common-view-action-download-primary"
                                            className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full font-bold shadow-ambient hover:scale-105 transition-transform"
                                            onClick={handleDownload}
                                        >
                                            <span className="material-symbols-outlined">download</span>
                                            <span>문서 다운로드</span>
                                        </button>
                                    </div>
                                </header>
                                <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
                                    <div className="col-span-12 lg:col-span-3 space-y-10 lg:space-y-12">
                                        <section className="bg-surface-container-low p-6 sm:p-8 rounded-lg" id="common-view-meta-panel">
                                            <h3 className="font-headline font-bold text-lg mb-6 text-primary">문서 세부 정보</h3>
                                            <ul className="space-y-6">
                                                <li className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">작성일자</span>
                                                    <span className="text-sm font-semibold text-on-surface">{doc.createdAtLabel}</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">작성자</span>
                                                    <span className="text-sm font-semibold text-on-surface">{doc.authorName}</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">보안 등급</span>
                                                    <span className="text-sm font-semibold text-primary">{doc.securityLevel}</span>
                                                </li>
                                            </ul>
                                        </section>
                                        <div className="relative overflow-hidden rounded-lg aspect-[4/5] bg-surface-container-high group">
                                            <img
                                                alt=""
                                                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMJStMrmp3l0hsCIPDpcMbeTEVR4x2NNjHBanas3Tm4-psWx_SKlS9dCfqApFqdAp85Gr0DHrQkM71PL_9jfnfFKTEuwQKcYEWNrYMIxr3PJ77sp2VQMvggqJ8XL5riupzVsc8iuLC2PAsFuH71vicQ20J1TMwcb40UKlZSDv3BeatzLPxvxBL5jh309MSAD3XgNySfUEcZ0Dqj9-fp62cqKTvZ7EPwsuUoWZiREKEP0UMy45AEcD-CLbld2K9MJdq0QcMsjpFqF9h"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-6 sm:p-8">
                                                <p className="text-white text-sm font-medium leading-relaxed">디지털 자산의 안전한 관리와 정교한 문서 렌더링 시스템을 경험하세요.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-9">
                                        <div className="bg-surface-container-lowest rounded-xl min-h-[min(1000px,70vh)] shadow-ambient p-6 sm:p-12 md:p-24 relative overflow-hidden">
                                            <div className="max-w-2xl mx-auto space-y-10 sm:space-y-12 text-slate-800">
                                                <div className="flex justify-between items-start mb-12 sm:mb-16">
                                                    <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                                                        <span className="text-white font-headline font-bold text-2xl">B</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400 font-label tracking-widest">REPORT NO. {doc.reportNo}</p>
                                                        <p className="text-xs text-slate-400 font-label tracking-widest">CONFIDENTIAL</p>
                                                    </div>
                                                </div>
                                                <h1 className="text-3xl sm:text-4xl font-headline font-bold border-b-4 border-teal-500 pb-6 mb-10 sm:mb-12">
                                                    2024년 정기 운행 서비스 계약서
                                                </h1>
                                                <section className="space-y-4">
                                                    <h2 className="text-xl font-bold text-primary">제 1 조 (목적)</h2>
                                                    <p className="text-sm leading-relaxed text-slate-600">
                                                        본 계약은 busTaams(이하 &quot;갑&quot;)와 운송 파트너(이하 &quot;을&quot;) 간의 2024년도 정기 운행 서비스 제공에 관한 제반 사항을 규정함을 목적으로 한다. 양 당사자는 신의성실의 원칙에 입각하여 계약 내용을 이행하여야 한다.
                                                    </p>
                                                </section>
                                                <section className="space-y-4">
                                                    <h2 className="text-xl font-bold text-primary">제 2 조 (용어의 정의)</h2>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="p-4 bg-surface-container-low rounded-lg">
                                                            <p className="font-bold text-xs mb-2">운행 서비스</p>
                                                            <p className="text-xs text-slate-500">배차 관리 시스템에 따라 지정된 노선을 운행하는 일체의 유료 운송 서비스</p>
                                                        </div>
                                                        <div className="p-4 bg-surface-container-low rounded-lg">
                                                            <p className="font-bold text-xs mb-2">정산 시스템</p>
                                                            <p className="text-xs text-slate-500">운행 기록을 바탕으로 월별 수익을 자동 계산하고 지급하는 통합 관리 모듈</p>
                                                        </div>
                                                    </div>
                                                </section>
                                                <section className="space-y-4">
                                                    <h2 className="text-xl font-bold text-primary">제 3 조 (서비스 범위)</h2>
                                                    <p className="text-sm leading-relaxed text-slate-600">
                                                        을은 갑이 운영하는 플랫폼 내의 실시간 배차 정보를 수신하며, 승객의 요청에 따라 최적의 경로로 운송 서비스를 제공한다.
                                                    </p>
                                                    <div className="mt-8">
                                                        <img alt="" className="w-full rounded-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbfrQaFyXt83Pqbo6cFDIooRqU0Uk8wO_2EGEsl7S-O6zzQp35m-tO7dngfuLSLFygsRMtzEE5grYAObmrt2e-ckIf79g1ImFeqob6CrStGMMM-ItCWghuym-AysmO35t0eMrLKTUgA9h3lxpopKQGhkMekqNp8-rUwtK9KkS5MoSt1i8P96V3vZlT6FdsZOILl4vdqHfJ_oml1do4ZlbcT08WF1YRnrr-wwI-oSi1ayAMsLnlwInPRLjvZQ_hLWlpWAn3VIQtMpQD" />
                                                    </div>
                                                </section>
                                                <section className="space-y-4 pt-10 sm:pt-12">
                                                    <div className="flex flex-col sm:flex-row gap-8 border-t border-slate-100 pt-10 sm:pt-12">
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-slate-400 uppercase mb-2">갑 (원청)</p>
                                                            <p className="text-lg font-bold">busTaams 주식회사</p>
                                                            <div className="mt-4 w-32 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded flex items-center justify-center italic text-slate-300 text-xs">(인)</div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-slate-400 uppercase mb-2">을 (계약상대자)</p>
                                                            <p className="text-lg font-bold">운송사업 파트너 대표</p>
                                                            <div className="mt-4 w-32 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded flex items-center justify-center italic text-slate-300 text-xs">(인)</div>
                                                        </div>
                                                    </div>
                                                </section>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-45deg] pointer-events-none select-none">
                                                    <span className="text-6xl sm:text-8xl font-black font-headline whitespace-nowrap">busTaams ORIGINAL</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-10 sm:mt-12 flex justify-center gap-2 items-center" id="common-view-pagination">
                                            <button type="button" id="common-view-page-prev" className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary hover:text-white transition-colors disabled:opacity-40" onClick={goPrev} disabled={page <= 1}>
                                                <span className="material-symbols-outlined">navigate_before</span>
                                            </button>
                                            <div className="flex items-center bg-surface-container-high px-5 sm:px-6 py-2 rounded-full font-label text-sm font-bold">
                                                PAGE {page} OF {totalPages}
                                            </div>
                                            <button type="button" id="common-view-page-next" className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary hover:text-white transition-colors disabled:opacity-40" onClick={goNext} disabled={page >= totalPages}>
                                                <span className="material-symbols-outlined">navigate_next</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="mt-8 flex justify-end border-t border-surface-container-low pt-4">
                            <button
                                type="button"
                                id="common-view-close-bottom"
                                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-slate-500 hover:bg-slate-600 active:scale-95 transition-all shadow-sm"
                                onClick={close}
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CommonView;
export { COMMON_VIEW_ROOT_ID, COMMON_VIEW_MODAL_ID };
