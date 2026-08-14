import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/app/customer': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/app/driver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/app/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/app/common': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
