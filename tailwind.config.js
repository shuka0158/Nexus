/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        neon: {
          blue:   '#00d4ff',
          purple: '#a855f7',
          pink:   '#ec4899',
          green:  '#22c55e',
          yellow: '#eab308',
          orange: '#f97316',
          red:    '#ef4444',
          teal:   '#14b8a6',
        },
        dark: {
          900: '#000000',
          800: '#0d0d0d',
          700: '#111111',
          600: '#1a1a1a',
          500: '#222222',
          400: '#2d2d2d',
          300: '#333333',
          200: '#444444',
          100: '#555555',
        },
      },
      fontFamily: {
        sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-jetbrains)', 'Fira Code', 'monospace'],
        orb:   ['Orbitron', 'sans-serif'],
        exo:   ['Exo 2', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-grid':     "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h1v40H0zM40 0h1v40h-1zM0 0v1h40V0zM0 40v1h40v-1z' fill='%2300d4ff08'/%3E%3C/svg%3E\")",
        'neon-gradient':  'linear-gradient(135deg, #00d4ff10 0%, #a855f710 50%, #ec489910 100%)',
        'card-glass':     'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'sidebar-glass':  'linear-gradient(180deg, rgba(10,10,25,0.95) 0%, rgba(5,5,15,0.98) 100%)',
      },
      boxShadow: {
        'neon-blue':   '0 0 20px rgba(0, 212, 255, 0.3), 0 0 60px rgba(0, 212, 255, 0.1)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.3), 0 0 60px rgba(168, 85, 247, 0.1)',
        'neon-pink':   '0 0 20px rgba(236, 72, 153, 0.3), 0 0 60px rgba(236, 72, 153, 0.1)',
        'neon-green':  '0 0 20px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1)',
        'card-glow':   '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255,255,255,0.1)',
        'glass':       'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.3)',
        'glass-lg':    'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.5)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '60px',
      },
      animation: {
        'pulse-neon':    'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':         'float 6s ease-in-out infinite',
        'scan':          'scan 3s linear infinite',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'border-glow':   'border-glow 3s linear infinite',
        'particle-rise': 'particle-rise 4s ease-out infinite',
        'matrix':        'matrix 20s linear infinite',
        'spin-slow':     'spin 8s linear infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'slide-up':      'slide-up 0.3s ease-out',
        'slide-down':    'slide-down 0.3s ease-out',
        'fade-in':       'fade-in 0.3s ease-out',
        'scale-in':      'scale-in 0.2s ease-out',
        'bounce-soft':   'bounce-soft 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.3)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,212,255,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,255,0.8), 0 0 40px rgba(0,212,255,0.3)' },
        },
        'border-glow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'particle-rise': {
          '0%': { transform: 'translateY(100%) scale(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100px) scale(1)', opacity: '0' },
        },
        'matrix': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'snappy': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};
