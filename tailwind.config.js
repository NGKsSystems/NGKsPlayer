/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#121420',
          accent: '#7b61ff',
          soft: '#1b1f2e',
          warn: '#ffb020',
          danger: '#ff4d4f',
          ok: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};
