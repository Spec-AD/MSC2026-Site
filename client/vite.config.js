import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
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
=======
  // 🔥 新增 server 代理配置
  server: {
    proxy: {
      // 当你请求以 /proxy/diving-fish 开头的接口时，Vite 会拦截它
      '/proxy/diving-fish': {
        target: 'https://www.diving-fish.com/api/maimaidxprober', // 目标水鱼服务器
        changeOrigin: true, // 开启代理，允许跨域
        rewrite: (path) => path.replace(/^\/proxy\/diving-fish/, '') // 把前缀重写掉
>>>>>>> e56fccf0a8d274e3e32451f60dda3b05c8c75016
      }
    }
  }
})