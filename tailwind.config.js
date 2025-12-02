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
        background: '#0a0a0a',
        surface: '#121212',
        primary: '#00e676', // Neon Green
        secondary: '#2979ff', // Neon Blue
        danger: '#ff1744', // Neon Red
        text: '#e0e0e0',
        muted: '#a0a0a0',
        border: '#333333',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
