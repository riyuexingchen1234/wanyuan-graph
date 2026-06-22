import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arco: {
          primary: '#165DFF',
          'primary-hover': '#4080FF',
          'primary-active': '#0E42D2',
        },
        ink: {
          1: '#1D2129',
          2: '#4E5969',
          3: '#86909C',
          4: '#C9CDD4',
        },
        surface: {
          1: '#FFFFFF',
          2: '#F7F8FA',
          3: '#F2F3F5',
        },
        line: {
          1: '#E5E6EB',
          2: '#D9DCE0',
        },
        success: '#00B42A',
        warning: '#FF7D00',
        error: '#F53F3F',
        coord: {
          a: '#165DFF',
          b: '#00B42A',
          ab: '#FF7D00',
        },
        canvas: {
          900: '#1D2129',
          800: '#272E3B',
          700: '#3A4256',
        },
      },
      boxShadow: {
        'arco-1': '0 2px 4px rgba(0,0,0,0.08)',
        'arco-2': '0 4px 8px rgba(0,0,0,0.12)',
        'arco-3': '0 6px 16px rgba(0,0,0,0.16)',
        'arco-4': '0 8px 24px rgba(0,0,0,0.20)',
      },
      borderRadius: {
        'arco-sm': '2px',
        'arco-md': '4px',
        'arco-lg': '8px',
      },
      fontFamily: {
        sans: ['Nunito', 'Helvetica Neue', 'Helvetica', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'arco-xs': ['12px', { lineHeight: '1.4' }],
        'arco-sm': ['14px', { lineHeight: '1.4' }],
        'arco-lg': ['18px', { lineHeight: '1.4' }],
        'arco-xl': ['24px', { lineHeight: '1.3' }],
        'arco-2xl': ['28px', { lineHeight: '1.3' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'starfield': 'starfield 8s ease-in-out infinite',
      },
      keyframes: {
        starfield: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;