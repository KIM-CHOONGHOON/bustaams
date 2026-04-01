import React from 'react';

const PartnerDashboard = ({ currentUser, onLogout }) => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">제휴사/파트너 대시보드</h2>
      <p>환영합니다, {currentUser?.userName}님!</p>
      <button onClick={onLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">로그아웃</button>
    </div>
  );
};

export default PartnerDashboard;
