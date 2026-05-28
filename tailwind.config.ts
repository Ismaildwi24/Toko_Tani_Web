import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1A7C3E',
          'primary-hover': '#155e30',
          'primary-light': '#e8f5ee',
          accent: '#2ECC71',
          danger: '#E53E3E',
          warning: '#F6AD55',
          text: {
            primary: '#1A202C',
            secondary: '#4A5568',
            muted: '#718096',
          },
          border: '#E2E8F0',
          bg: '#F7FAFC',
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
