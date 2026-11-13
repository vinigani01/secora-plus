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

export const levelLabel = (l) => LEVEL_LABEL[l] ?? l;

// Full class strings so Tailwind's scanner keeps them.
export const LEVEL_CLASS = {
  LOW: { chip: "bg-low-soft text-low-fg ring-low/30", dot: "bg-low", text: "text-low-fg", bar: "bg-low" },
  MEDIUM: { chip: "bg-medium-soft text-medium-fg ring-medium/30", dot: "bg-medium", text: "text-medium-fg", bar: "bg-medium" },
  HIGH: { chip: "bg-high-soft text-high-fg ring-high/30", dot: "bg-high", text: "text-high-fg", bar: "bg-high" },
  CRITICAL: { chip: "bg-critical-soft text-critical-fg ring-critical/30", dot: "bg-critical", text: "text-critical-fg", bar: "bg-critical" },
};

// Mirrors RISK_BANDS in backend/app/config.py (LOW < 25, MEDIUM < 45, HIGH < 65, CRITICAL >= 65).
export const BANDS = [
  { level: "LOW", from: 0, to: 25 },
  { level: "MEDIUM", from: 25, to: 45 },
  { level: "HIGH", from: 45, to: 65 },
  { level: "CRITICAL", from: 65, to: 100 },
];
export const bandFor = (r) => (r >= 65 ? "CRITICAL" : r >= 45 ? "HIGH" : r >= 25 ? "MEDIUM" : "LOW");

// R = (alpha * sE^p + (1 - alpha) * sC^p)^(1/p), scaled to 0-100.
export const powerMean = (sE, sC, alpha = 0.5, p = 3) => 100 * Math.pow(alpha * sE ** p + (1 - alpha) * sC ** p, 1 / p);

export const fmtTime = (t) => {
  if (!t) return "-";
  const d = new Date(t.endsWith("Z") || /[+-]\d\d:\d\d$/.test(t) ? t : `${t}Z`);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
