import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // 기존 프로젝트와 포트 충돌 방지
    open: true
  }
}) 