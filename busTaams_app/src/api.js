const API_BASE_URL = '/api';

// 공통 fetch 래퍼 (내부용)
const request = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || '요청 처리에 실패했습니다.');
    }
    return data;
};

export const getDashboardStats = () => request('/app/customer/dashboard');
export const getPendingRequestsFiltered = (type) => request(`/app/customer/pending-requests?type=${type}`);

// 기존 명명된 내보내기 유지...
export const login = async (userId, password) => {
  const response = await fetch(`${API_BASE_URL}/app/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '로그인에 실패했습니다.');
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getCustomerProfile = async () => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/customer/profile`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || '프로필 정보를 가져오는 데 실패했습니다.');
    }
    return data;
};

export const updateCustomerProfile = async (data) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/customer/profile/update`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.error || '수정 실패');
    return resJson;
};

export const uploadProfileImage = async (file) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('profileImage', file);

    const response = await fetch(`${API_BASE_URL}/app/customer/profile/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.error || '업로드 실패');
    return resJson;
};

export const changePassword = async (currentPassword, newPassword) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/customer/profile/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.message || '비밀번호 변경 실패');
    return resJson;
};

export const sendVerificationCode = async (phone) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/customer/auth/send-code`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone })
    });
    return await response.json();
};

export const verifyCode = async (code) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/customer/auth/verify-code`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
    });
    return await response.json();
};

export const findId = async (phoneNo) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/find-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNo })
    });
    return await response.json();
};

export const findPassword = async (userId, phoneNo) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/find-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phoneNo })
    });
    return await response.json();
};

export const checkIdDuplicate = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/check-id?userId=${userId}`);
    return await response.json();
};

export const checkEmailDuplicate = async (email) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/check-email?email=${email}`);
    return await response.json();
};

export const checkPhoneDuplicate = async (phoneNo) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/check-phone?phoneNo=${phoneNo}`);
    return await response.json();
};

export const sendAuthCode = async (phoneNo) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNo })
    });
    return await response.json();
};

export const verifyAuthCode = async (phoneNo, code) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNo, code })
    });
    return await response.json();
};

export const registerUser = async (data) => {
    const response = await fetch(`${API_BASE_URL}/app/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
};

// api.get() 같은 형식을 지원하기 위한 기본 내보내기
const api = {
    get: (url) => request(url, { method: 'GET' }),
    post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) })
};

export default api;
