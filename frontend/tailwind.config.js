import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
        brand: {
          50: "#f2f6ff",
          100: "#e6edff",
          200: "#c3d6ff",
          300: "#9fbfff",
          400: "#5892ff",
          500: "#1c64f2",
          600: "#164fca",
          700: "#123ea2",
          800: "#0d2f7b",
          900: "#0a245f",
        },
      },
      boxShadow: {
        soft: "0 10px 40px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [animate],
};

