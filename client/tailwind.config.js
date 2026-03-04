/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 核心全局无衬线字体链：英文 (Quicksand) -> 中文 (思源黑体) -> 日文 (M PLUS) -> 现代系统后备
        sans: [
          'Quicksand', 
          'NotoSansSC', 
          'MPLUS1p', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          '"Helvetica Neue"', 
          'Arial', 
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
        
        // 等宽字体链：代码块、数字排版专用 (前置标准英文等宽字体，中日文作为后备)
        mono: [
          'ui-monospace', 
          'SFMono-Regular', 
          'Menlo', 
          'Monaco', 
          'Consolas', 
          '"Liberation Mono"', 
          '"Courier New"', 
          'NotoSansSC', 
          'MPLUS1p', 
          'monospace'
        ],
        
        // 兼容别名
        maimai: [
          'Quicksand', 
          'NotoSansSC', 
          'MPLUS1p', 
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
}