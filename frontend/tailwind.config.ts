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
          50: 'hsl(217, 91%, 97%)',
          100: 'hsl(217, 91%, 92%)',
          200: 'hsl(217, 88%, 84%)',
          300: 'hsl(217, 85%, 72%)',
          400: 'hsl(217, 82%, 60%)',
          500: 'hsl(217, 91%, 50%)',
          600: 'hsl(217, 91%, 42%)',
          700: 'hsl(220, 85%, 32%)',
          800: 'hsl(222, 80%, 24%)',
          900: 'hsl(222, 75%, 16%)',
          950: 'hsl(222, 70%, 10%)',
        },
        academic: {
          navy: '#0f172a',
          blue: '#1e3a8a',
          teal: '#0d9488',
          cyan: '#0284c7',
          amber: '#d97706',
          gold: '#b45309',
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
