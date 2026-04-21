const API_BASE_URL = '/api';

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
    // [교정] 실제 서버 라우터(appCustomer.js)의 경로와 일치시킵니다.
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

// --- 회원가입 인증 관련 ---

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
