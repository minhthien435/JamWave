/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        jam: {
          bg: '#0d0d12',
          surface: '#14141c',
          elevated: '#1a1a24',
          highlight: '#242432',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.16)',
          accent: '#7c3aed',
          'accent-hover': '#6d28d9',
          'accent-subtle': 'rgba(124, 58, 237, 0.15)',
          'accent-glow': 'rgba(124, 58, 237, 0.35)',
          muted: '#8b8b9e',
        }
      },
      boxShadow: {
        'jam-glow': '0 0 25px -4px rgba(124, 58, 237, 0.35)',
        'jam-subtle': '0 8px 30px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}

