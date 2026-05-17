import Swal from 'sweetalert2';

/**
 * busTaams 전용 프리미엄 알림 시스템
 */

// 공통 스타일 클래스 정의
const customClass = {
    container: 'bustaams-toast-container',
    popup: 'bustaams-toast-popup',
    title: 'bustaams-toast-title',
    icon: 'bustaams-toast-icon',
    confirmButton: 'bustaams-confirm-btn',
    cancelButton: 'bustaams-cancel-btn',
    footer: 'bustaams-toast-footer'
};

// 1. Toast (우측 하단/상단 작은 알림)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#191c1d',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    customClass: {
        popup: 'bustaams-glass-toast shadow-lg rounded-2xl border border-surface-container-highest',
        title: 'text-sm font-headline font-bold',
    }
});

// 2. Alert (중앙 모달)
const modalAlert = (options) => {
    return Swal.fire({
        background: '#ffffff',
        color: '#191c1d',
        confirmButtonColor: '#00685f', // primary-container color
        cancelButtonColor: '#ba1a1a', // error color
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl border-none shadow-2xl p-8',
            title: 'font-headline font-extrabold text-2xl tracking-tight text-on-surface',
            htmlContainer: 'font-body text-on-surface-variant text-base mt-4',
            confirmButton: 'bg-primary text-white font-headline font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all mx-2',
            cancelButton: 'bg-surface-container-high text-on-surface-variant font-headline font-bold py-3 px-8 rounded-full hover:bg-surface-container-highest transition-all mx-2',
            actions: 'mt-8'
        },
        ...options
    });
};

export const notify = {
    // 성공 알림 (중앙 모달) - 확인 버튼 추가 및 타이머 제거 (사용자 확인 유도)
    success: (title, text = '') => {
        return modalAlert({
            icon: 'success',
            title: title,
            text: text,
            iconColor: '#00685f',
            showConfirmButton: true,
            confirmButtonText: '확인'
        });
    },
    
    // 에러 알림 (중앙 모달)
    error: (title, text = '') => {
        return modalAlert({
            icon: 'error',
            title: title,
            text: text,
            iconColor: '#ba1a1a',
            showConfirmButton: true,
            confirmButtonText: '확인'
        });
    },

    // 경고 알림 (중앙 모달)
    warn: (title, text = '') => {
        return modalAlert({
            icon: 'warning',
            title: title,
            text: text,
            iconColor: '#9d4300',
            showConfirmButton: true,
            confirmButtonText: '확인'
        });
    },

    // 정보 알림 (중앙 모달)
    info: (title, text = '') => {
        return modalAlert({
            icon: 'info',
            title: title,
            text: text,
            iconColor: '#004e47',
            showConfirmButton: true,
            confirmButtonText: '확인'
        });
    },

    // 질문/확인 모달 (Confirm)
    confirm: async (title, text = '', confirmButtonText = '확인', cancelButtonText = '취소') => {
        const result = await modalAlert({
            title,
            text,
            icon: 'question',
            iconColor: '#004e47',
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText,
        });
        return result.isConfirmed;
    }
};
