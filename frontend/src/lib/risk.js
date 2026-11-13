export const LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const LEVEL_COLOR = { LOW: "#2F8F83", MEDIUM: "#D9A83B", HIGH: "#D9622B", CRITICAL: "#A31F34" };
export const LEVEL_LABEL = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };

export const FEATURE_LABEL = {
  environmental: "Environmental pillar", social: "Social pillar", governance: "Governance pillar",
  composite_norm: "Composite vs. industry", yoy_change: "Year-on-year change",
  emissions_intensity: "Emissions intensity", expenditure_share: "ESG spend share",
  sector_relative: "Position in sector", score_consistency: "Score consistency",
  incident_count: "Incidents", breach_count: "Breaches", avg_severity: "Average severity",
  mttd_days: "Days to detect", records_exposed_log10: "Records exposed (log10)",
  critical_vulns: "Critical vulnerabilities",
};

// Heat colour for a 0-100 mean risk: teal -> ochre -> orange -> crimson.
export function heat(value) {
  const stops = [[0, [47, 143, 131]], [25, [217, 168, 59]], [45, [217, 98, 43]], [70, [163, 31, 52]]];
  const v = Math.max(0, Math.min(70, value));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(",")})`;
    }
  }
  return "rgb(163,31,52)";
}

export const short = (h, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : "-");
