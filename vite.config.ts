import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['cscheckin.pagekite.me', 'localhost'],
    hmr: {
      port: 3001,
      host: 'localhost'
    },
    // PageKite를 통한 접근 허용
    cors: true
  },
  build: {
    sourcemap: false,
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['cscheckin.pagekite.me', 'localhost']
  }
}) 