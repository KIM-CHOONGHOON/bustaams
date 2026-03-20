/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00685f', 
        'primary-container': '#008378',
        secondary: '#9d4300', 
        'secondary-container': '#fd761a',
        surface: '#f7f9fb',
        'surface-lowest': '#ffffff',
        'surface-container-low': '#f0f3f6', 
        'surface-container-high': '#e3e8ee', 
        'surface-dim': '#d2d8df',
        'outline-variant': '#738089',
        kakao: "#FEE500",
        naver: "#03C75A",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Pretendard', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px'
      },
      boxShadow: {
        ambient: '0 12px 40px rgba(0, 104, 95, 0.06)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
