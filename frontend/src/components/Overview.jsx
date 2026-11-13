import { Bar } from "react-chartjs-2";
import { heat, LEVEL_COLOR, LEVELS } from "../lib/risk.js";

export default function Overview({ dash, onOpen, onDemo, busy }) {
  if (!dash) return <p className="mt-8 text-moss">Loading dashboard…</p>;
  if (dash.empty) {
    return (
      <section className="mt-8 rounded border border-dashed border-rule p-10 text-center">
        <h2 className="text-xl font-semibold">No results yet</h2>
        <p className="mx-auto mt-2 max-w-md text-moss">Load the demo universe or upload a CSV with ESG and cyber columns to score companies.</p>
        <button disabled={busy} onClick={onDemo} className="mt-5 rounded bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">Load demo data</button>
      </section>
    );
  }
  const s = dash.summary;
  return (
    <div className="mt-6 space-y-8">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-y border-rule py-5 md:grid-cols-4">
        <Kpi label="Companies scored" value={s.companies} />
        <Kpi label="Flagged by a detector" value={s.flagged} />
        <Kpi label="High or critical" value={s.levels.HIGH + s.levels.CRITICAL} accent />
        <Kpi label="Mean aggregate risk" value={s.mean_risk.toFixed(1)} />
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="dist">
          <h2 id="dist" className="text-lg font-semibold">Companies by risk level</h2>
          <div className="mt-3 h-64">
            <Bar
              data={{ labels: LEVELS.map((l) => l[0] + l.slice(1).toLowerCase()), datasets: [{ data: LEVELS.map((l) => s.levels[l]), backgroundColor: LEVELS.map((l) => LEVEL_COLOR[l]) }] }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "Companies" } } } }}
            />
          </div>
        </section>
        <section aria-labelledby="hist">
          <h2 id="hist" className="text-lg font-semibold">Distribution of aggregate risk (0-100)</h2>
          <div className="mt-3 h-64">
            <Bar
              data={{ labels: dash.histogram.map((b) => b.bin), datasets: [{ data: dash.histogram.map((b) => b.count), backgroundColor: dash.histogram.map((b) => heat(parseInt(b.bin) + 5)) }] }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "Companies" } }, x: { title: { display: true, text: "Risk score" } } } }}
            />
          </div>
        </section>
      </div>

      <section aria-labelledby="heat">
        <h2 id="heat" className="text-lg font-semibold">Sector heatmap</h2>
        <p className="text-sm text-moss">Sectors ranked by mean aggregate risk. Count cells darken as more companies fall in a level.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-moss">
                <th className="py-2 pr-3 font-medium">Sector</th><th className="px-2 font-medium">Mean risk</th>
                <th className="px-2 font-medium">ESG</th><th className="px-2 font-medium">Cyber</th>
                {LEVELS.map((l) => <th key={l} className="px-2 text-center font-medium">{l[0] + l.slice(1).toLowerCase()}</th>)}
                <th className="px-2 text-right font-medium">Flagged</th>
              </tr>
            </thead>
            <tbody>
              {dash.sector_heatmap.map((r) => (
                <tr key={r.sector} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{r.sector} <span className="font-normal text-moss">({r.n})</span></th>
                  <td className="px-2"><span className="inline-block min-w-[3.5rem] rounded px-2 py-1 text-center font-semibold text-white" style={{ background: heat(r.mean_risk) }}>{r.mean_risk.toFixed(1)}</span></td>
                  <td className="px-2 tabular-nums">{r.mean_esg.toFixed(2)}</td>
                  <td className="px-2 tabular-nums">{r.mean_cyber.toFixed(2)}</td>
                  {LEVELS.map((l) => {
                    const share = r.levels[l] / r.n;
                    return (
                      <td key={l} className="px-1 text-center tabular-nums">
                        <span className="block rounded py-1" style={{ background: `${LEVEL_COLOR[l]}${Math.round(Math.min(1, share * 2.2) * 200 + 15).toString(16).padStart(2, "0")}`, color: share > 0.35 ? "#fff" : undefined }}>{r.levels[l]}</span>
                      </td>
                    );
                  })}
                  <td className="px-2 text-right tabular-nums">{r.flagged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="top">
        <h2 id="top" className="text-lg font-semibold">Highest-risk flagged companies</h2>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {dash.top_flagged.map((c) => (
            <li key={c.company_id}>
              <button onClick={() => onOpen(c)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-panel">
                <span><span className="font-semibold">{c.name}</span> <span className="text-sm text-moss">{c.sector}</span></span>
                <RiskBadge level={c.risk_level} risk={c.risk} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div>
      <dt className="text-sm text-moss">{label}</dt>
      <dd className={`font-display text-4xl font-extrabold ${accent ? "text-critical" : ""}`}>{value}</dd>
    </div>
  );
}

export function RiskBadge({ level, risk }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="rounded px-2 py-0.5 text-white" style={{ background: LEVEL_COLOR[level] }}>{level[0] + level.slice(1).toLowerCase()}</span>
      <span className="tabular-nums">{risk.toFixed(1)}</span>
    </span>
  );
}
