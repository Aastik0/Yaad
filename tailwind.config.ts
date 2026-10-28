import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "#FCFBF9",
          100: "#FAF8F5",
          200: "#F5F2EB",
          300: "#ECE8DD",
          400: "#DFD9CA",
        },
        forest: {
          50: "#F0F5F2",
          100: "#DCE7E1",
          500: "#2D543F",
          600: "#224231",
          700: "#1E3A2B",
          800: "#172E22",
          900: "#0F1F17",
        },
        sage: {
          50: "#F4F7F4",
          100: "#E6EDE5",
          200: "#D1DDD0",
          300: "#B4C4B2",
          400: "#8A9A86",
          500: "#6B7C67",
        },
        terracotta: {
          50: "#FDF5F2",
          100: "#FBE6DF",
          500: "#C85A32",
          600: "#A84420",
          700: "#8B3416",
        },
        charcoal: {
          50: "#F6F7F7",
          100: "#E3E7E5",
          700: "#36423C",
          800: "#232D28",
          900: "#1A221E",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;

