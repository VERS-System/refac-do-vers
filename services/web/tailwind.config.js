/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vers: {
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#06b6d4',
          dark: '#0f172a',
          light: '#f8fafc',
        },
      },
    },
  },
  plugins: [],
};
