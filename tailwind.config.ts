import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // True black theme colors (Cashew-inspired)
        background: {
          primary: '#000000',    // True black
          secondary: '#0a0a0a',  // Slightly lighter black
          tertiary: '#1a1a1a',   // Card backgrounds
          elevated: '#252525',   // Modal/elevated surfaces
        },
        text: {
          primary: '#ffffff',    // Pure white text
          secondary: '#a1a1a1',  // Light gray for secondary text
          muted: '#666666',      // Darker gray for muted text
          accent: '#4ade80',     // Green accent for positive numbers
        },
        // Friendly, casual colors inspired by Cashew
        accent: {
          primary: '#4ade80',    // Friendly green (main accent)
          secondary: '#60a5fa',  // Soft blue
          tertiary: '#a78bfa',   // Gentle purple
          warm: '#fb7185',       // Warm pink/red
          orange: '#fb923c',     // Friendly orange
          yellow: '#fbbf24',     // Warm yellow
        },
        // Simplified color system
        success: '#4ade80',      // Green
        warning: '#fbbf24',      // Yellow  
        danger: '#fb7185',       // Pink/red (less harsh than pure red)
        info: '#60a5fa',         // Blue
        // Border colors for true black theme
        border: {
          primary: '#2a2a2a',    // Subtle borders
          secondary: '#3a3a3a',  // More visible borders
          accent: '#4ade80',     // Accent borders
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
