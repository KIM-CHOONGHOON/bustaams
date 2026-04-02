import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /** 5173이 이미 사용 중이면 다음 포트(5174…)로 넘어가지 않고 실패 → 포트 점유 프로세스를 종료하도록 유도 */
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
