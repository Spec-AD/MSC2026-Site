/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 核心全局无衬线字体链：英文 (Nunito) -> 中文 (花园明朝) -> 日文 (M PLUS) -> 现代系统后备
        sans: [
          'Nunito', 
          'HuaYuanMincho', 
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
          'HuaYuanMincho', // 确保代码块或数字环境中的汉字使用你的字体
          'MPLUS1p', 
          'monospace'
        ],
        
        // 保留你原本的 maimai 别名，映射到新的字体链上，防止以前使用了 font-maimai 的页面崩版
        maimai: [
          'Nunito', 
          'HuaYuanMincho', 
          'MPLUS1p', 
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
}