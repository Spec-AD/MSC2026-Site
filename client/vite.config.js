import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/proxy/diving-fish': {
        target: 'https://www.diving-fish.com/api/maimaidxprober',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/diving-fish/, '')
      }
    }
  }
})