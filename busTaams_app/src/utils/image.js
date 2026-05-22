/**
 * 브라우저 Canvas API를 사용하여 이미지 파일의 크기(해상도 및 용량)를 압축하는 유틸리티입니다.
 * 
 * @param {File} file - 압축할 원본 이미지 파일 객체
 * @param {number} maxWidth - 이미지의 최대 가로 너비 (기본값: 1200px)
 * @param {number} maxHeight - 이미지의 최대 세로 높이 (기본값: 1200px)
 * @param {number} quality - 이미지 압축 화질 (0.1 ~ 1.0, 기본값: 0.7)
 * @returns {Promise<File>} - 압축된 새 File 객체 (실패 시 원본 File 반환)
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        // 이미지 파일이 아니거나 브라우저 환경이 아닐 경우 원본 반환
        if (!file || !file.type.startsWith('image/') || typeof window === 'undefined') {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 비율을 유지하면서 maxWidth, maxHeight를 넘지 않도록 크기 계산
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Canvas 2D 컨텍스트 획득 실패 시 원본 반환
                    return resolve(file);
                }

                // Canvas에 이미지 그리기
                ctx.drawImage(img, 0, 0, width, height);

                // Blob으로 변환하여 새로운 File 객체 생성
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return resolve(file); // Blob 생성 실패 시 원본 반환
                    }
                    
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    
                    resolve(compressedFile);
                }, file.type, quality);
            };

            img.onerror = () => {
                resolve(file); // 이미지 로드 실패 시 원본 반환
            };
        };

        reader.onerror = () => {
            resolve(file); // 파일 읽기 실패 시 원본 반환
        };
    });
};
