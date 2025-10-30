import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    host: true,
    hmr: {
      overlay: false
    },
    cors: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api/crawl': {
        target: 'https://dailyshot.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/crawl/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      }
    }
  },
  build: {
    sourcemap: false, // 프로덕션에서는 소스맵 비활성화
    rollupOptions: {
      output: {
        manualChunks: {
          // 벤더 라이브러리들을 별도 청크로 분리
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          charts: ['recharts'],
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-color', '@tiptap/extension-image', '@tiptap/extension-link', '@tiptap/extension-text-align', '@tiptap/extension-text-style'],
          utils: ['date-fns', 'axios', 'cheerio'],
          database: ['@supabase/supabase-js'],
          state: ['zustand']
        }
      }
    },
    // 청크 크기 경고 임계값 설정
    chunkSizeWarningLimit: 1000,
    // 압축 최적화
    minify: 'esbuild'
  },
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
      'recharts',
      '@tiptap/react',
      '@tiptap/starter-kit'
    ]
  }
})
