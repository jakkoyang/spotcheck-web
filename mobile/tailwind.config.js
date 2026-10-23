/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic type scale: use these instead of text-xs/sm/base so screens share one hierarchy.
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        footnote: ['13px', { lineHeight: '18px' }],
        body: ['15px', { lineHeight: '20px' }],
        headline: ['17px', { lineHeight: '22px' }],
        title: ['22px', { lineHeight: '28px' }],
      },
    },
  },
  plugins: [],
}
