import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🔥 新增 server 代理配置
  server: {
    proxy: {
      // 当你请求以 /proxy/diving-fish 开头的接口时，Vite 会拦截它
      '/proxy/diving-fish': {
        target: 'https://www.diving-fish.com/api/maimaidxprober', // 目标水鱼服务器
        changeOrigin: true, // 开启代理，允许跨域
        rewrite: (path) => path.replace(/^\/proxy\/diving-fish/, '') // 把前缀重写掉
      }
    }
  }
})