import { Bar, Doughnut } from "react-chartjs-2";
import { heat, LEVEL_CLASS, LEVEL_COLOR, LEVELS, levelLabel } from "../lib/risk.js";
import { token, useTheme } from "../lib/theme.jsx";
import { Card, CardHeader, Icon, RiskBadge, Skeleton } from "./ui.jsx";

// Kept as a re-export: older imports pull RiskBadge from this module.
export { RiskBadge };

export default function Overview({ dash, onOpen, onDemo, busy }) {
  const { theme } = useTheme();
  if (!dash) return <OverviewSkeleton />;
  if (dash.empty) {
    return (
      <Card className="grid place-items-center px-6 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-fg"><Icon.play className="h-6 w-6" /></div>
        <h2 className="mt-5 text-2xl font-bold">No results yet</h2>
        <p className="mx-auto mt-2 max-w-md text-moss">Load the demo universe of 240 synthetic companies, or upload a CSV with ESG and cyber columns, to score companies.</p>
        <button disabled={busy} onClick={onDemo} className="btn-primary mt-6">Load demo data</button>
      </Card>
    );
  }

  const s = dash.summary;
  const hc = s.levels.HIGH + s.levels.CRITICAL;
  const pct = (n) => (s.companies ? `${((100 * n) / s.companies).toFixed(0)}% of universe` : "");
  const axis = { grid: { color: token("rule", 0.7) }, border: { display: false } };

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Companies scored" value={s.companies} hint={`${dash.sector_heatmap.length} sectors`} />
        <Kpi label="Flagged by a detector" value={s.flagged} hint={pct(s.flagged)} />
        <Kpi label="High or critical" value={hc} hint={pct(hc)} tone="critical" />
        <Kpi label="Mean aggregate risk" value={s.mean_risk.toFixed(1)} hint="on a 0-100 scale" meter={s.mean_risk} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2" aria-labelledby="dist">
          <CardHeader id="dist" title="Companies by risk level" subtitle="Bands: low < 25 ≤ medium < 45 ≤ high < 65 ≤ critical" />
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="relative mx-auto aspect-square w-full max-w-[220px]">
              <Doughnut key={theme}
                data={{ labels: LEVELS.map(levelLabel), datasets: [{ data: LEVELS.map((l) => s.levels[l]), backgroundColor: LEVELS.map((l) => LEVEL_COLOR[l]), borderColor: token("panel"), borderWidth: 3, hoverOffset: 6 }] }}
                options={{ cutout: "68%", plugins: { legend: { display: false } } }}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><div className="font-display text-3xl font-extrabold">{s.companies}</div><div className="text-xs text-moss">companies</div></div>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {LEVELS.map((l) => (
                <li key={l} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_CLASS[l].dot}`} aria-hidden="true" />
                  <span className="w-16 text-moss">{levelLabel(l)}</span>
                  <span className="font-semibold tabular-nums">{s.levels[l]}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3" aria-labelledby="hist">
          <CardHeader id="hist" title="Distribution of aggregate risk" subtitle="How many companies fall in each 10-point bucket of the 0-100 score" />
          <div className="mt-4 h-64">
            <Bar key={theme}
              data={{ labels: dash.histogram.map((b) => b.bin), datasets: [{ data: dash.histogram.map((b) => b.count), backgroundColor: dash.histogram.map((b) => heat(parseInt(b.bin) + 5)), borderRadius: 6, maxBarThickness: 44 }] }}
              options={{
                maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => `Risk ${c[0].label}`, label: (c) => `${c.parsed.y} companies` } } },
                scales: { y: { ...axis, beginAtZero: true, title: { display: true, text: "Companies" } }, x: { ...axis, grid: { display: false }, title: { display: true, text: "Risk score" } } },
              }}
            />
          </div>
        </Card>
      </div>

      <Card className="p-5" aria-labelledby="heat">
        <CardHeader id="heat" title="Sector heatmap" subtitle="Sectors ranked by mean aggregate risk. Level cells darken as a larger share of the sector falls in that level." />
        <SectorTable rows={dash.sector_heatmap} />
        <SectorCards rows={dash.sector_heatmap} />
      </Card>

      <Card className="p-5" aria-labelledby="top">
        <CardHeader id="top" title="Highest-risk flagged companies" subtitle="Open one to see which features drove its score." />
        <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {dash.top_flagged.map((c, i) => (
            <li key={c.company_id}>
              <button onClick={() => onOpen(c)} className="group flex w-full items-center gap-3 rounded-xl border border-rule px-3 py-3 text-left transition hover:border-ink/30 hover:bg-sunk">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sunk text-xs font-bold text-moss group-hover:bg-panel">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block truncate text-xs text-moss">
                    {c.sector}{c.flagged_esg ? " · ESG flag" : ""}{c.flagged_cyber ? " · Cyber flag" : ""}
                  </span>
                </span>
                <RiskBadge level={c.risk_level} risk={c.risk} />
              </button>
            </li>
          ))}
          {dash.top_flagged.length === 0 && <li className="text-sm text-moss">No company was flagged in this run.</li>}
        </ul>
      </Card>
    </div>
  );
}

function cellStyle(level, share) {
  const a = Math.round(Math.min(1, share * 2.2) * 200 + 15).toString(16).padStart(2, "0");
  return { background: `${LEVEL_COLOR[level]}${a}`, color: share > 0.35 ? "#fff" : undefined };
}

function SectorTable({ rows }) {
  return (
    <div className="scrollbar-thin mt-4 hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-moss">
            <th className="py-2 pr-3 font-semibold">Sector</th><th className="px-2 font-semibold">Mean risk</th>
            <th className="px-2 font-semibold">ESG</th><th className="px-2 font-semibold">Cyber</th>
            {LEVELS.map((l) => <th key={l} className="px-2 text-center font-semibold">{levelLabel(l)}</th>)}
            <th className="px-2 text-right font-semibold">Flagged</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sector} className="hover:bg-sunk/60">
              <th scope="row" className="rounded-l-lg py-1.5 pr-3 text-left font-medium">{r.sector} <span className="font-normal text-moss">({r.n})</span></th>
              <td className="px-2"><span className="inline-block min-w-[3.5rem] rounded-md px-2 py-1 text-center font-semibold text-white" style={{ background: heat(r.mean_risk) }}>{r.mean_risk.toFixed(1)}</span></td>
              <td className="px-2 tabular-nums">{r.mean_esg.toFixed(2)}</td>
              <td className="px-2 tabular-nums">{r.mean_cyber.toFixed(2)}</td>
              {LEVELS.map((l) => (
                <td key={l} className="px-1 text-center tabular-nums">
                  <span className="block rounded-md py-1 font-medium" style={cellStyle(l, r.levels[l] / r.n)}>{r.levels[l]}</span>
                </td>
              ))}
              <td className="rounded-r-lg px-2 text-right font-semibold tabular-nums">{r.flagged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Phone layout: one card per sector instead of a 9-column table.
function SectorCards({ rows }) {
  return (
    <ul className="mt-4 space-y-3 md:hidden">
      {rows.map((r) => (
        <li key={r.sector} className="rounded-xl border border-rule p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.sector}</p>
              <p className="text-xs text-moss">{r.n} companies · {r.flagged} flagged · ESG {r.mean_esg.toFixed(2)} · Cyber {r.mean_cyber.toFixed(2)}</p>
            </div>
            <span className="rounded-md px-2 py-1 text-sm font-bold text-white" style={{ background: heat(r.mean_risk) }}>{r.mean_risk.toFixed(1)}</span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-sunk" aria-label="Share of companies per level">
            {LEVELS.map((l) => r.levels[l] > 0 && <span key={l} className={LEVEL_CLASS[l].bar} style={{ width: `${(100 * r.levels[l]) / r.n}%` }} />)}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-moss">
            {LEVELS.map((l) => <span key={l}>{levelLabel(l)} {r.levels[l]}</span>)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Kpi({ label, value, hint, tone, meter }) {
  return (
    <div className="card p-4 sm:p-5">
      <dt className="text-xs font-medium text-moss sm:text-sm">{label}</dt>
      <dd className={`mt-1 font-display text-3xl font-extrabold tabular-nums sm:text-4xl ${tone === "critical" ? "text-critical-fg" : ""}`}>{value}</dd>
      {meter != null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full" style={{ width: `${Math.min(100, meter)}%`, background: heat(meter) }} /></div>
      ) : hint && <p className="mt-1 text-xs text-moss">{hint}</p>}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <div className="grid gap-6 lg:grid-cols-5"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl lg:col-span-3" /></div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
