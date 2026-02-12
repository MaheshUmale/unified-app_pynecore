/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tv: {
          bg: '#131722',
          grid: '#2B2B43',
          border: '#2B2B43',
          text: '#D1D4DC',
        }
      }
    },
  },
  plugins: [],
}
