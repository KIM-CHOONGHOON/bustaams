import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../api';

/**
 * 사용자 프로필 아바타를 공통으로 렌더링하는 컴포넌트입니다.
 * 이미지 로딩 실패 시, 회색 사람 아이콘(account_circle)으로 안전하게 대체됩니다.
 * 
 * @param {string|null} profileImage - GCS 또는 외부 프로필 이미지 경로
 * @param {number|string} imageVersion - 이미지 캐시 방지용 버전 번호
 * @param {string} className - 아바타 컨테이너의 CSS 클래스
 * @param {function} onClick - 클릭 핸들러
 */
const Avatar = ({ profileImage, imageVersion, className = '', onClick }) => {
    const [imageLoadError, setImageLoadError] = useState(false);

    // 프로필 이미지가 새로 설정되거나 변경되면 에러 상태를 초기화합니다.
    useEffect(() => {
        setImageLoadError(false);
    }, [profileImage]);

    // 기본 스타일 클래스 (대시보드 상단 헤더 아바타 디자인 기준)
    const defaultClassName = "w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors";
    const containerClass = className || defaultClassName;

    return (
        <div 
            className={containerClass} 
            onClick={onClick}
        >
            {profileImage && !imageLoadError ? (
                <img 
                    key={`${profileImage}-${imageVersion}`}
                    alt="Profile" 
                    src={getImageUrl(profileImage, imageVersion)} 
                    className="w-full h-full object-cover" 
                    onError={() => {
                        setImageLoadError(true);
                    }}
                />
            ) : (
                <span className="material-symbols-outlined text-slate-500 text-2xl flex items-center justify-center w-full h-full">
                    account_circle
                </span>
            )}
        </div>
    );
};

export default Avatar;
