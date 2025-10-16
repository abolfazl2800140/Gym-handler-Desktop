/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        vazirmatn: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        // پالت ورزشی پرانرژی
        primary: {
          DEFAULT: '#fb8c00', // نارنجی پرانرژی
          dark: '#ef6c00',
        },
        accent: {
          DEFAULT: '#00e676', // سبز نئونی
          dark: '#00c853',
        },
        info: {
          DEFAULT: '#26c6da', // آبی فیروزه‌ای
          dark: '#00acc1',
        },
        surface: '#0b1324', // خاکستری/آبی بسیار تیره برای پس‌زمینه
        muted: '#1a2338',
        outline: '#ffffff22',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}