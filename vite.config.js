import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Адрес бэкенда. По умолчанию — сервер, запущенный командой uvicorn.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Все запросы сайта на /api/... пересылаются бэкенду (без /api).
    // Пример: /api/numbers  →  http://127.0.0.1:8000/numbers
    // Так браузер думает, что сайт и API — один сервер, и не ругается на CORS.
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
