import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#142638',
        navy: '#102A43',
        ivory: '#F7F4ED',
        paper: '#FFFDFC',
        sakura: '#C95362',
        sage: '#547663',
        gold: '#B58B3A',
        mist: '#E7E2D8',
        slatecopy: '#667583'
      },
      boxShadow: {
        premium: '0 18px 50px rgba(16, 42, 67, 0.08)',
        lift: '0 10px 28px rgba(16, 42, 67, 0.10)'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        jp: ['var(--font-noto-jp)', 'Yu Gothic', 'Hiragino Sans', 'sans-serif'],
        bn: ['var(--font-bn)', 'Noto Sans Bengali', 'sans-serif']
      }
    },
  },
  plugins: [],
};
export default config;
