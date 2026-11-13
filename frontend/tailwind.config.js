/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDF1EE",
        panel: "#F8FAF8",
        ink: "#14302B",
        moss: "#5B6F69",
        rule: "#CBD6D1",
        low: "#2F8F83",
        medium: "#D9A83B",
        high: "#D9622B",
        critical: "#A31F34",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
