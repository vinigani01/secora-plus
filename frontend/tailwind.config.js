/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const level = (name) => ({ DEFAULT: v(name), soft: v(`${name}-soft`), fg: v(`${name}-fg`) });

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        panel: v("panel"),
        sunk: v("sunk"),
        ink: v("ink"),
        moss: v("moss"),
        rule: v("rule"),
        brand: { DEFAULT: v("brand"), soft: v("brand-soft"), fg: v("brand-fg") },
        low: level("low"),
        medium: level("medium"),
        high: level("high"),
        critical: level("critical"),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 16px -4px rgb(var(--shadow) / 0.08)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.08), 0 12px 32px -8px rgb(var(--shadow) / 0.18)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        rise: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } },
      },
      animation: { shimmer: "shimmer 1.4s linear infinite", rise: "rise .35s ease-out both" },
    },
  },
  plugins: [],
};
