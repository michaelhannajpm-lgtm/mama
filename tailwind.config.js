/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // App loads Fraunces + Albert Sans via <link> in App.jsx — these
        // are exposed as utility classes for convenience.
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Albert Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
