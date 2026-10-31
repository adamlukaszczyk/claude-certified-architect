import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        edge: 'var(--color-edge)',
        cta: 'var(--color-cta)',
      },
      fontFamily: {
        display: ['Monument Extended', 'sans-serif'],
        body: ['Geist', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
