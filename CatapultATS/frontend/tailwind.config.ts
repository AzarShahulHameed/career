import type { Config } from 'tailwindcss';

// Beacon design tokens — light, airy, glass-and-gradient direction.
// Page background carries a soft multi-tone wash (not flat white); surfaces
// are translucent frosted panels (bg-white/60 + backdrop-blur) rather than
// hard-bordered cards; the accent is a gradient (indigo -> violet), used for
// primary actions and the signature "beacon" glow motif, not a flat color.
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1E1B2E',
        paper: '#FAFAFF',
        line: '#E4E1F0',
        lineSoft: '#EFEDF9',
        accent: '#6D5AE6',
        accentSoft: '#EEEBFF',
        accentTo: '#A855F7',
        chrome: {
          bg: 'rgba(255,255,255,0.55)',
          bgHover: 'rgba(109,90,230,0.06)',
          border: 'rgba(228,225,240,0.8)',
          text: '#5B5670',
          textMuted: '#8B87A0',
          textActive: '#1E1B2E',
        },
        status: {
          submitted: '#6B7280',
          review: '#B45309',
          shortlisted: '#0369A1',
          interview: '#7C3AED',
          offered: '#047857',
          hired: '#15803D',
          rejected: '#B91C1C',
        },
      },
      backgroundImage: {
        'beacon-gradient': 'linear-gradient(135deg, #6D5AE6 0%, #A855F7 100%)',
        'beacon-wash': 'radial-gradient(circle at 15% 0%, rgba(109,90,230,0.08), transparent 40%), radial-gradient(circle at 85% 20%, rgba(168,85,247,0.07), transparent 45%)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'logo-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.85' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        'logo-pulse': 'logo-pulse 1.4s ease-in-out infinite',
        'ping-slow': 'ping-slow 1.8s cubic-bezier(0,0,0.2,1) infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
