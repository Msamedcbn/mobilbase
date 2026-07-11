/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        shell: {
          dark:  '#07111f',
          navy:  '#090d16',
          ink:   '#050914',
        },
        slate: {
          450: '#7e8ea3',
          550: '#586a82',
          650: '#394b62',
          750: '#1d2a3d',
          850: '#0f1729',
        },
        indigo: {
          350: '#9fadf2',
          450: '#5c6fd6',
          550: '#3b4cc0',
          650: '#2c3aa0',
          750: '#1e2880',
          850: '#131c60',
        },
        emerald: {
          350: '#5cd6b4',
          450: '#2fba8e',
          550: '#0f906a',
        },
        red: {
          350: '#f28b8b',
          450: '#d64545',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
