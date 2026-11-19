import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/tts': {
        target: 'https://translate.google.com/translate_tts',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, ''),
        headers: {
          'Referer': 'https://translate.google.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api/tts': {
        target: 'https://translate.google.com/translate_tts',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, ''),
        headers: {
          'Referer': 'https://translate.google.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
})
