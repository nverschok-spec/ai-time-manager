/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#12141C',
          card: '#1E2130',
          cardMuted: '#232840'
        },
        muted: '#9AA3B8',
        brand: {
          from: '#00C2A8',
          to: '#3DDC97',
          cta: '#2ECC91'
        },
        priority: {
          high: '#FF6B6B',
          medium: '#F4B740',
          low: '#8B93A7'
        }
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(4px)' }
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out'
      }
    }
  },
  plugins: []
}
