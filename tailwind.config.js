/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#12141C',
          card: '#181B26',
          cardMuted: '#232840'
        },
        muted: '#9AA3B8',
        brand: {
          from: '#00C2A8',
          to: '#3DDC97',
          // CSS-variable-backed (not a plain hex) so it can be personalized per
          // logged-in person at runtime — see lib/color.js + App.jsx. The
          // "R G B" (space-separated channel) form is required for Tailwind's
          // bg-brand-cta/NN opacity-modifier syntax to keep working.
          cta: 'rgb(var(--accent) / <alpha-value>)',
          // Text/icon color for content sitting on top of a solid --accent
          // fill — computed per-person alongside --accent (see lib/color.js'
          // readableForeground + App.jsx) so a light accent (e.g. amber)
          // still gets readable dark text instead of hardcoded white.
          ctaForeground: 'rgb(var(--accent-foreground) / <alpha-value>)'
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
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' }
        },
        'backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        'page-in': 'page-in 0.16s ease-out',
        'modal-in': 'modal-in 0.18s ease-out',
        // Apple-style confident-arrival curve (cubic-bezier(0.16,1,0.3,1)) —
        // decelerates hard at the end instead of a linear/ease-out snap.
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.16,1,0.3,1)',
        'backdrop-in': 'backdrop-in 0.2s ease-out'
      }
    }
  },
  plugins: []
}
