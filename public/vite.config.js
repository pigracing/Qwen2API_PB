import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // 实际后端地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // 企业级配置扩展
        headers: {
          'X-Custom-Header': 'vue-proxy'
        }
      }
    }
  }
})
