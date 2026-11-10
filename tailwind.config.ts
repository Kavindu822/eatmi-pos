import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          50: '#fdf8f4',
          100: '#f9f0e8',
          200: '#f2ddd0',
          300: '#e7c2ac',
          400: '#d79e7e',
          500: '#c57d54',
          600: '#b46543',
          700: '#965037',
          800: '#7a4231',
          900: '#64382c',
          950: '#361b15',
        },
        espresso: {
          50: '#f5f4f2',
          100: '#e6e4e0',
          200: '#cdc9c2',
          300: '#aca69a',
          400: '#898173',
          500: '#716a5d',
          600: '#5a5449',
          700: '#48433b',
          800: '#3d3933',
          900: '#1e1c19',
          950: '#12110f',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;

