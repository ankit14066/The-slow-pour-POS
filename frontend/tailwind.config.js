/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: {
          50:  '#fdf6f0',
          100: '#f5e6d3',
          200: '#e8c8a0',
          300: '#d4a26a',
          400: '#b8823c',
          500: '#8b5e1a',
          600: '#6b4510',
          700: '#4a2f0a',
          800: '#2d1c06',
          900: '#1a0f08',
          950: '#0d0703',
        },
        gold: {
          50:  '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#e8b923',
          500: '#c9a227',
          600: '#a67c15',
          700: '#845c0c',
          800: '#624108',
          900: '#452d04',
        },
        cream: {
          50:  '#ffffff',
          100: '#fdfaf5',
          200: '#f5ede0',
          300: '#ead8c0',
          400: '#d9bf9e',
          500: '#c4a07a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c9a227 0%, #e8b923 50%, #a67c15 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1a0f08 0%, #2d1c06 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
