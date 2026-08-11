/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f14',
        surface: '#121820',
        elevated: '#1a222d',
        border: '#273140',
        fg: '#e8eef6',
        muted: '#8b9bb0',
        primary: {
          DEFAULT: '#14b8a6',
          dim: '#0d9488',
          soft: 'rgba(20, 184, 166, 0.12)',
        },
        danger: '#f87171',
        warn: '#fbbf24',
        success: '#34d399',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
