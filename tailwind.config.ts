import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#0E0C1E',
        copper: '#C9A27A',
        'copper-dim': '#8E6E52',
        'near-white': '#F4EFE8',
        'warm-grey': '#9A948C',
        surface: '#161422',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
      },
      letterSpacing: {
        wordmark: '0.25em',
      },
    },
  },
  plugins: [],
};

export default config;
