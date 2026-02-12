/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 这里顺便帮你定义好中文字体栈
        sans: ['"Noto Sans SC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}