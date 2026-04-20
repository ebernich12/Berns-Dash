import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#000000',
        panel:   '#0a0a0f',
        card:    '#111118',
        border:  '#1e1e2a',
        muted:   '#60607a',
        dim:     '#9898b2',
        text:    '#f5f5f7',
        accent:  '#0a84ff',
        green:   '#30d158',
        red:     '#ff453a',
        yellow:  '#ffd60a',
        blue:    '#0a84ff',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
    },
  },
  plugins: [],
}

export default config
