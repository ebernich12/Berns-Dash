import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0c0c0e',
        panel:   '#111113',
        card:    '#18181b',
        border:  '#27272a',
        muted:   '#52525b',
        dim:     '#71717a',
        text:    '#d4d4d8',
        accent:  '#8b5cf6',
        green:   '#4ade80',
        red:     '#f87171',
        yellow:  '#fbbf24',
        blue:    '#60a5fa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
    },
  },
  plugins: [],
}

export default config
