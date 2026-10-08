/** @type {import('tailwindcss').Config} */
// Colours are CSS variables from src/styles.scss (see DESIGN.md).
const v = n => `rgb(var(--${n}) / <alpha-value>)`;
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), raised: v('raised'), line: v('line'),
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), faint: v('ink-faint') },
        accent: { DEFAULT: v('accent'), hover: v('accent-hover'), ink: v('accent-ink') },
        up: v('up'), down: v('down'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: { '2xs': ['11px', '16px'] },
      borderRadius: { card: '10px' },
      maxWidth: { page: '1360px' },
    },
  },
  plugins: [],
};
