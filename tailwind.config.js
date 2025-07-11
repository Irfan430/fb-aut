/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'game': ['Arial', 'sans-serif']
      },
      colors: {
        'game-primary': '#ff6b35',
        'game-secondary': '#f7931e',
        'game-dark': '#1a1a1a'
      }
    },
  },
  plugins: [],
}