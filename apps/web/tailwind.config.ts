import type { Config } from "tailwindcss";

// Paleta do produto (painel administrativo) — PRD Secao 5.1.
// NAO usar essas cores nas pecas geradas para clientes (essas usam o brand_kit de cada workspace).
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        neutral: {
          900: "#0F172A",
          600: "#475569",
          400: "#94A3B8",
          200: "#E2E8F0",
          50: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
