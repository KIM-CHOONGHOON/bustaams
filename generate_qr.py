import qrcode

# QR코드에 담을 새로운 URL
target_url = "https://bustaams.cafe24.com/app"
# 교체 대상 이미지 파일 경로
dest_path = r"c:\Users\LG\AI자동화\project_bustaams\busTaams_app\public\assets\signup_qr.png"

# 고화질 QR코드 생성 설정
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
qr.add_data(target_url)
qr.make(fit=True)

# QR코드 이미지 생성 (스캔율이 가장 안정적인 흑백 구성)
img = qr.make_image(fill_color="black", back_color="white")
img.save(dest_path)

print(f"SUCCESS: New QR code pointing to '{target_url}' successfully generated and saved to {dest_path}!")
