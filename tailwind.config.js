/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Primary
        'brand-dark': '#1d293d',
        'brand-blue': '#2b7fff',
        'brand-green': '#34A853',
        'brand-red': '#EA4335',
        // secondary
        'brand-light': '#62748e',
        'brand-dark-blue': '#1447e6',
        'brand-dark-red': '#B31412',
        'brand-dark-green': '#137333',
      },
    },
  },
  plugins: [],
};
