/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#e2e8f0', // Color gris suave para bordes
        input: '#e2e8f0',
        ring: '#3b82f6',
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1e40af',
          light: '#3b82f6',
        },
        primary: {
          DEFAULT: '#2563eb', // Blue-600
          dark: '#1e40af', // Blue-800
          light: '#3b82f6', // Blue-500
        },
        danger: {
          DEFAULT: '#dc2626', // Red-600
          light: '#ef4444', // Red-500
        },
        warning: {
          DEFAULT: '#d97706', // Amber-600
          light: '#f59e0b', // Amber-500
        },
        success: {
          DEFAULT: '#16a34a', // Green-600
          light: '#22c55e', // Green-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
