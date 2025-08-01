/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../*.{js,ts,jsx,tsx}", // ui 폴더의 컴포넌트도 포함
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 