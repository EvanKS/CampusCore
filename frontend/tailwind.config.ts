import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'hsl(246, 100%, 97%)',
          100: 'hsl(246, 93%, 93%)',
          200: 'hsl(246, 87%, 86%)',
          300: 'hsl(246, 83%, 76%)',
          400: 'hsl(246, 79%, 66%)',
          500: 'hsl(246, 75%, 58%)',
          600: 'hsl(246, 67%, 50%)',
          700: 'hsl(246, 63%, 42%)',
          800: 'hsl(246, 55%, 35%)',
          900: 'hsl(246, 48%, 28%)',
          950: 'hsl(246, 44%, 18%)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
