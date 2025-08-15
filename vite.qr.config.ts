import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// QR 생성 페이지용 Vite 설정
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 3000,
    host: true,
    https: {
      key: undefined,
      cert: undefined
    },
    open: '/qr_generator'
  },
  base: '/'
}) 