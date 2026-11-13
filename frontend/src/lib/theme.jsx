import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Chart as ChartJS } from "chart.js";

const KEY = "secora-theme";
const ThemeContext = createContext({ theme: "light", toggle: () => {} });

const initial = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

// Reads a token from :root so charts follow the same palette as the CSS.
export const token = (name, alpha = 1) => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).join(",");
  return `rgba(${rgb},${alpha})`;
};

function applyChartDefaults() {
  ChartJS.defaults.color = token("moss");
  ChartJS.defaults.borderColor = token("rule");
  ChartJS.defaults.plugins.tooltip.backgroundColor = token("ink", 0.92);
  ChartJS.defaults.plugins.tooltip.titleColor = token("paper");
  ChartJS.defaults.plugins.tooltip.bodyColor = token("paper");
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    applyChartDefaults();
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch { /* storage blocked: theme still applies for this visit */ }
      return next;
    });
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
