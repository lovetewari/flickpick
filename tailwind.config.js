/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { gold: { DEFAULT:'#D4A843', light:'#E8C76A' }, surface:'#06060e' },
    fontFamily: { display:['Playfair Display','serif'], body:['Manrope','sans-serif'], mono:['Bebas Neue','sans-serif'] },
  }},
  plugins: [],
};
