import type { Config } from 'tailwindcss';

/**
 * Semantic color tokens map to CSS variables defined in globals.css.
 * The variables are re-themed by `[data-theme="light"|"dark"]` on the app root.
 * Casino surfaces intentionally ignore these and use fixed dark-neon values.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        't80': 'var(--t80)',
        't55': 'var(--t55)',
        't45': 'var(--t45)',
        't35': 'var(--t35)',
        border: 'var(--border)',
        dash: 'var(--dash)',
        accent: 'var(--accent)',
        btntext: 'var(--btntext)',
        'acc-soft': 'var(--acc-soft)',
        'acc-border': 'var(--acc-border)',
        track: 'var(--track)',
        gold: 'var(--gold)',
        'gold-border': 'var(--gold-border)',
        good: 'var(--good)',
        'good-soft': 'var(--good-soft)',
        bad: 'var(--bad)',
        'bad-soft': 'var(--bad-soft)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      backgroundImage: {
        grad: 'var(--grad)',
        'gold-bg': 'var(--gold-bg)',
        glow: 'var(--glow)',
        ph: 'var(--ph)',
      },
      keyframes: {
        'klr-fall': {
          '0%': { transform: 'translateY(-30px) rotate(0deg)', opacity: '0' },
          '12%': { opacity: '1' },
          '100%': { transform: 'translateY(230px) rotate(220deg)', opacity: '0' },
        },
        'klr-pop': {
          '0%': { transform: 'scale(.5)' },
          '60%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        'klr-pulse': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
        'klr-flip': { '0%': { transform: 'rotateY(0deg)' }, '100%': { transform: 'rotateY(360deg)' } },
        'klr-neon': {
          '0%,100%': { opacity: '1', filter: 'drop-shadow(0 0 14px rgba(200,106,245,.8))' },
          '50%': { opacity: '.86', filter: 'drop-shadow(0 0 26px rgba(200,106,245,1))' },
        },
      },
      animation: {
        'klr-fall': 'klr-fall 2.2s linear infinite',
        'klr-pop': 'klr-pop .5s ease-out',
        'klr-pulse': 'klr-pulse 1s infinite',
        'klr-flip': 'klr-flip 6s ease-in-out infinite',
        'klr-neon': 'klr-neon 2.4s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
