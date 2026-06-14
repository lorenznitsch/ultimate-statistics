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
        primary: {
          DEFAULT: "#006B5E",
          50:  "#E6F3F1",
          100: "#C0E2DC",
          200: "#7DC5BB",
          300: "#3AA89A",
          400: "#008B7A",
          500: "#006B5E",
          600: "#005A4F",
          700: "#004940",
          800: "#003831",
          900: "#002722",
        },
        accent: "#00A896",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
