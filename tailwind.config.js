/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          50: '#faf8f6',
          100: '#f5f1ec',
          200: '#e8ddd1',
          300: '#d9c5b0',
          400: '#c8a888',
          500: '#a0845c',
          600: '#8B4513',
          700: '#6d3510',
          800: '#4d250e',
          900: '#2d1509',
        },
      },
    },
  },
  plugins: [],
}
