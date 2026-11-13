import { Bar } from "react-chartjs-2";
import { FEATURE_LABEL, LEVEL_COLOR } from "../lib/risk.js";
import { RiskBadge } from "./Overview.jsx";

function ZChart({ title, items }) {
  const sorted = [...items].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return (
    <section aria-label={title}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div style={{ height: 34 * sorted.length + 60 }}>
        <Bar
          data={{
            labels: sorted.map((i) => FEATURE_LABEL[i.feature] || i.feature),
            datasets: [{ data: sorted.map((i) => i.z), backgroundColor: sorted.map((i) => (Math.abs(i.z) >= 2 ? "#A31F34" : "#7FA8A0")) }],
          }}
          options={{
            indexAxis: "y", maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `z = ${c.parsed.x.toFixed(2)} (value ${sorted[c.dataIndex].value})` } } },
            scales: { x: { title: { display: true, text: "Standard deviations from the training norm (z)" }, suggestedMin: -3, suggestedMax: 3 } },
          }}
        />
      </div>
    </section>
  );
}

export default function Inspector({ company }) {
  if (!company?.explanations) {
    return <section className="rounded border border-dashed border-rule p-8 text-moss">Select a company to see which features drove its score.</section>;
  }
  const { esg, cyber } = company.explanations;
  return (
    <section aria-label="Company inspector" className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">{company.name}</h2>
        <p className="text-sm text-moss">{company.sector}{company.ticker ? ` · ${company.ticker}` : ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <RiskBadge level={company.risk_level} risk={company.risk} />
          <span className="text-sm">ESG anomaly score <strong className="tabular-nums">{company.esg_score.toFixed(2)}</strong>{company.flagged_esg && <em className="ml-1 not-italic" style={{ color: LEVEL_COLOR.CRITICAL }}>(flagged)</em>}</span>
          <span className="text-sm">Cyber anomaly score <strong className="tabular-nums">{company.cyber_score.toFixed(2)}</strong>{company.flagged_cyber && <em className="ml-1 not-italic" style={{ color: LEVEL_COLOR.CRITICAL }}>(flagged)</em>}</span>
        </div>
        {company.rid && <p className="mt-2 font-mono text-xs text-moss">Ledger request ID {company.rid}</p>}
      </div>
      <ZChart title="ESG feature z-scores" items={esg} />
      <ZChart title="Cyber feature z-scores" items={cyber} />
      <p className="text-sm text-moss">Bars in crimson are at least two standard deviations from what the detector learned as normal. A positive z means the value is higher than usual; a negative z means lower.</p>
    </section>
  );
}
