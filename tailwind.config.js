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
        ink: {
          DEFAULT: '#0B1120', // deep navy ink
          muted: '#475569',
          dark: {
            DEFAULT: '#F8FAFC',
            muted: '#94A3B8',
          }
        },
        surface: {
          light: '#F8FAFC', // clean off-white
          dark: '#0B1120',  // deep navy dark surface
          card: '#FFFFFF',
          'card-dark': '#151E2E',
          elevated: '#FFFFFF',
          'elevated-dark': '#1E293B',
        },
        brand: {
          DEFAULT: '#2563EB', // blue accent
          hover: '#1D4ED8',
          subtle: '#EFF6FF',
          darkSubtle: '#1E3A8A',
        },
        severity: {
          low: {
            text: '#15803D',
            bg: '#DCFCE7',
            border: '#86EFAC',
            badge: '#16A34A',
          },
          moderate: {
            text: '#B45309',
            bg: '#FEF3C7',
            border: '#FCD34D',
            badge: '#D97706',
          },
          high: {
            text: '#C2410C',
            bg: '#FFEDD5',
            border: '#FDBA74',
            badge: '#EA580C',
          },
          critical: {
            text: '#B91C1C',
            bg: '#FEE2E2',
            border: '#FCA5A5',
            badge: '#DC2626',
          },
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
