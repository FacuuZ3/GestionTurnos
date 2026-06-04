import type { Config } from "tailwindcss";

/**
 * Configuración de Tailwind CSS.
 * Tema basado en la paleta verde-padel (cancha de pádel) con acentos cálidos.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        /**
         * Paleta brand — alias semántico hacia emerald de Tailwind.
         * Reglas de la skill:
         *   - Un único accent color.
         *   - Saturación < 80%.
         *   - Sin "AI purple/blue", neutrales zinc/slate como base.
         */
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
