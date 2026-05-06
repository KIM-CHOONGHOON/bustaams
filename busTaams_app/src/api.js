const API_BASE_URL = '/api';

// 공통 fetch 래퍼
export const request = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        if (text.trim().startsWith('<!doctype html>') || text.trim().startsWith('<html')) {
            console.error(`[API] HTML Response for ${url}:`, text.substring(0, 200));
            throw new Error(`서버가 JSON 대신 HTML을 반환했습니다. API 서버가 실행 중인지, 혹은 경로가 올바른지 확인해주세요. (URL: ${url})`);
        }
        console.error(`[API] JSON Parse Error for ${url}:`, text);
        throw new Error(`서버 응답 형식이 올바르지 않습니다. (URL: ${url})`);
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || '요청 처리에 실패했습니다.');
    }
    return data;
};

// --- 대시보드 및 요청 ---
export const getDashboardStats = () => request('/app/customer/dashboard');
export const getPendingRequestsFiltered = (type) => request(`/app/customer/pending-requests?type=${type}`);

// --- 인증 (Auth) ---
export const login = (userId, password) => request('/app/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
});

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

// --- 고객 프로필 (Customer Profile) ---
export const getCustomerProfile = () => request('/app/customer/profile');

export const updateCustomerProfile = (data) => request('/app/customer/profile/update', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const uploadProfileImage = async (file) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('profileImage', file);

    // FormData를 보낼 때는 Content-Type 헤더를 직접 설정하지 않아야 함 (브라우저가 경계값과 함께 자동 설정)
    const response = await fetch(`${API_BASE_URL}/app/customer/profile/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const text = await response.text();
    let resJson;
    try {
        resJson = JSON.parse(text);
    } catch (e) {
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
    }
    if (!response.ok) throw new Error(resJson.error || '업로드 실패');
    return resJson;
};

export const changePassword = (currentPassword, newPassword) => request('/app/customer/profile/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
});

// --- 아이디/비밀번호 찾기 및 가입 ---
export const findId = (phoneNo) => request('/app/auth/find-id', {
    method: 'POST',
    body: JSON.stringify({ phoneNo })
});

export const findPassword = (userId, phoneNo) => request('/app/auth/find-password', {
    method: 'POST',
    body: JSON.stringify({ userId, phoneNo })
});

export const checkIdDuplicate = (userId) => request(`/app/auth/check-id?userId=${userId}`);
export const checkEmailDuplicate = (email) => request(`/app/auth/check-email?email=${email}`);
export const checkPhoneDuplicate = (phoneNo) => request(`/app/auth/check-phone?phoneNo=${phoneNo}`);

export const sendAuthCode = (phoneNo) => request('/app/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNo })
});

export const verifyAuthCode = (phoneNo, code) => request('/app/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNo, code })
});

export const registerUser = (data) => request('/app/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
});

// --- 기사 프로필 (Driver Profile) ---
export const getDriverProfile = () => request('/app/driver/profile');

export const updateDriverProfile = async (formData) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/driver/profile/update`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const text = await response.text();
    let resJson;
    try {
        resJson = JSON.parse(text);
    } catch (e) {
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
    }
    if (!response.ok) throw new Error(resJson.error || '수정 실패');
    return resJson;
};

export const getBusProfile = () => request('/app/driver/bus/profile');

export const updateBusProfile = async (formData) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/app/driver/bus/register`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const text = await response.text();
    let resJson;
    try {
        resJson = JSON.parse(text);
    } catch (e) {
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
    }
    if (!response.ok) throw new Error(resJson.error || '버스 등록 실패');
    return resJson;
};

// api.get() / api.post() 형식 지원
const api = {
    get: (url) => request(url, { method: 'GET' }),
    post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) })
};

export default api;
