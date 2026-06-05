import React, { useState, useEffect } from 'react';
import { 
  Receipt, Calendar, Search, RefreshCw, FileText, CheckCircle2, 
  XCircle, AlertCircle, Printer, Download, Plus, ChevronRight, Info, Mail
} from 'lucide-react';

const TaxInvoiceManagement = () => {
  const [activeTab, setActiveTab] = useState('unissued'); // 'unissued' | 'issued'
  const [loading, setLoading] = useState(false);
  const [unissuedList, setUnissuedList] = useState([]);
  const [issuedList, setIssuedList] = useState([]);

  // Filters
  const formatMonth = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };
  const [targetMonth, setTargetMonth] = useState(formatMonth(new Date()));
  const [targetType, setTargetType] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Selected invoice/target for modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' | 'view'
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form states for manual editing
  const [bizNo, setBizNo] = useState('');
  const [bizNm, setBizNm] = useState('');
  const [ceoNm, setCeoNm] = useState('');
  const [bizAddr, setBizAddr] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizItem, setBizItem] = useState('');
  const [email, setEmail] = useState('');
  const [supplyAmt, setSupplyAmt] = useState(0);
  const [taxAmt, setTaxAmt] = useState(0);
  const [totalAmt, setTotalAmt] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const yyyyMM = targetMonth.replace('-', '');
      
      if (activeTab === 'unissued') {
        const res = await fetch(`/api/admin/tax-invoices/unissued?yyyyMM=${yyyyMM}`);
        if (res.ok) {
          const data = await res.json();
          setUnissuedList(data);
        }
      } else {
        const typeQuery = targetType !== 'all' ? `&targetType=${targetType}` : '';
        const keywordQuery = searchKeyword ? `&searchKeyword=${encodeURIComponent(searchKeyword)}` : '';
        const res = await fetch(`/api/admin/tax-invoices?yyyyMM=${yyyyMM}${typeQuery}${keywordQuery}`);
        if (res.ok) {
          const data = await res.json();
          setIssuedList(data);
        }
      }
    } catch (error) {
      console.error('Fetch tax invoice data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, targetMonth, targetType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Excel Export Logic
  const exportToExcel = () => {
    let headers = [];
    let rows = [];
    let fileName = '';

    if (activeTab === 'unissued') {
      headers = ['대상 구분', '대상자 ID', '성명', '연락처', '이메일', '등급 정책', '수당 요율/설명', '수당 금액(원)'];
      rows = unissuedList.map(item => [
        item.targetType === 'DRIVER' ? '운전기사' : '영업사원',
        item.targetId,
        item.targetName,
        item.hpNo || '',
        item.email || '',
        item.feePolicy,
        item.feePolicyLabel,
        item.allowanceAmt
      ]);
      fileName = `세금계산서_발행대기목록_${targetMonth.replace('-', '')}.csv`;
    } else {
      headers = ['계산서 번호', '대상 구분', '대상자 ID', '공급자 상호', '공급자 대표자', '공급자 등록번호', '공급가액(원)', '세액(원)', '합계금액(원)', '발행상태', '발행일시'];
      rows = issuedList.map(item => [
        item.taxInvoiceId,
        item.targetType === 'DRIVER' ? '운전기사' : '영업사원',
        item.targetId,
        item.supplierNm,
        item.supplierCeo,
        item.supplierBizNo,
        item.supplyAmt,
        item.taxAmt,
        item.totalAmt,
        item.invoiceStat === 'ISSUED' ? '발행완료' : '발행취소',
        item.issueDt || ''
      ]);
      fileName = `세금계산서_발행완료목록_${targetMonth.replace('-', '')}.csv`;
    }

    // UTF-8 BOM to prevent Excel encoding issues
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openCreateModal = (target) => {
    setSelectedTarget(target);
    setModalType('create');

    // Pre-calculate standard VAT separation (Total = Supply + Tax)
    const total = Number(target.allowanceAmt || 0);
    const supply = Math.round(total / 1.1);
    const tax = total - supply;

    setBizNo(target.supplierBizNo || '');
    setBizNm(target.supplierNm || target.targetName || '');
    setCeoNm(target.supplierCeo || target.targetName || '');
    setBizAddr(target.supplierAddr || '');
    setBizType(target.supplierBizType || (target.targetType === 'DRIVER' ? '운수업' : '서비스업'));
    setBizItem(target.supplierItem || (target.targetType === 'DRIVER' ? '여객자동차운송업' : '마케팅 대행'));
    setEmail(target.email || '');
    setSupplyAmt(supply);
    setTaxAmt(tax);
    setTotalAmt(total);
    setRemarks(`${target.yyyyMM || targetMonth.replace('-', '')}월 수당 정산분`);
    
    setShowModal(true);
  };

  const openViewModal = (invoice) => {
    setSelectedInvoice(invoice);
    setModalType('view');

    setBizNo(invoice.supplierBizNo || '');
    setBizNm(invoice.supplierNm || '');
    setCeoNm(invoice.supplierCeo || '');
    setBizAddr(invoice.supplierAddr || '');
    setBizType(invoice.supplierBizType || '');
    setBizItem(invoice.supplierItem || '');
    setEmail(invoice.remarks || ''); // remarks/email
    setSupplyAmt(invoice.supplyAmt);
    setTaxAmt(invoice.taxAmt);
    setTotalAmt(invoice.totalAmt);
    setRemarks(invoice.remarks || '');
    
    setShowModal(true);
  };

  const handleIssueInvoice = async () => {
    if (!bizNo || !bizNm || !ceoNm || !bizAddr) {
      alert('공급자 필수 정보(등록번호, 상호, 대표자명, 사업장주소)를 모두 입력해 주세요.');
      return;
    }

    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const body = {
        targetType: selectedTarget.targetType,
        targetId: selectedTarget.targetId,
        yyyyMM: targetMonth.replace('-', ''),
        supplyAmt,
        taxAmt,
        totalAmt,
        supplierBizNo: bizNo,
        supplierNm: bizNm,
        supplierCeo: ceoNm,
        supplierAddr: bizAddr,
        supplierBizType: bizType,
        supplierItem: bizItem,
        email,
        remarks,
        regId: adminUser.adminId || 'ADMIN'
      };

      const res = await fetch('/api/admin/tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('세금계산서가 정상적으로 발행되었습니다.');
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`발행 실패: ${err.error}`);
      }
    } catch (error) {
      console.error('Issue tax invoice error:', error);
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  const handleCancelInvoice = async (taxInvoiceId) => {
    if (!window.confirm('정말로 이 세금계산서의 발행을 취소하시겠습니까?')) return;

    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const res = await fetch(`/api/admin/tax-invoices/${taxInvoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          modId: adminUser.adminId || 'ADMIN'
        })
      });

      if (res.ok) {
        alert('성공적으로 세금계산서 발행이 취소 처리되었습니다.');
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`취소 처리 실패: ${err.error}`);
      }
    } catch (error) {
      console.error('Cancel tax invoice error:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Stat calculations
  const totalIssuedAmt = issuedList
    .filter(x => x.invoiceStat === 'ISSUED')
    .reduce((sum, item) => sum + Number(item.totalAmt), 0);
  const totalIssuedCount = issuedList.filter(x => x.invoiceStat === 'ISSUED').length;
  
  const totalPendingAmt = unissuedList.reduce((sum, item) => sum + Number(item.allowanceAmt), 0);
  const totalPendingCount = unissuedList.length;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 print:p-0">
      
      {/* Page Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="text-indigo-500" size={32} />
            세금계산서 발행 및 이력 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            기사 및 영업사원 수당에 대하여 사업자 정보(OCR/수동)를 토대로 세금계산서를 원스톱으로 발행하고 국세청 이력을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'issued' && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
            >
              <Download size={16} />
              엑셀 다운로드
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {/* Pending Payouts Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">발행 대기 수당</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPendingAmt.toLocaleString()}원</h3>
            <p className="text-xs text-amber-600 font-semibold mt-1">총 {totalPendingCount}건 미발행</p>
          </div>
        </div>

        {/* Issued Invoices Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">발행 완료 금액</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalIssuedAmt.toLocaleString()}원</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">총 {totalIssuedCount}건 발행 완료</p>
          </div>
        </div>

        {/* Target Month Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <span className="text-xs text-indigo-100 font-bold uppercase tracking-wider">정산 귀속월</span>
              <h3 className="text-xl font-black mt-0.5">{targetMonth.split('-')[0]}년 {targetMonth.split('-')[1]}월</h3>
            </div>
          </div>
          <input 
            type="month" 
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="bg-white/20 border-none text-white font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('unissued')}
          className={`px-6 py-3.5 font-black text-sm tracking-tight border-b-2 transition-all ${
            activeTab === 'unissued' 
              ? 'border-indigo-500 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          계산서 발행 대기 ({totalPendingCount}건)
        </button>
        <button
          onClick={() => setActiveTab('issued')}
          className={`px-6 py-3.5 font-black text-sm tracking-tight border-b-2 transition-all ${
            activeTab === 'issued' 
              ? 'border-indigo-500 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          발행 완료 이력 조회 ({issuedList.length}건)
        </button>
      </div>

      {/* Filter and Search Panel for Tab 2 */}
      {activeTab === 'issued' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center print:hidden">
          <div className="w-full md:w-48 shrink-0">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
            >
              <option value="all">전체 대상자</option>
              <option value="DRIVER">운전기사만</option>
              <option value="SALES">영업사원만</option>
            </select>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="공급자명(상호), 등록번호, 대표자명으로 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600">
              <Search size={16} />
            </button>
          </form>
          
          <button
            onClick={fetchData}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
          >
            검색
          </button>
        </div>
      )}

      {/* Main Tables */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          {activeTab === 'unissued' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">대상 구분</th>
                  <th className="py-4 px-6">성명 (ID)</th>
                  <th className="py-4 px-6">휴대폰 / 이메일</th>
                  <th className="py-4 px-6">소속 등급</th>
                  <th className="py-4 px-6 text-right">당월 발생 수당</th>
                  <th className="py-4 px-6 text-center">동작</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-slate-400">
                      <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      <p className="mt-3 text-sm font-semibold text-slate-500">조회하고 있습니다...</p>
                    </td>
                  </tr>
                ) : unissuedList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <Info size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 font-medium">당월 발행 대상 수당이 존재하지 않습니다.</p>
                    </td>
                  </tr>
                ) : (
                  unissuedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/10 text-sm font-medium text-slate-700">
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.targetType === 'DRIVER' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {item.targetType === 'DRIVER' ? '운전기사' : '영업사원'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">{item.targetName} ({item.targetId})</td>
                      <td className="py-4 px-6">
                        <p className="text-xs">{item.hpNo || '-'}</p>
                        <p className="text-xs text-slate-400">{item.email || '-'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.feePolicyLabel}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900">
                        {item.allowanceAmt.toLocaleString()}원
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openCreateModal(item)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 mx-auto"
                        >
                          발행하기 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">계산서 고유번호</th>
                  <th className="py-4 px-6">대상 구분</th>
                  <th className="py-4 px-6">공급자 상호(대표자)</th>
                  <th className="py-4 px-6">공급자 등록번호</th>
                  <th className="py-4 px-6 text-right">총 금액</th>
                  <th className="py-4 px-6 text-center">상태</th>
                  <th className="py-4 px-6 text-center">상세보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      <p className="mt-3 text-sm font-semibold text-slate-500">조회하고 있습니다...</p>
                    </td>
                  </tr>
                ) : issuedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <Info size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 font-medium">조회 기간 내 발행 이력이 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  issuedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/10 text-sm font-medium text-slate-700">
                      <td className="py-4 px-6 font-bold text-indigo-600">{item.taxInvoiceId}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          item.targetType === 'DRIVER' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {item.targetType === 'DRIVER' ? '운전기사' : '영업사원'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{item.supplierNm} ({item.supplierCeo})</td>
                      <td className="py-4 px-6 text-slate-600">{item.supplierBizNo}</td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">{Number(item.totalAmt).toLocaleString()}원</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          item.invoiceStat === 'ISSUED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {item.invoiceStat === 'ISSUED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {item.invoiceStat === 'ISSUED' ? '발행완료' : '발행취소'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openViewModal(item)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                        >
                          상세조회
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tax Invoice Modal Template Layout */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto print:absolute print:bg-white print:p-0 print:inset-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col print:shadow-none print:rounded-none">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="text-indigo-400" size={24} />
                <h3 className="text-lg font-black tracking-tight">
                  {modalType === 'create' ? '수당 전자세금계산서 신규 발행' : '전자세금계산서 상세 조회'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Real visual Tax Invoice Layout */}
            <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-6 print:p-0">
              
              {/* Top Meta info */}
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                <div>[별지 제11호 서식]</div>
                {modalType === 'view' && (
                  <div className="text-slate-800 flex gap-4">
                    <span><strong>발행 번호:</strong> {selectedInvoice?.taxInvoiceId}</span>
                    <span><strong>국세청 승인번호:</strong> {selectedInvoice?.ntsApproveNo}</span>
                  </div>
                )}
              </div>

              {/* Visual Tax Invoice Table (National Tax Service Korea Style) */}
              <div className="border-2 border-red-500/80 rounded-xl overflow-hidden text-xs">
                
                {/* Title Row */}
                <div className="bg-red-50/50 border-b-2 border-red-500/80 p-4 text-center">
                  <h2 className="text-2xl font-black text-red-600 tracking-widest">세 금 계 산 서</h2>
                  <span className="text-[10px] text-red-500 font-bold block mt-1">(공급받는자 보관용)</span>
                </div>

                {/* Suppliers & Buyers Segment Grid */}
                <div className="grid grid-cols-2 border-b border-red-500/80">
                  
                  {/* Left Side: Supplier (공급자 - Red Theme) */}
                  <div className="border-r border-red-500/80 flex flex-col">
                    <div className="bg-red-50/30 font-bold text-red-600 p-2 text-center border-b border-red-500/80 font-black">
                      공 급 자
                    </div>
                    <div className="grid grid-cols-12 flex-1">
                      
                      {/* BIZ NO */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        등록번호
                      </div>
                      <div className="col-span-9 p-1.5 border-b border-red-500/30">
                        {modalType === 'create' ? (
                          <input 
                            type="text" 
                            placeholder="000-00-00000"
                            value={bizNo}
                            onChange={(e) => setBizNo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        ) : (
                          <span className="font-bold text-slate-800">{bizNo}</span>
                        )}
                      </div>

                      {/* Name & CEO */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        상호 / 성명
                      </div>
                      <div className="col-span-9 grid grid-cols-2 p-1.5 border-b border-red-500/30 gap-2">
                        {modalType === 'create' ? (
                          <>
                            <input 
                              type="text" 
                              placeholder="상호(법인명)" 
                              value={bizNm}
                              onChange={(e) => setBizNm(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <input 
                              type="text" 
                              placeholder="대표자명" 
                              value={ceoNm}
                              onChange={(e) => setCeoNm(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </>
                        ) : (
                          <>
                            <span className="font-bold">{bizNm}</span>
                            <span className="font-bold">대표: {ceoNm}</span>
                          </>
                        )}
                      </div>

                      {/* Business Address */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        사업장주소
                      </div>
                      <div className="col-span-9 p-1.5 border-b border-red-500/30">
                        {modalType === 'create' ? (
                          <input 
                            type="text" 
                            placeholder="도로명 주소" 
                            value={bizAddr}
                            onChange={(e) => setBizAddr(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        ) : (
                          <span>{bizAddr}</span>
                        )}
                      </div>

                      {/* Biz Type & Item */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-red-500/30 flex items-center justify-center text-center">
                        업태 / 종목
                      </div>
                      <div className="col-span-9 grid grid-cols-2 p-1.5 gap-2">
                        {modalType === 'create' ? (
                          <>
                            <input 
                              type="text" 
                              placeholder="업태" 
                              value={bizType}
                              onChange={(e) => setBizType(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <input 
                              type="text" 
                              placeholder="종목" 
                              value={bizItem}
                              onChange={(e) => setBizItem(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </>
                        ) : (
                          <>
                            <span>{bizType || '-'}</span>
                            <span>{bizItem || '-'}</span>
                          </>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Right Side: Buyer (공급받는자 - Standard Blue Theme but red borders here) */}
                  <div className="flex flex-col">
                    <div className="bg-red-50/30 font-bold text-red-600 p-2 text-center border-b border-red-500/80 font-black">
                      공급받는자
                    </div>
                    <div className="grid grid-cols-12 flex-1">
                      
                      {/* BIZ NO */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        등록번호
                      </div>
                      <div className="col-span-9 p-2 border-b border-red-500/30 font-bold text-slate-800 flex items-center">
                        120-87-85472
                      </div>

                      {/* Name & CEO */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        상호 / 성명
                      </div>
                      <div className="col-span-9 grid grid-cols-2 p-2 border-b border-red-500/30 font-bold text-slate-800 flex items-center">
                        <span>(주)청솔테크</span>
                        <span>대표: 이청솔</span>
                      </div>

                      {/* Business Address */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-b border-red-500/30 flex items-center justify-center text-center">
                        사업장주소
                      </div>
                      <div className="col-span-9 p-2 border-b border-red-500/30 text-slate-700 flex items-center">
                        서울시 마포구 백범로 31길 21, 5층
                      </div>

                      {/* Biz Type & Item */}
                      <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 border-r border-red-500/30 flex items-center justify-center text-center">
                        업태 / 종목
                      </div>
                      <div className="col-span-9 grid grid-cols-2 p-2 text-slate-700 flex items-center">
                        <span>서비스, 도소매</span>
                        <span>소프트웨어 개발 및 공급업</span>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Amount Row Summary */}
                <div className="grid grid-cols-12 bg-red-50/10 border-b border-red-500/80">
                  <div className="col-span-2 bg-red-50/20 font-bold text-red-600 p-2.5 text-center border-r border-red-500/30 flex items-center justify-center font-black">
                    작성일자
                  </div>
                  <div className="col-span-3 p-2 border-r border-red-500/30 flex items-center font-semibold justify-center">
                    {modalType === 'create' ? (
                      <span>{targetMonth.replace('-', '년 ')}월 15일</span>
                    ) : (
                      <span>{selectedInvoice?.issueDt ? selectedInvoice.issueDt.split(' ')[0] : '-'}</span>
                    )}
                  </div>
                  <div className="col-span-2 bg-red-50/20 font-bold text-red-600 p-2.5 text-center border-r border-red-500/30 flex items-center justify-center font-black">
                    공급가액
                  </div>
                  <div className="col-span-2 p-2 border-r border-red-500/30 text-right font-bold text-slate-800 flex items-center justify-end">
                    {modalType === 'create' ? (
                      <input 
                        type="number"
                        value={supplyAmt}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupplyAmt(val);
                          setTotalAmt(val + taxAmt);
                        }}
                        className="w-full text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                      />
                    ) : (
                      <span>{Number(supplyAmt).toLocaleString()} 원</span>
                    )}
                  </div>
                  <div className="col-span-1 bg-red-50/20 font-bold text-red-600 p-2.5 text-center border-r border-red-500/30 flex items-center justify-center font-black">
                    세액
                  </div>
                  <div className="col-span-2 p-2 text-right font-bold text-slate-800 flex items-center justify-end">
                    {modalType === 'create' ? (
                      <input 
                        type="number"
                        value={taxAmt}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTaxAmt(val);
                          setTotalAmt(supplyAmt + val);
                        }}
                        className="w-full text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                      />
                    ) : (
                      <span>{Number(taxAmt).toLocaleString()} 원</span>
                    )}
                  </div>
                </div>

                {/* Bottom Item description */}
                <div className="grid grid-cols-12 bg-red-50/5 border-b border-red-500/80">
                  <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 text-center border-r border-red-500/30 font-black">
                    품명 / 규격
                  </div>
                  <div className="col-span-6 p-2 border-r border-red-500/30 flex items-center">
                    {modalType === 'create' ? (
                      <input 
                        type="text" 
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
                      />
                    ) : (
                      <span>{remarks || '-'}</span>
                    )}
                  </div>
                  <div className="col-span-1 bg-red-50/20 font-bold text-red-600 p-2 text-center border-r border-red-500/30 font-black">
                    합계금액
                  </div>
                  <div className="col-span-2 p-2 text-right font-black text-red-600 flex items-center justify-end text-sm">
                    {totalAmt.toLocaleString()} 원
                  </div>
                </div>

                {/* Email details row */}
                <div className="grid grid-cols-12">
                  <div className="col-span-3 bg-red-50/20 font-bold text-red-600 p-2 text-center border-r border-red-500/30 flex items-center justify-center font-black">
                    수신 이메일
                  </div>
                  <div className="col-span-9 p-2">
                    {modalType === 'create' ? (
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tax@example.com (입력 시 전자계산서가 메일로 즉시 발송됩니다)"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
                      />
                    ) : (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Mail size={12} className="text-slate-400" />
                        {email || '등록된 메일이 없습니다.'}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Alert helper */}
              <div className="flex gap-2 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-500 font-semibold print:hidden">
                <AlertCircle className="text-indigo-500 shrink-0" size={16} />
                <p>
                  이 전자세금계산서는 국세청 홈택스 표준 연동 규격을 따르고 있으며, 발행 시 국세청(NTS) 전송 대기 승인번호가 임의 생성됩니다.
                  실제 국세청 전송 배치는 매월 15일에 일괄 처리됩니다.
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 flex justify-between items-center print:hidden">
              <div>
                {modalType === 'view' && selectedInvoice?.invoiceStat === 'ISSUED' && (
                  <button
                    onClick={() => handleCancelInvoice(selectedInvoice.taxInvoiceId)}
                    className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95"
                  >
                    발행 취소하기
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95"
                >
                  닫기
                </button>
                {modalType === 'view' && (
                  <button
                    onClick={handlePrint}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Printer size={16} /> 인쇄하기
                  </button>
                )}
                {modalType === 'create' && (
                  <button
                    onClick={handleIssueInvoice}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
                  >
                    발행 확정
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TaxInvoiceManagement;
