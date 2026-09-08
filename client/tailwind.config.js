/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          300: '#8eb6ff',
          400: '#598eff',
          500: '#3366f2',
          600: '#2049d6',
          700: '#1a3aad',
          800: '#1a338a',
          900: '#1b306e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.05)',
        page: '0 1px 3px rgba(16, 24, 40, 0.08), 0 8px 24px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
