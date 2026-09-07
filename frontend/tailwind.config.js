/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#082346",
          "navy-dark": "#04142b",
          "navy-soft": "#12345f",
          orange: "#f26a0a",
          "orange-hover": "#d95c02",
          "orange-soft": "#fff0e6",
          page: "#f6f8fb",
          surface: "#ffffff",
          border: "#d9e1ec",
          ink: "#172033",
          muted: "#5f6b7a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 16px 40px rgba(8, 35, 70, 0.08)",
        card: "0 4px 20px rgba(8, 35, 70, 0.05)",
        floating: "0 20px 48px rgba(8, 35, 70, 0.16)",
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

