import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005BAE',
          50: '#E6F0FA',
          100: '#CCE1F5',
          200: '#99C3EB',
          300: '#66A5E1',
          400: '#3387D7',
          500: '#005BAE',
          600: '#00488B',
          700: '#003668',
          800: '#002345',
          900: '#001122',
        },
        action: {
          DEFAULT: '#6B8E23',
          50: '#F2F5E8',
          100: '#E5EBD1',
          200: '#CBD7A3',
          300: '#B1C375',
          400: '#97AF47',
          500: '#6B8E23',
          600: '#55711C',
          700: '#405515',
          800: '#2A380E',
          900: '#151C07',
        },
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}

export default config
