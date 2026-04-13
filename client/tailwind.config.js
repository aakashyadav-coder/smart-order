/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Stitch / Obsidian Sommelier design tokens ── */
        'kx-surface':                '#12131b',
        'kx-surface-dim':            '#12131b',
        'kx-surface-bright':         '#383842',
        'kx-surface-container':      '#1e1f28',
        'kx-surface-container-low':  '#1a1b24',
        'kx-surface-container-high': '#282933',
        'kx-surface-container-highest': '#33343e',
        'kx-surface-container-lowest':  '#0c0e16',
        'kx-surface-variant':        '#33343e',
        'kx-on-surface':             '#e2e1ee',
        'kx-on-surface-variant':     '#e5bdbe',
        'kx-primary':                '#fb923c',
        'kx-primary-container':      '#ea580c',
        'kx-primary-fixed':          '#ffedd5',
        'kx-primary-fixed-dim':      '#fb923c',
        'kx-on-primary':             '#431407',
        'kx-on-primary-container':   '#fff7ed',
        'kx-secondary':              '#d2bbff',
        'kx-secondary-container':    '#6001d1',
        'kx-tertiary':               '#74d8bd',
        'kx-tertiary-container':     '#00836c',
        'kx-on-tertiary-fixed':      '#002019',
        'kx-outline':                '#ac8889',
        'kx-outline-variant':        '#5c3f40',
        'kx-error':                  '#ffb4ab',
        /* ── Brand palette ────────────────────────────── */
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        /* ── shadcn/ui CSS-variable tokens ───────────── */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT:           'hsl(var(--sidebar-background))',
          foreground:        'hsl(var(--sidebar-foreground))',
          primary:           'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent:            'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border:            'hsl(var(--sidebar-border))',
          ring:              'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        landing: ['Space Grotesk', 'system-ui', 'sans-serif'],
        headline: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:     ['Manrope', 'system-ui', 'sans-serif'],
        label:    ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up':    'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down':  'slideDown 0.28s cubic-bezier(0.4, 0, 1, 1)',
        'fade-in':     'fadeIn 0.25s ease-out',
        'bounce-in':   'bounceIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-dot':   'pulseDot 1.5s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'glow':        'glow 2s ease-in-out infinite',
        'float':       'float 3s ease-in-out infinite',
        'ping-slow':   'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(0)',    opacity: '1' },
          '100%': { transform: 'translateY(24px)', opacity: '0' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.75)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(225, 29, 72, 0.35)' },
          '50%':      { boxShadow: '0 0 40px rgba(225, 29, 72, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
