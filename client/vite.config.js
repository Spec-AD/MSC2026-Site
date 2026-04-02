import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. 新增：指向你本地 Node.js 后端的代理
      // 当你在前端调用 fetch('/api/register') 时，会转发到 localhost:3000
      '/api': {
        target: 'http://localhost:5000', // 👈 确认你的 server.js 监听的是 3000 端口
        changeOrigin: true,
        // 如果你的后端接口路径里没有 "/api" 前缀（例如是 app.post('/register')），
        // 请取消下面这一行的注释：
        // rewrite: (path) => path.replace(/^\/api/, '') 
      },

      // 2. 保留：原有的水鱼查分器代理
      '/proxy/diving-fish': {
        target: 'https://www.diving-fish.com/api/maimaidxprober',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/diving-fish/, '')
      }
    }
  }
})