/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,ts,js,sass}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        'tile-s': '500px',
        'tile-m': '1000px',
        'tile-l': '1500px',
      }
    },
  },
  plugins: [],
}

