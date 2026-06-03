from PIL import Image
import os

# 원본 1024x1024 이미지 경로
src_path = r"C:\Users\LG\.gemini\antigravity-ide\brain\be721424-1e41-42f5-88d5-b7dfb8750e95\feature_graphic_widescreen_1780528940438.png"
# 출력할 1024x500 이미지 경로
out_path = r"c:\Users\LG\AI자동화\project_bustaams\feature-graphic.png"

if os.path.exists(src_path):
    img = Image.open(src_path)
    width, height = img.size
    print(f"Original image size: {width}x{height}")
    
    # 1024x1024에서 세로 중앙을 기준으로 500px 만큼 크롭 (가로는 1024 전체 유지)
    left = 0
    top = (height - 500) // 2
    right = width
    bottom = top + 500
    
    cropped_img = img.crop((left, top, right, bottom))
    # 1024x500 크기가 확실한지 보증
    cropped_img = cropped_img.resize((1024, 500), Image.Resampling.LANCZOS)
    cropped_img.save(out_path, "PNG")
    print(f"SUCCESS: Cropped and resized image to {cropped_img.size[0]}x{cropped_img.size[1]} saved to {out_path}!")
else:
    print("ERROR: Source image not found!")
