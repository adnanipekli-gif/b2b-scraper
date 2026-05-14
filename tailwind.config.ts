import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1B3D4F',
        accent: '#00C4CC',
        highlight: '#D4006A',
        surface: '#14141e',
        border: '#1e1e2e',
      },
    },
  },
  plugins: [],
}

export default config
