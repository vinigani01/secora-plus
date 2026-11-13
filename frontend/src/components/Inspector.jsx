import { Bar } from "react-chartjs-2";
import { FEATURE_LABEL, LEVEL_CLASS } from "../lib/risk.js";
import { token, useTheme } from "../lib/theme.jsx";
import { Card, CopyButton, RiskBadge, ScoreBar } from "./ui.jsx";

function ZChart({ title, items }) {
  const { theme } = useTheme();
  const sorted = [...items].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const strong = sorted.filter((i) => Math.abs(i.z) >= 2).length;
  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-xs text-moss">{strong ? `${strong} feature${strong > 1 ? "s" : ""} beyond 2σ` : "nothing beyond 2σ"}</span>
      </div>
      <div className="mt-2" style={{ height: 30 * sorted.length + 56 }}>
        <Bar key={theme}
          data={{
            labels: sorted.map((i) => FEATURE_LABEL[i.feature] || i.feature),
            datasets: [{ data: sorted.map((i) => i.z), borderRadius: 4, barThickness: 16,
              backgroundColor: sorted.map((i) => (Math.abs(i.z) >= 2 ? token("critical") : token("brand", 0.45))) }],
          }}
          options={{
            indexAxis: "y", maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `z = ${c.parsed.x.toFixed(2)} (value ${sorted[c.dataIndex].value})` } } },
            scales: {
              x: { suggestedMin: -3, suggestedMax: 3, border: { display: false },
                grid: { color: (c) => (c.tick.value === 0 ? token("moss", 0.6) : token("rule", 0.7)) },
                title: { display: true, text: "Standard deviations from the training norm (z)" } },
              y: { grid: { display: false }, border: { display: false }, ticks: { color: token("ink") } },
            },
          }}
        />
      </div>
    </section>
  );
}

export default function Inspector({ company, onBack }) {
  if (!company?.explanations) {
    return (
      <Card className="hidden place-items-center border-dashed p-10 text-center text-moss lg:grid">
        <div>
          <p className="font-semibold text-ink">No company selected</p>
          <p className="mt-1 text-sm">Pick one from the list to see which features drove its score.</p>
        </div>
      </Card>
    );
  }
  const { esg, cyber } = company.explanations;
  const ring = LEVEL_CLASS[company.risk_level]?.text ?? "";
  return (
    <Card aria-label="Company inspector" className="animate-rise space-y-6 p-5 sm:p-6">
      {onBack && (
        <button onClick={onBack} className="btn-ghost -ml-2 -mt-1 px-2 lg:hidden">← Back to list</button>
      )}
      <div className="flex flex-wrap items-start gap-5">
        <Gauge value={company.risk} className={ring} />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold leading-tight">{company.name}</h2>
          <p className="text-sm text-moss">{company.sector}{company.ticker ? ` · ${company.ticker}` : ""}</p>
          <div className="mt-2"><RiskBadge level={company.risk_level} risk={company.risk} size="lg" /></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreBar label="ESG anomaly score" value={company.esg_score} flagged={company.flagged_esg} />
        <ScoreBar label="Cyber anomaly score" value={company.cyber_score} flagged={company.flagged_cyber} />
      </div>
      {company.rid && (
        <p className="flex flex-wrap items-center gap-1 font-mono text-xs text-moss">Ledger request ID <span className="text-ink">{company.rid}</span> <CopyButton value={company.rid} /></p>
      )}
      <ZChart title="ESG feature z-scores" items={esg} />
      <ZChart title="Cyber feature z-scores" items={cyber} />
      <p className="rounded-xl bg-sunk p-3 text-sm text-moss">
        Bars in red are at least two standard deviations from what the detector learned as normal. A positive z means the value is higher than usual; a negative z means lower.
      </p>
    </Card>
  );
}

function Gauge({ value, className }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative h-20 w-20 shrink-0 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(var(--sunk))" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-xl font-extrabold text-ink">{pct.toFixed(0)}</span>
    </div>
  );
}
