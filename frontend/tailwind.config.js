/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Karla', 'system-ui', 'sans-serif'],
        mono: ['Courier Prime', 'monospace'],
      },
      colors: {
        indie: {
          paper: '#EDE6D6',
          ink: '#2B2620',
          rust: '#B85C38',
          moss: '#5C6B57',
          taupe: '#8A7B6C',
          mustard: '#D4A24C',
          card: '#F4EFE4',
          // Night Tape variant
          'paper-dark': '#1C1815',
          'ink-dark': '#EDE6D6',
          'card-dark': '#26211C',
          'rust-dark': '#D97C54',
          'moss-dark': '#76876F',
          'taupe-dark': '#A39282',
          'mustard-dark': '#E0B35C',
        }
      },
      boxShadow: {
        'polaroid': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 10px -2px rgba(0, 0, 0, 0.2)',
        'ticket': '0 4px 14px 0 rgba(0, 0, 0, 0.35)',
        'cassette': 'inset 0 2px 4px rgba(255,255,255,0.1), 0 12px 28px rgba(0,0,0,0.6)',
      }
    },
  },
  plugins: [],
}

