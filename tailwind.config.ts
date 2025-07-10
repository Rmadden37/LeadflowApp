import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom breakpoints for mobile optimization
      'mobile': {'max': '480px'},
      'tablet': {'min': '481px', 'max': '768px'},
      'desktop': {'min': '769px'},
      // iPhone specific breakpoints
      'iphone-se': {'max': '375px'},
      'iphone': {'min': '376px', 'max': '414px'},
      'iphone-plus': {'min': '415px', 'max': '480px'},
    },
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace', 'monospace'],
        lora: ['var(--font-lora)', 'serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card-glow-dark': '0px 0px 20px -7px hsla(163, 50%, 35%, 0.22)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            'block-size': '0',
          },
          to: {
            'block-size': 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            'block-size': 'var(--radix-accordion-content-height)',
          },
          to: {
            'block-size': '0',
          },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'icon-pulse': {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))',
          },
          '50%': {
            filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
          },
        },
        'pulse-subtle': {
          '0%': {
            opacity: '0.8',
            filter: 'drop-shadow(0 0 5px rgba(46, 234, 154, 0.5))',
          },
          '50%': {
            opacity: '1',
            filter: 'drop-shadow(0 0 12px rgba(46, 234, 154, 0.8))',
          },
          '100%': {
            opacity: '0.8',
            filter: 'drop-shadow(0 0 5px rgba(46, 234, 154, 0.5))',
          },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'spin': 'spin 1s linear infinite',
        'icon-pulse': 'icon-pulse 2s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2.5s ease-in-out infinite',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minBlockSize: {
        'touch': '44px',
        'touch-lg': '48px',
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      minInlineSize: {
        'touch': '44px',
        'touch-lg': '48px',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // Add safe area utilities
    function({ addUtilities }: any) {
      addUtilities({
        '.pb-safe-bottom': {
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0))',
        },
        '.pt-safe-top': {
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0))',
        },
        '.pl-safe-left': {
          paddingLeft: 'env(safe-area-inset-left, 0)',
        },
        '.pr-safe-right': {
          paddingRight: 'env(safe-area-inset-right, 0)',
        },
        '.h-bottom-nav': {
          height: 'calc(5rem + env(safe-area-inset-bottom, 0))',
        },
        '.mb-bottom-nav': {
          marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0))',
        },
      });
    },
  ],
};

export default config;
