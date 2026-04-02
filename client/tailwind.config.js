/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 🔥 极其重要：这行代码接管了全站的深浅模式切换
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Quicksand', 'NotoSansSC', 'MPLUS1p', '-apple-system', 
          'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 
          'Arial', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'
        ],
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 
          'Consolas', '"Liberation Mono"', '"Courier New"', 'NotoSansSC', 
          'MPLUS1p', 'monospace'
        ],
        maimai: ['Quicksand', 'NotoSansSC', 'MPLUS1p', 'sans-serif'],
      }
    },
  },
  plugins: [],
}