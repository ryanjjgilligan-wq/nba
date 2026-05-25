/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0e14",
          panel: "#0f1419",
          border: "#1f2937",
          ink: "#e6edf3",
          dim: "#7d8590",
          accent: "#39d353",
          warn: "#f59e0b",
          danger: "#f85149",
          info: "#58a6ff",
          nyk: "#f58426", // Knicks orange
          cle: "#860038", // Cavaliers wine
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
