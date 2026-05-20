import React, { useState } from 'react';
import './FindAccountModal.css';

const FindAccountModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('findId'); // 'findId' | 'findPw'
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Find ID states
  const [idName, setIdName] = useState('');
  const [idPhone, setIdPhone] = useState('');
  const [foundId, setFoundId] = useState('');

  // Find PW states
  const [pwId, setPwId] = useState('');
  const [pwEmail, setPwEmail] = useState('');
  const [pwPhone, setPwPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedCustId, setVerifiedCustId] = useState('');

  // Reset PW states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

  const handleFindId = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    setFoundId('');

    try {
      const response = await fetch(`${API_BASE}/api/app/auth/find-id-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: idName, phoneNo: idPhone }),
      });
      const data = await response.json();
      if (response.ok) {
        setFoundId(data.userId);
      } else {
        setMessage({ text: data.error || '정보를 찾을 수 없습니다.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '서버 연결에 실패했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForPw = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_BASE}/api/app/auth/verify-for-password-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pwId, email: pwEmail, phoneNo: pwPhone }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsVerified(true);
        setVerifiedCustId(data.custId);
      } else {
        setMessage({ text: data.error || '정보가 일치하지 않습니다.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '서버 연결에 실패했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: '비밀번호가 일치하지 않습니다.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/app/auth/reset-password-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custId: verifiedCustId, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.');
        onClose();
      } else {
        setMessage({ text: data.error || '변경에 실패했습니다.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '서버 연결에 실패했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="find-account-modal-overlay">
      <div className="find-account-modal-content animate-in zoom-in-95 duration-200">
        <button className="find-account-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="find-account-header">
          <h2>계정 정보 찾기</h2>
          <p>분실하신 정보를 본인 확인을 통해 찾아드립니다.</p>
        </div>

        {!isVerified ? (
          <>
            <div className="find-account-tabs">
              <button 
                className={activeTab === 'findId' ? 'active' : ''} 
                onClick={() => { setActiveTab('findId'); setMessage({text:'', type:''}); }}
              >
                아이디 찾기
              </button>
              <button 
                className={activeTab === 'findPw' ? 'active' : ''} 
                onClick={() => { setActiveTab('findPw'); setMessage({text:'', type:''}); }}
              >
                비밀번호 찾기
              </button>
            </div>

            <div className="find-account-body">
              {activeTab === 'findId' ? (
                <form onSubmit={handleFindId}>
                  <div className="input-group">
                    <label>이름</label>
                    <input 
                      type="text" 
                      placeholder="이름을 입력하세요" 
                      value={idName} 
                      onChange={(e) => setIdName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>휴대폰 번호</label>
                    <input 
                      type="tel" 
                      placeholder="'-' 없이 입력" 
                      value={idPhone} 
                      onChange={(e) => setIdPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" disabled={isLoading} className="submit-btn">
                    {isLoading ? '조회 중...' : '아이디 찾기'}
                  </button>
                  {foundId && (
                    <div className="result-box success">
                      회원님의 아이디는 <strong>{foundId}</strong> 입니다.
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyForPw}>
                  <div className="input-group">
                    <label>아이디</label>
                    <input 
                      type="text" 
                      placeholder="아이디를 입력하세요" 
                      value={pwId} 
                      onChange={(e) => setPwId(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>이메일</label>
                    <input 
                      type="email" 
                      placeholder="가입 시 등록한 이메일" 
                      value={pwEmail} 
                      onChange={(e) => setPwEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>휴대폰 번호</label>
                    <input 
                      type="tel" 
                      placeholder="'-' 없이 입력" 
                      value={pwPhone} 
                      onChange={(e) => setPwPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" disabled={isLoading} className="submit-btn">
                    {isLoading ? '확인 중...' : '본인 확인'}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="find-account-body reset-pw">
            <h3 className="reset-title">비밀번호 재설정</h3>
            <p className="reset-desc">새로운 비밀번호를 입력해 주세요.</p>
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label>새 비밀번호</label>
                <input 
                  type="password" 
                  placeholder="8자 이상 조합" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>비밀번호 확인</label>
                <input 
                  type="password" 
                  placeholder="비밀번호 재입력" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={isLoading} className="submit-btn reset">
                {isLoading ? '변경 중...' : '비밀번호 변경 완료'}
              </button>
            </form>
          </div>
        )}

        {message.text && (
          <div className={`message-box ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindAccountModal;
