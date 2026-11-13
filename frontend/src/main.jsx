import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./lib/chart.js";
import { ThemeProvider } from "./lib/theme.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
