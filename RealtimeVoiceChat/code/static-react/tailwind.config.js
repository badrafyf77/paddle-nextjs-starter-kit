/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'interview-dark': '#1F2937',
        'interview-gray': '#F3F4F6',
        'interview-blue': '#DBEAFE',
        'ai-message': '#F3F4F6',
        'user-message': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
