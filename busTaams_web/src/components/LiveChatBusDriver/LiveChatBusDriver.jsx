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

function formatListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
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
 * LiveChatBusDriver — `downloads/.../LiveChat.html` 중앙 section(대화 헤더 제외) 구조·클래스 유지
 * REST: /api/live-chat-bus-driver — `driverId`, `reqId`, `resId`; 메시지 `histSeq`
 */
const LiveChatBusDriver = ({ open, onClose, driverId, driverUuid, initialReqId, initialResId }) => {
  const driverSession =
    (driverId != null && String(driverId).trim()) || (driverUuid != null && String(driverUuid).trim()) || '';
  const [partners, setPartners] = useState([]);
  const [reqId, setReqId] = useState('');
  const [resId, setResId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const fetchPartners = useCallback(async () => {
    if (!driverSession) return;
    setLoadingPartners(true);
    setError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/live-chat-bus-driver/chat-partners?driverId=${encodeURIComponent(driverSession)}`
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

  const fetchMessages = useCallback(async () => {
    if (!driverSession || !reqId || !resId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    setError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/live-chat-bus-driver/messages?driverId=${encodeURIComponent(driverSession)}&reqId=${encodeURIComponent(reqId)}&resId=${encodeURIComponent(resId)}`
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessages([]);
        setError(data.error || `메시지 조회 오류 (${r.status})`);
        return;
      }
      setMessages(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || '네트워크 오류');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [driverSession, reqId, resId]);

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
      return;
    }
    setMessages([]);
  }, [reqId]);

  useEffect(() => {
    if (!open || !reqId || !resId) return;
    fetchMessages();
  }, [open, reqId, resId, fetchMessages]);

  useEffect(() => {
    if (!open || !driverSession || !reqId || !resId) return;
    const id = window.setInterval(fetchMessages, 5000);
    return () => window.clearInterval(id);
  }, [open, driverSession, reqId, resId, fetchMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !driverSession || !reqId || !resId || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/live-chat-bus-driver/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driverSession, reqId, resId, msgBody: text }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || `전송 실패 (${r.status})`);
        return;
      }
      setInput('');
      await fetchMessages();
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
              <h2 className="text-xl font-extrabold font-headline tracking-tighter text-on-surface">견적 목록</h2>
              <p className="text-[11px] text-outline mt-1">최대 5건 높이까지 보이며, 그 이상은 스크롤합니다.</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 max-h-[26.5rem]">
              {loadingPartners && (
                <div className="flex items-center gap-2 text-outline text-sm py-6 justify-center">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  불러오는 중…
                </div>
              )}
              {!loadingPartners && partners.length === 0 && (
                <p className="text-xs text-outline text-center py-8 px-2">채팅 가능한 견적이 없습니다</p>
              )}
              {!loadingPartners &&
                partners.map((p) => {
                  const title =
                    (p.tripTitle || `${p.startAddr || ''} ↔ ${p.endAddr || ''}`).trim() || '견적';
                  const active = p.reqId === reqId && p.resId === resId;
                  return (
                    <button
                      key={`${p.reqId}-${p.resId}`}
                      type="button"
                      onClick={() => {
                        setReqId(p.reqId);
                        setResId(p.resId);
                      }}
                      className={`w-full text-left p-4 mb-2 rounded-2xl flex gap-4 cursor-pointer transition-all duration-300 ${
                        active
                          ? 'bg-surface-container-lowest shadow-[0_8px_24px_-8px_rgba(0,104,95,0.12)]'
                          : 'hover:bg-white/50'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">directions_bus</span>
                        </div>
                        {active && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface-container-lowest" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1 gap-2">
                          <span className="font-bold text-sm truncate">{title}</span>
                          <span className="text-[10px] text-outline font-semibold shrink-0 tabular-nums">
                            {formatListTime(p.startDt)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium truncate">
                          {p.travelerName} · {p.dataStat}
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

export default LiveChatBusDriver;
