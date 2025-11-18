/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js",
    "./src/**/*.css"
  ],
  safelist: [
    // Clases dinámicas generadas por JS
    'bg-green-600',
    'text-white',
    'px-3',
    'py-1',
    'rounded',
    'text-sm',
    'text-center',
    'opacity-50',
    'pointer-events-none',
    'flex',
    'gap-2',
    'mt-3'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};