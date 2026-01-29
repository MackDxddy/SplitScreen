/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      // Mobile-first breakpoints per Mobile Requirements Section 1.2
      'xs': '320px',      // Mobile Small (iPhone SE, older Android)
      'sm': '375px',      // Mobile Standard (iPhone 12-15, Galaxy S) - CRITICAL
      'md': '768px',      // Tablet Portrait (iPad, Android tablets)
      'lg': '1024px',     // Tablet Landscape (iPad Pro, Surface)
      'xl': '1280px',     // Desktop (Laptops, monitors)
      '2xl': '1536px',    // Large Desktop
    },
    extend: {
      colors: {
        // Brand colors - customize these
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Semantic colors for draft/trades
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        'draft-active': '#3b82f6',
        'trade-open': '#10b981',
        'trade-closed': '#ef4444',
      },
      spacing: {
        // Touch target sizes per Technical Clarifications Section 1.3
        'touch': '48px',      // Standard minimum (48x48px)
        'touch-lg': '56px',   // Critical actions (Draft button)
        'touch-spacing': '8px', // Minimum spacing between targets
      },
      minHeight: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      minWidth: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      maxWidth: {
        'content': '1400px',  // Per Mobile Requirements Section 2.1
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
