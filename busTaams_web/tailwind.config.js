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
        primary: '#004e47', 
        'primary-container': '#00685f',
        secondary: '#9d4300', 
        'secondary-container': '#ff8d4b',
        'tertiary': '#6e341d',
        'tertiary-container': '#8b4b32',
        surface: '#f7f9fb',
        'surface-bright': '#f7f9fb',
        'surface-dim': '#d8dadc',
        'surface-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6', 
        'surface-container-high': '#e6e8ea', 
        'surface-container-highest': '#e0e3e5',
        'outline': '#6e7977',
        'outline-variant': '#bec9c6',
        'primary-fixed': '#a1f1e5',
        'primary-fixed-dim': '#85d5c9',
        'secondary-fixed': '#ffdbca',
        'tertiary-fixed': '#ffdbcf',
        'error': '#ba1a1a',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-surface': '#191c1e',
        'on-surface-variant': '#3e4947',
        kakao: "#FEE500",
        naver: "#03C75A",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Manrope', 'Pretendard', 'sans-serif'],
        label: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        md: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
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
