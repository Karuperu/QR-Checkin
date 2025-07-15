import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// QR 생성 페이지용 Vite 설정
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    open: '/qr_generator'
  },
  base: '/'
}) 