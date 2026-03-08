/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Status colors
        'status-idea': '#9CA3AF',
        'status-open': '#3B82F6',
        'status-inprogress': '#F59E0B',
        'status-forreview': '#8B5CF6',
        'status-done': '#10B981',
        // App theme
        'forest': {
          600: '#166534',
          700: '#15803d',
          800: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
