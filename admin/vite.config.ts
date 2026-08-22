import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 职责:Vite 构建配置——dev 代理 API(本地 api 3000),产物 dist/(T21)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
