import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)", 
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        table: {
          header: {
            DEFAULT: "hsl(var(--background))",
            dark: "hsl(0 0% 15%)"
          },
          row: {
            DEFAULT: "hsl(var(--background))",
            dark: "hsl(0 0% 12%)",
            alternate: "hsl(0 0% 10%)"
          }
        },
        background: {
          DEFAULT: "hsl(var(--background))",
          dark: "hsl(222.2 84% 4.9%)",
          light: "hsl(0 0% 100%)"
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          dark: "hsl(210 40% 98%)",
          light: "hsl(222.2 84% 4.9%)"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          dark: "hsl(222.2 84% 4.9%)",
          light: "hsl(0 0% 100%)"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          prospect: {
            light: "#FB7185",
            dark: "#E14D62"
          },
          activeListing: {
            light: "#4ADE80",
            dark: "#22C55E"
          },
          liveListing: {
            light: "#FDE047",
            dark: "#FFD700"
          },
          mutualAcceptance: {
            light: "#38BDF8",
            dark: "#2196F3"
          },
          closing: {
            light: "#A78BFA",
            dark: "#7C3AED"
          }
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;