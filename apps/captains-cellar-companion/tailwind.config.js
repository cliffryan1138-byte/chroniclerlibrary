/** @type {import('tailwindcss').Config} */
// Colors are CSS variables set from src/config/<app>/theme — no app palette lives here.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), ink: v('ink'), muted: v('muted'),
        accent: v('accent'), 'accent-ink': v('accent-ink'), line: v('line'), danger: v('danger'),
      },
      fontFamily: { display: ['var(--font-display)'], body: ['var(--font-body)'] },
    },
  },
  plugins: [],
}
