/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004d40',
        secondary: '#00897b',
        background: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
