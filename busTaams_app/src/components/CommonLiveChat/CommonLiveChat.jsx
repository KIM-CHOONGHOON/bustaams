import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

/** LiveChat.html (실시간 채팅_공통) — 대화열·하단 입력·좌측 견적 카드 스타일 이식. HTML 전체 페이지의 상단 nav·우측 패널(경매정보) 제외 */
const IMG_AVATAR_RECEIVED =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEDqCIJjVzdTqEaHaF-Ys5C-JuYalBaYZw4NgEspNL_DNnulLY3gdomfqOXlxqQXsVuxwqsEvqXC-u74-Ox2B-Z8UyH1zcdLySKcYqY3oReb9PWj7KjdhUo3m8KdGGUFrJP4PQ9FXw-0KRhHMvCOzuc0OaRw0GsA-u75Bui_pdB0P105Y4IS826wx82gEJQ6uWKMkRB1Ph9f5pp3Jc6ZAuf54DB2oj9yOCBM9A9sFGMU_Kn0_TLu49eRQjOhrxszd2E3429Hn8_GM';
const IMG_ATTACH_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDMX5GJtnS1bKRsXHfbWc5pWS9xW4nUrzGGipzAm40dLyCeZqUdb9aHZVBvhKEe9gPhCmKufqMYv3XhEQEouSN6K4Q7e9FdNz7ngp_14IbaSfTZVYQecV_L9LSwR96KY9T7rsMSQ3vQ8MgFDOERYChF95DvgK3JI7MUpbNftCm8o_LGxKye9boffOR69QmnwLOJvvyWYAu2oBYbUhDiuYi24n5BCV57_s2P6QKIVdejHQ0T0bF4Am3YwWYQRkzD_UfdKCFaeg8yYto';
const IMG_ATTACH_2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB-oKRBpE7ALHF44DFfLoNUxDEMaYE9477rMXHPIPa3WXm-6lyuXJquTh12E_Aw8vclH8bGQNzLzvgd9zADITAT-3D1-QlCuLoRFM1hI_nCADCR5-Sbj4EzaGLEpGgTF4rPGYBhE5rFAEu4CEieExmbeQYOhJQ4lI1pXJdetsFDQuGy2NCzf46-BEY82irJCWukeGvTTW-qdoDyqos2jvIcgdmIfT_DbnUEG5dIxSDArmdrooStCeJ11Cvtw5wmSYZ7x7ftEvxoEp8';

function formatDateSeparatorLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${y}년 ${m}월 ${day}일 ${weekdays[d.getDay()]}`;
}

function formatTimeKorean(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dateKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** YYYY-MM-DD (HH:MM) — 24시간 표기 */
function formatYmdHm(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const mo = p(d.getMonth() + 1);
  const day = p(d.getDate());
  const h = p(d.getHours());
  const mi = p(d.getMinutes());
  return `${y}-${mo}-${day} (${h}:${mi})`;
}

function parseImageUrls(msgBody) {
  if (!msgBody) return [];
  try {
    const j = JSON.parse(msgBody);
    if (Array.isArray(j)) return j.filter((u) => typeof u === 'string');
  } catch (_) {
    /* ignore */
  }
  return [];
}

/**
 * CommonLiveChat — 버스기사 「여행자와 대화」 모달 (screenId: CommonLiveChat)
 * REST: /api/CommonLiveChat
 */
const CommonLiveChat = ({ open, onClose, driverId, initialReqId, initialResId }) => {
  const driverSession = (driverId != null && String(driverId).trim()) || '';
  const [partners, setPartners] = useState([]);
  const [reqId, setReqId] = useState('');
  const [resId, setResId] = useState('');
  const [chatSeq, setChatSeq] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [roomMeta, setRoomMeta] = useState({ chatTitle: null, chatCoverFileId: null });
  const scrollRef = useRef(null);
  const lastHistSeqRef = useRef(0);

  const fetchPartners = useCallback(async () => {
    if (!driverSession) return;
    setLoadingPartners(true);
    setError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/CommonLiveChat/chat-partners?driverId=${encodeURIComponent(driverSession)}`
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPartners([]);
        setError(data.error || `목록 오류 (${r.status})`);
        return;
      }
      const items = Array.isArray(data.items) ? data.items : [];
      setPartners(items);
      setReqId((prev) => {
        if (items.length === 0) return '';
        if (
          initialReqId &&
          initialResId &&
          items.some((p) => p.reqId === initialReqId && p.resId === initialResId)
        ) {
          return initialReqId;
        }
        if (initialReqId && items.some((p) => p.reqId === initialReqId)) {
          return initialReqId;
        }
        if (prev && items.some((p) => p.reqId === prev)) return prev;
        return '';
      });
    } catch (e) {
      setError(e.message || '네트워크 오류');
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  }, [driverSession, initialReqId, initialResId]);

  useEffect(() => {
    if (!reqId || !partners.length) {
      if (!reqId) setResId('');
      return;
    }
    const row = partners.find((p) => p.reqId === reqId);
    if (row) setResId(row.resId);
  }, [reqId, partners]);

  const fetchMessages = useCallback(
    async (opts = {}) => {
      const incremental = opts.incremental === true;
      if (!driverSession || !reqId || !resId) {
        setMessages([]);
        return;
      }
      if (!incremental) {
        setLoadingMessages(true);
        lastHistSeqRef.current = 0;
      }
      setError(null);
      try {
        const after = incremental ? lastHistSeqRef.current : 0;
        let url = `${API_BASE}/api/CommonLiveChat/messages?driverId=${encodeURIComponent(driverSession)}&reqId=${encodeURIComponent(reqId)}&resId=${encodeURIComponent(resId)}`;
        if (after > 0) url += `&afterHistSeq=${encodeURIComponent(String(after))}`;
        const r = await fetch(url);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (!incremental) setMessages([]);
          setError(data.error || `메시지 조회 오류 (${r.status})`);
          return;
        }
        if (data.chatTitle != null || data.chatCoverFileId != null) {
          setRoomMeta({
            chatTitle: data.chatTitle != null ? String(data.chatTitle) : null,
            chatCoverFileId: data.chatCoverFileId != null ? String(data.chatCoverFileId) : null,
          });
        }
        if (data.chatSeq != null) setChatSeq(Number(data.chatSeq));
        const items = Array.isArray(data.items) ? data.items : [];
        if (incremental && items.length > 0) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [Number(m.histSeq), m]));
            for (const it of items) map.set(Number(it.histSeq), it);
            return Array.from(map.values()).sort((a, b) => Number(a.histSeq) - Number(b.histSeq));
          });
        } else if (!incremental) {
          setMessages(items);
        }
        const maxIncoming = items.reduce((m, x) => Math.max(m, Number(x.histSeq) || 0), 0);
        if (!incremental) {
          lastHistSeqRef.current = maxIncoming;
        } else if (maxIncoming > lastHistSeqRef.current) {
          lastHistSeqRef.current = maxIncoming;
        }
      } catch (e) {
        if (!incremental) {
          setError(e.message || '네트워크 오류');
          setMessages([]);
        }
      } finally {
        if (!incremental) setLoadingMessages(false);
      }
    },
    [driverSession, reqId, resId]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !driverSession) return;
    fetchPartners();
  }, [open, driverSession, fetchPartners]);

  useEffect(() => {
    if (!reqId) {
      setMessages([]);
      lastHistSeqRef.current = 0;
      setChatSeq(null);
      setRoomMeta({ chatTitle: null, chatCoverFileId: null });
      return;
    }
    setMessages([]);
    lastHistSeqRef.current = 0;
    setChatSeq(null);
    setRoomMeta({ chatTitle: null, chatCoverFileId: null });
  }, [reqId]);

  useEffect(() => {
    if (!open || !reqId || !resId || !driverSession) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/CommonLiveChat/ensure-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: driverSession, reqId, resId }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (!cancelled) setError(data.error || `대화방 준비 오류 (${r.status})`);
          return;
        }
        if (!cancelled && data.CommonLiveChat) {
          setRoomMeta({
            chatTitle: data.CommonLiveChat.chatTitle != null ? String(data.CommonLiveChat.chatTitle) : null,
            chatCoverFileId:
              data.CommonLiveChat.chatCoverFileId != null ? String(data.CommonLiveChat.chatCoverFileId) : null,
          });
        }
        if (!cancelled) await fetchMessages({ incremental: false });
      } catch (e) {
        if (!cancelled) setError(e.message || '네트워크 오류');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reqId, resId, driverSession, fetchMessages]);

  useEffect(() => {
    if (!open || !driverSession || !reqId || !resId) return;
    const id = window.setInterval(() => {
      fetchMessages({ incremental: true });
    }, 5000);
    return () => window.clearInterval(id);
  }, [open, driverSession, reqId, resId, fetchMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const selectedPartner = useMemo(() => {
    if (!reqId || !resId) return null;
    return partners.find((p) => p.reqId === reqId && p.resId === resId) || null;
  }, [partners, reqId, resId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !driverSession || !reqId || !resId || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/CommonLiveChat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driverSession, reqId, resId, msgBody: text }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || `전송 실패 (${r.status})`);
        return;
      }
      if (data.chatSeq != null) setChatSeq(Number(data.chatSeq));
      if (data.chatTitle != null || data.chatCoverFileId != null) {
        setRoomMeta({
          chatTitle: data.chatTitle != null ? String(data.chatTitle) : null,
          chatCoverFileId: data.chatCoverFileId != null ? String(data.chatCoverFileId) : null,
        });
      }
      if (data.histSeq != null) {
        lastHistSeqRef.current = Math.max(lastHistSeqRef.current, Number(data.histSeq) || 0);
      }
      setInput('');
      await fetchMessages({ incremental: false });
    } catch (e) {
      setError(e.message || '네트워크 오류');
    } finally {
      setSending(false);
    }
  };

  const timeline = useMemo(() => {
    const out = [];
    let prevD = '';
    for (const m of messages) {
      const dk = dateKey(m.regDt);
      if (dk && dk !== prevD) {
        out.push({ kind: 'sep', key: `sep-${m.histSeq}`, regDt: m.regDt });
        prevD = dk;
      }
      out.push({ kind: 'msg', key: String(m.histSeq), m });
    }
    return out;
  }, [messages]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative flex w-full max-w-6xl h-[min(92vh,900px)] flex-col rounded-2xl shadow-2xl overflow-hidden bg-background border border-outline-variant/10">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-1 min-h-0 pt-12">
          <aside className="w-[min(100%,320px)] shrink-0 bg-surface-container-low flex flex-col border-r border-outline-variant/10">
            <div className="p-6 pb-3">
              <h2 className="text-xl font-extrabold font-headline tracking-tighter text-on-surface">대화 상대</h2>
              <p className="text-[11px] text-outline mt-1">TB_BUS_RESERVATION · CUSTOMER_PAY_WAIT/CONFIRM. 선택 시 대화방이 준비됩니다.</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 max-h-[26.5rem]">
              {loadingPartners && (
                <div className="flex items-center gap-2 text-outline text-sm py-6 justify-center">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  불러오는 중…
                </div>
              )}
              {!loadingPartners && partners.length === 0 && (
                <p className="text-xs text-outline text-center py-8 px-2">대화 가능한 예약이 없습니다</p>
              )}
              {!loadingPartners &&
                partners.map((p) => {
                  const lineTitle = `${p.tripTitle || '제목 없음'} (${p.travelerName || '여행자'})`;
                  const lineStart = `${p.startAddr || ''}. ${formatYmdHm(p.startDt)}`.trim();
                  const lineEnd = `${p.endAddr || ''}. ${formatYmdHm(p.endDt)}`.trim();
                  const active = p.reqId === reqId && p.resId === resId;
                  return (
                    <button
                      key={`${p.reqId}-${p.resId}`}
                      type="button"
                      onClick={() => {
                        setReqId(p.reqId);
                        setResId(p.resId);
                      }}
                      className={`w-full text-left p-4 mb-2 rounded-2xl flex gap-3 cursor-pointer transition-all duration-300 ${
                        active
                          ? 'bg-surface-container-lowest shadow-[0_8px_24px_-8px_rgba(0,104,95,0.12)]'
                          : 'hover:bg-white/50'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary text-lg" aria-hidden>
                          💬
                        </div>
                        {active && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface-container-lowest" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="font-bold text-xs leading-snug text-on-surface line-clamp-2">{lineTitle}</div>
                        <div className="text-[10px] text-on-surface-variant leading-snug break-words">{lineStart}</div>
                        <div className="text-[10px] text-on-surface-variant leading-snug break-words">{lineEnd}</div>
                        <p className="text-[10px] text-outline font-medium pt-0.5">
                          {p.travelerName} / {p.driverName} · {p.dataStat}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </aside>

          <section className="flex-1 flex flex-col bg-background relative min-h-0 min-w-0">
            {error && (
              <div className="shrink-0 px-4 py-2 text-xs text-red-600 font-medium border-b border-red-100 bg-red-50/80">
                {error}
              </div>
            )}
            {reqId && resId && (
              <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-outline-variant/10 bg-surface-container-lowest/50">
                <div
                  className="w-12 h-12 rounded-xl bg-primary-container/15 flex items-center justify-center text-2xl shrink-0"
                  aria-hidden
                >
                  {roomMeta.chatCoverFileId ? '🖼️' : '💬'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-on-surface truncate">
                    {(roomMeta.chatTitle || selectedPartner?.tripTitle || '대화').trim()}
                  </h3>
                  <p className="text-[10px] text-outline truncate">
                    {selectedPartner
                      ? `${selectedPartner.travelerName} · ${selectedPartner.driverName}`
                      : ''}
                  </p>
                </div>
              </div>
            )}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-36"
            >
              {(!reqId || !resId) && partners.length > 0 && (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-outline text-sm text-center px-4">
                  <span className="material-symbols-outlined text-4xl mb-3 opacity-40">chat</span>
                  왼쪽 목록에서 견적을 선택하면 여행자와 채팅할 수 있습니다.
                </div>
              )}

              {reqId && resId && loadingMessages && (
                <div className="flex justify-center text-outline text-sm gap-2">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  불러오는 중…
                </div>
              )}

              {reqId &&
                resId &&
                !loadingMessages &&
                messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[160px] text-outline text-sm text-center px-4">
                    이전 대화가 없습니다. 메시지를 입력해 대화를 시작하세요.
                  </div>
                )}

              {reqId &&
                resId &&
                !loadingMessages &&
                timeline.map((node) => {
                  if (node.kind === 'sep') {
                    return (
                      <div key={node.key} className="flex justify-center">
                        <span className="px-4 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-outline tracking-wider uppercase">
                          {formatDateSeparatorLabel(node.regDt)}
                        </span>
                      </div>
                    );
                  }

                  const m = node.m;
                  const timeLabel = formatTimeKorean(m.regDt);

                  if (m.msgKind === 'SYSTEM' || m.senderRole === 'SYSTEM') {
                    return (
                      <div key={node.key} className="flex justify-center">
                        <div className="bg-primary-container/5 px-6 py-2 rounded-xl border border-primary-container/10 flex items-center gap-3">
                          <span className="material-symbols-outlined text-primary text-sm" data-icon="verified">
                            verified
                          </span>
                          <span className="text-xs font-bold text-primary">{m.msgBody}</span>
                        </div>
                      </div>
                    );
                  }

                  if (m.msgKind === 'IMAGE') {
                    const urls = parseImageUrls(m.msgBody);
                    const u1 = urls[0] || IMG_ATTACH_1;
                    const u2 = urls[1] || IMG_ATTACH_2;
                    return (
                      <div key={node.key} className="flex gap-4 items-start max-w-[80%]">
                        <div className="w-8 h-8 rounded-full opacity-0 flex-shrink-0" />
                        <div className="grid grid-cols-2 gap-2 w-[400px]">
                          <img className="w-full h-40 object-cover rounded-xl" alt="" src={u1} />
                          <img className="w-full h-40 object-cover rounded-xl" alt="" src={u2} />
                        </div>
                      </div>
                    );
                  }

                  if (m.msgKind === 'FILE') {
                    return (
                      <div key={node.key} className="flex flex-row-reverse gap-4 items-start ml-auto max-w-[80%]">
                        <div className="w-[300px] p-4 bg-white rounded-2xl shadow-sm flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
                            <span className="material-symbols-outlined" data-icon="description">
                              description
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{m.msgBody || '첨부 파일'}</div>
                            <div className="text-[10px] text-outline">파일</div>
                          </div>
                          <button type="button" className="text-outline hover:text-primary">
                            <span className="material-symbols-outlined" data-icon="download">
                              download
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isDriver = m.senderRole === 'DRIVER';

                  if (isDriver) {
                    return (
                      <div key={node.key} className="flex flex-row-reverse gap-4 items-end ml-auto max-w-[80%]">
                        <div className="flex flex-col gap-2 items-end">
                          <div className="bg-primary-container text-white p-4 rounded-2xl rounded-br-none shadow-md">
                            <p className="text-sm font-medium leading-relaxed">{m.msgBody}</p>
                          </div>
                          <span className="text-[10px] text-outline mr-1">{timeLabel}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={node.key} className="flex gap-4 items-end max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        <img className="w-full h-full object-cover" alt="" src={IMG_AVATAR_RECEIVED} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="bg-surface-container-lowest p-4 rounded-2xl rounded-bl-none shadow-sm">
                          <p className="text-sm font-medium leading-relaxed">{m.msgBody}</p>
                        </div>
                        <span className="text-[10px] text-outline ml-1">{timeLabel}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-8 absolute bottom-0 left-0 right-0 w-full">
              <div className="glass-nav rounded-full px-6 py-3 flex items-center gap-4 shadow-[0_10px_30px_-10px_rgba(0,104,95,0.15)] ring-1 ring-white/50">
                <button type="button" className="text-outline hover:text-teal-600">
                  <span className="material-symbols-outlined" data-icon="add_circle">
                    add_circle
                  </span>
                </button>
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-outline/60"
                  placeholder="메시지를 입력하세요..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!reqId || !resId || sending || partners.length === 0}
                />
                <div className="flex items-center gap-4">
                  <button type="button" className="text-outline hover:text-teal-600">
                    <span className="material-symbols-outlined" data-icon="mood">
                      mood
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!reqId || !resId || sending || partners.length === 0}
                    onClick={handleSend}
                    className="bg-gradient-to-tr from-primary to-primary-container w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined" data-icon="send">
                      send
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommonLiveChat;
