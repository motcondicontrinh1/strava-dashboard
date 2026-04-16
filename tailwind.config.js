/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#0a0a0a',
        'void-2': '#0f0f0f',
        orange: {
          DEFAULT: '#FC4C02',
          hover: '#E64400',
        },
      },
      boxShadow: {
        brutalist: '4px 4px 0px 0px rgba(252, 76, 2, 0.3)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 8s ease-in-out infinite',
        'pulse-glow-delay': 'pulse-glow 8s ease-in-out infinite -4s',
        blink: 'blink 2s infinite',
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};
