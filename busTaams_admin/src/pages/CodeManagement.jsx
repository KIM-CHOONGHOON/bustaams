import React, { useState, useEffect } from 'react';
import { 
  Database, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle, 
  RefreshCw, Info, Check, Filter, Layers, Trash, LayoutList, Eye
} from 'lucide-react';

const CodeManagement = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 검색 조건
  const [searchType, setSearchType] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 알림 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // 1. 단일 수정 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    grpCd: '',
    dtlCd: '',
    cdNmKo: '',
    cdNmEn: '',
    cdFnum: 0,
    cdTnum: 0,
    useYn: 'Y',
    dispOrd: 0,
    cdDesc: ''
  });

  // 2. 일괄 등록 모달 상태 (동적 추가 모달)
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkGroupData, setBulkGroupData] = useState({
    grpCd: '',
    grpDesc: ''
  });
  const [bulkCodes, setBulkCodes] = useState([
    { dtlCd: '', cdNmKo: '', cdNmEn: '', cdFnum: 0, cdTnum: 0, useYn: 'Y', dispOrd: 10, cdDesc: '' }
  ]);
  
  // 일괄 등록 시, 이미 등록된 기존 코드 참고용 상태
  const [existingCodes, setExistingCodes] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 공통 코드 조회
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword.trim()) {
        params.append('searchType', searchType);
        params.append('searchKeyword', searchKeyword.trim());
      }
      
      const res = await fetch(`/api/admin/common-codes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data);
      } else {
        showToast('코드 목록을 불러오지 못했습니다.', 'error');
      }
    } catch (err) {
      console.error('Fetch common codes error:', err);
      showToast('서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCodes();
  };

  const handleReset = () => {
    setSearchType('all');
    setSearchKeyword('');
    setTimeout(() => {
      fetchCodes();
    }, 50);
  };

  // 단일 수정 모달 열기
  const openEditModal = (item) => {
    setEditFormData({
      grpCd: item.grpCd,
      dtlCd: item.dtlCd,
      cdNmKo: item.cdNmKo || '',
      cdNmEn: item.cdNmEn || '',
      cdFnum: Number(item.cdFnum || 0),
      cdTnum: Number(item.cdTnum || 0),
      useYn: item.useYn || 'Y',
      dispOrd: Number(item.dispOrd || 0),
      cdDesc: item.cdDesc || ''
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 단일 수정 제출
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.cdNmKo.trim()) {
      showToast('코드 한글명은 필수 항목입니다.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/common-codes/${editFormData.grpCd}/${editFormData.dtlCd}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('코드가 수정되었습니다.', 'success');
        setEditModalOpen(false);
        fetchCodes();
      } else {
        showToast(data.error || '수정에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('Update code error:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  // 단일 코드 삭제
  const handleDelete = async (grpCd, dtlCd) => {
    if (!window.confirm(`정말 그룹코드: [${grpCd}], 상세코드: [${dtlCd}] 코드를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/common-codes/${grpCd}/${dtlCd}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('코드가 정상적으로 삭제되었습니다.', 'success');
        fetchCodes();
      } else {
        showToast(data.error || '삭제 처리에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('Delete code error:', err);
      showToast('삭제 중 서버 오류가 발생했습니다.', 'error');
    }
  };

  // ==========================================
  // 일괄 등록 동적 폼 핸들러
  // ==========================================
  const openBulkModal = () => {
    let defaultGrpCd = '';
    let defaultGrpDesc = '';
    let defaultDispOrd = 10;
    let listForGrp = [];

    // 1. 현재 검색어 또는 필터 상태 분석
    if (searchType === 'grpCd' && searchKeyword.trim()) {
      defaultGrpCd = searchKeyword.toUpperCase().trim();
    } else if (codes.length > 0) {
      const firstGrp = codes[0].grpCd;
      const isSingleGroup = codes.every(c => c.grpCd === firstGrp);
      if (isSingleGroup) {
        defaultGrpCd = firstGrp;
      }
    }

    // 2. 기존 상세코드 및 순서 추출
    if (defaultGrpCd && codes.length > 0) {
      const matchedItem = codes.find(c => c.grpCd === defaultGrpCd);
      if (matchedItem) {
        defaultGrpDesc = matchedItem.cdDesc || '';
      }

      listForGrp = codes.filter(c => c.grpCd === defaultGrpCd);
      if (listForGrp.length > 0) {
        const maxOrd = Math.max(...listForGrp.map(c => Number(c.dispOrd || 0)));
        defaultDispOrd = maxOrd < 10 ? maxOrd + 1 : maxOrd + 10;
      }
    }

    setBulkGroupData({
      grpCd: defaultGrpCd,
      grpDesc: defaultGrpDesc
    });
    setExistingCodes(listForGrp);
    
    // 기존에 존재하던 코드를 isExisting: true 객체로 변환
    const mappedExist = listForGrp.map(item => ({
      dtlCd: item.dtlCd,
      cdNmKo: item.cdNmKo || '',
      cdNmEn: item.cdNmEn || '',
      cdFnum: Number(item.cdFnum || 0),
      cdTnum: Number(item.cdTnum || 0),
      useYn: item.useYn || 'Y',
      dispOrd: Number(item.dispOrd || 0),
      cdDesc: item.cdDesc || '',
      isExisting: true
    }));

    setBulkCodes([
      ...mappedExist,
      { dtlCd: '', cdNmKo: '', cdNmEn: '', cdFnum: 0, cdTnum: 0, useYn: 'Y', dispOrd: defaultDispOrd, cdDesc: '', isExisting: false }
    ]);
    setBulkModalOpen(true);
  };

  // 모달 안에서 사용자가 그룹 코드를 직접 타이핑할 때 기존 매핑 리스트 실시간 조회 및 테이블 병합
  const handleBulkGrpCdChange = (val) => {
    const cleanVal = val.toUpperCase().trim();
    setBulkGroupData(prev => ({ ...prev, grpCd: val }));
    
    const listForGrp = codes.filter(c => c.grpCd === cleanVal);
    setExistingCodes(listForGrp);

    if (listForGrp.length > 0) {
      const matched = listForGrp[0];
      const maxOrd = Math.max(...listForGrp.map(c => Number(c.dispOrd || 0)));
      const nextDispOrd = maxOrd < 10 ? maxOrd + 1 : maxOrd + 10;

      setBulkGroupData(prev => ({
        ...prev,
        grpDesc: matched.cdDesc || prev.grpDesc
      }));

      const mappedExist = listForGrp.map(item => ({
        dtlCd: item.dtlCd,
        cdNmKo: item.cdNmKo || '',
        cdNmEn: item.cdNmEn || '',
        cdFnum: Number(item.cdFnum || 0),
        cdTnum: Number(item.cdTnum || 0),
        useYn: item.useYn || 'Y',
        dispOrd: Number(item.dispOrd || 0),
        cdDesc: item.cdDesc || '',
        isExisting: true
      }));

      // 기존 입력 중이던 신규 코드를 보존하기 위해 병합
      setBulkCodes(prev => {
        const newOnly = prev.filter(c => !c.isExisting);
        const finalNewOnly = newOnly.length > 0 ? newOnly : [{ dtlCd: '', cdNmKo: '', cdNmEn: '', cdFnum: 0, cdTnum: 0, useYn: 'Y', dispOrd: nextDispOrd, cdDesc: '', isExisting: false }];
        return [...mappedExist, ...finalNewOnly];
      });
    } else {
      setBulkCodes(prev => {
        const newOnly = prev.filter(c => !c.isExisting);
        if (newOnly.length === 0) {
          return [{ dtlCd: '', cdNmKo: '', cdNmEn: '', cdFnum: 0, cdTnum: 0, useYn: 'Y', dispOrd: 10, cdDesc: '', isExisting: false }];
        }
        return newOnly;
      });
    }
  };

  // 동적 행 추가
  const addBulkRow = () => {
    let nextOrd = 10;
    if (bulkCodes.length > 0) {
      const maxInBulk = Math.max(...bulkCodes.map(c => Number(c.dispOrd || 0)));
      nextOrd = maxInBulk < 10 ? maxInBulk + 1 : maxInBulk + 10;
    }
    
    setBulkCodes([
      ...bulkCodes,
      { dtlCd: '', cdNmKo: '', cdNmEn: '', cdFnum: 0, cdTnum: 0, useYn: 'Y', dispOrd: nextOrd, cdDesc: '', isExisting: false }
    ]);
  };

  // 동적 행 삭제
  const removeBulkRow = (index) => {
    const target = bulkCodes[index];
    if (target.isExisting) {
      showToast('이미 등록된 기존 코드는 일괄 등록 폼에서 제외할 수 없습니다.', 'error');
      return;
    }
    
    const newOnly = bulkCodes.filter(c => !c.isExisting);
    if (newOnly.length === 1) {
      showToast('추가할 상세 코드가 최소 1개는 기재되어야 합니다.', 'error');
      return;
    }

    setBulkCodes(bulkCodes.filter((_, idx) => idx !== index));
  };

  // 동적 행 내 필드 입력 변경
  const handleBulkRowChange = (index, field, value) => {
    setBulkCodes(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // 일괄 등록 저장 제출
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const { grpCd, grpDesc } = bulkGroupData;

    if (!grpCd.trim()) {
      showToast('그룹 코드를 입력해주세요.', 'error');
      return;
    }

    // 신규 추가 건만 필터링
    const newCodes = bulkCodes.filter(c => !c.isExisting);

    if (newCodes.length === 0) {
      showToast('새로 추가할 하위 코드가 존재하지 않습니다.', 'error');
      return;
    }

    // 하위 코드 유효성 검사 (신규 추가 건만 대상)
    for (let i = 0; i < newCodes.length; i++) {
      const row = newCodes[i];
      if (!row.dtlCd.trim() || !row.cdNmKo.trim()) {
        showToast(`새로 추가할 상세코드와 한글명은 필수 입력 항목입니다.`, 'error');
        return;
      }
    }

    try {
      const res = await fetch('/api/admin/common-codes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grpCd: grpCd.toUpperCase().trim(),
          grpDesc: grpDesc.trim(),
          codes: newCodes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('하위 코드가 일괄 등록되었습니다.', 'success');
        setBulkModalOpen(false);
        fetchCodes();
      } else {
        showToast(data.error || '일괄 등록에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('Bulk submit code error:', err);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 min-h-[calc(100vh-160px)]">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl transition-all border ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-400' 
            : 'bg-rose-500 text-white border-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutList className="text-emerald-500" size={32} />
            공통 코드 통합 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            시스템에서 활용하는 공통 코드를 조건별로 검색하여 수정/삭제하며, 새로운 코드 세트를 편리하게 일괄 추가할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCodes}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            onClick={openBulkModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-sm"
          >
            <Plus size={18} />
            코드 일괄 추가
          </button>
        </div>
      </div>

      {/* Search Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
            <Filter size={18} className="text-emerald-500" />
            <span className="text-sm font-bold">검색 조건</span>
          </div>

          <div className="w-full md:w-48">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
            >
              <option value="all">전체 통합 검색</option>
              <option value="grpCd">그룹 코드</option>
              <option value="cdNmKo">코드 한글명</option>
            </select>
          </div>

          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="검색어를 입력하고 Enter를 누르거나 조회 버튼을 클릭하세요."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
          </div>

          <div className="flex w-full md:w-auto gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
            >
              조회
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="flex-1 md:flex-initial bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-95"
            >
              초기화
            </button>
          </div>
        </form>
      </div>

      {/* Code Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-5">그룹 코드</th>
                <th className="py-4 px-5">상세 코드</th>
                <th className="py-4 px-5">코드 한글명</th>
                <th className="py-4 px-5">코드 영문명</th>
                <th className="py-4 px-5 text-center">순서</th>
                <th className="py-4 px-5 text-center">사용 여부</th>
                <th className="py-4 px-5">설명 및 비고</th>
                <th className="py-4 px-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-3 text-sm font-semibold text-slate-500">코드 데이터를 조회하는 중입니다...</p>
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <Info size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-medium">검색된 공통 코드 데이터가 존재하지 않습니다.</p>
                  </td>
                </tr>
              ) : (
                codes.map((item, idx) => (
                  <tr 
                    key={`${item.grpCd}-${item.dtlCd}-${idx}`} 
                    className="hover:bg-emerald-50/10 transition-colors text-sm font-medium text-slate-700"
                  >
                    <td className="py-4 px-5 font-bold text-slate-800">{item.grpCd}</td>
                    <td className="py-4 px-5 font-bold text-indigo-600 bg-indigo-50/20 rounded-lg px-2 py-0.5 max-w-fit">{item.dtlCd}</td>
                    <td className="py-4 px-5 font-semibold text-slate-900">{item.cdNmKo}</td>
                    <td className="py-4 px-5 text-slate-500">{item.cdNmEn || '-'}</td>
                    <td className="py-4 px-5 text-center font-bold text-slate-600">{item.dispOrd}</td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-black border ${
                        item.useYn === 'Y' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {item.useYn === 'Y' ? <Check size={12} /> : null}
                        {item.useYn === 'Y' ? '사용' : '미사용'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 max-w-xs truncate" title={item.cdDesc}>
                      {item.cdDesc || '-'}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 rounded-xl transition-all active:scale-95"
                          title="수정"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.grpCd, item.dtlCd)}
                          className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all active:scale-95"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. 일괄 등록 모달 (동적 상세 행 추가 기능 탑재) */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="text-emerald-500" size={22} />
                공통 코드 일괄 등록 (그룹 & 하위 코드 세트)
              </h3>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 1. 상단: 그룹 코드 입력부 */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150/70 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      그룹 코드 (GRP_CD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="예: TRAVEL_STS"
                      value={bulkGroupData.grpCd}
                      onChange={(e) => handleBulkGrpCdChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">영문 대문자와 언더바(_) 위주로 작성하세요.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      그룹 설명 (대표 명칭)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 여행 진행 상태 구분 코드"
                      value={bulkGroupData.grpDesc}
                      onChange={(e) => setBulkGroupData(prev => ({ ...prev, grpDesc: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                    />
                  </div>
                </div>

                {/* 2. 하단: 동적 하위 코드 테이블 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <Database size={16} className="text-emerald-500" />
                      상세 코드 목록 (기존 등록 내역 및 추가 목록)
                    </h4>
                    <button
                      type="button"
                      onClick={addBulkRow}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 font-bold px-3 py-1.5 rounded-lg transition-all text-xs active:scale-95"
                    >
                      <Plus size={14} />
                      행 추가
                    </button>
                  </div>

                  {/* 동적 인풋 테이블 헤더 및 스크롤 바디 */}
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 font-bold text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3 w-[150px]">상세 코드 *</th>
                          <th className="py-2.5 px-3 w-[160px]">코드 한글명 *</th>
                          <th className="py-2.5 px-3 w-[130px]">코드 영문명</th>
                          <th className="py-2.5 px-3 w-[80px] text-center">정렬 순서</th>
                          <th className="py-2.5 px-3 w-[100px] text-center">사용 여부</th>
                          <th className="py-2.5 px-3">코드 설명</th>
                          <th className="py-2.5 px-3 w-[50px] text-center">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkCodes.map((row, index) => (
                          <tr 
                            key={index} 
                            className={`transition-colors ${row.isExisting ? 'bg-slate-50/50 text-slate-400' : 'hover:bg-slate-50/40'}`}
                          >
                            {/* 상세코드 */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.dtlCd}
                                onChange={(e) => handleBulkRowChange(index, 'dtlCd', e.target.value)}
                                disabled={row.isExisting}
                                placeholder="예: REQ"
                                className={`w-full border rounded-lg px-2.5 py-1.5 font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                                required
                              />
                            </td>
                            {/* 한글명 */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.cdNmKo}
                                onChange={(e) => handleBulkRowChange(index, 'cdNmKo', e.target.value)}
                                disabled={row.isExisting}
                                placeholder="예: 요청대기"
                                className={`w-full border rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                                required
                              />
                            </td>
                            {/* 영문명 */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.cdNmEn}
                                onChange={(e) => handleBulkRowChange(index, 'cdNmEn', e.target.value)}
                                disabled={row.isExisting}
                                placeholder="예: Request"
                                className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                              />
                            </td>
                            {/* 정렬순서 */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={row.dispOrd}
                                onChange={(e) => handleBulkRowChange(index, 'dispOrd', Number(e.target.value))}
                                disabled={row.isExisting}
                                className={`w-full border rounded-lg px-2 py-1.5 text-center font-bold focus:outline-none ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                              />
                            </td>
                            {/* 사용여부 */}
                            <td className="py-2 px-3">
                              <select
                                value={row.useYn}
                                onChange={(e) => handleBulkRowChange(index, 'useYn', e.target.value)}
                                disabled={row.isExisting}
                                className={`w-full border rounded-lg px-2 py-1.5 font-bold focus:outline-none ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                              >
                                <option value="Y">사용 (Y)</option>
                                <option value="N">미사용 (N)</option>
                              </select>
                            </td>
                            {/* 코드설명 */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.cdDesc}
                                onChange={(e) => handleBulkRowChange(index, 'cdDesc', e.target.value)}
                                disabled={row.isExisting}
                                placeholder="설명을 입력하세요."
                                className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none ${
                                  row.isExisting 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-slate-200 focus:bg-white'
                                }`}
                              />
                            </td>
                            {/* 삭제 버튼 */}
                            <td className="py-2 px-3 text-center">
                              {!row.isExisting ? (
                                <button
                                  type="button"
                                  onClick={() => removeBulkRow(index)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash size={14} />
                                </button>
                              ) : (
                                <span className="text-slate-300 font-bold block py-1">기존</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md"
                >
                  일괄 저장 실행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. 단일 상세 코드 수정 모달 */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit2 size={16} className="text-emerald-500" />
                단일 공통 코드 수정
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                    그룹 코드 (GRP_CD)
                  </label>
                  <input
                    type="text"
                    name="grpCd"
                    value={editFormData.grpCd}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-400 rounded-xl px-3.5 py-2 text-sm font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                    상세 코드 (DTL_CD)
                  </label>
                  <input
                    type="text"
                    name="dtlCd"
                    value={editFormData.dtlCd}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-400 rounded-xl px-3.5 py-2 text-sm font-bold cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      코드 한글명 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cdNmKo"
                      value={editFormData.cdNmKo}
                      onChange={handleEditFormChange}
                      placeholder="예: 프리미엄 등급"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      코드 영문명
                    </label>
                    <input
                      type="text"
                      name="cdNmEn"
                      value={editFormData.cdNmEn}
                      onChange={handleEditFormChange}
                      placeholder="예: Premium Level"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      정렬 순서 (DISP_ORD)
                    </label>
                    <input
                      type="number"
                      name="dispOrd"
                      value={editFormData.dispOrd}
                      onChange={handleEditFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      사용 여부 (USE_YN)
                    </label>
                    <div className="flex gap-4 mt-2.5">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="useYn"
                          value="Y"
                          checked={editFormData.useYn === 'Y'}
                          onChange={handleEditFormChange}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        사용 (Y)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="useYn"
                          value="N"
                          checked={editFormData.useYn === 'N'}
                          onChange={handleEditFormChange}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        미사용 (N)
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                    코드 상세 설명
                  </label>
                  <textarea
                    name="cdDesc"
                    value={editFormData.cdDesc}
                    onChange={handleEditFormChange}
                    rows="3"
                    placeholder="상세 정보를 기입합니다."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeManagement;
