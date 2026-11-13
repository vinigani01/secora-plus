import { useEffect, useState } from "react";
import { api } from "../api.js";
import { LEVELS } from "../lib/risk.js";
import Inspector from "./Inspector.jsx";
import { RiskBadge } from "./Overview.jsx";

export default function Companies({ selected, onSelect, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ flagged_only: true, level: "", sector: "", q: "" });

  useEffect(() => {
    const params = { limit: 300 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.results(params).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [filters, refreshKey]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const rows = data?.results ?? [];
  const current = rows.find((r) => r.company_id === selected?.company_id) ?? (selected?.explanations ? selected : null);
  const field = "rounded border border-rule bg-panel px-2 py-1.5 text-sm";

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-label="Company list">
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${field} min-w-0 flex-1`} placeholder="Search name or ticker" value={filters.q} onChange={(e) => set("q", e.target.value)} aria-label="Search companies" />
          <select className={field} value={filters.level} onChange={(e) => set("level", e.target.value)} aria-label="Risk level">
            <option value="">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l[0] + l.slice(1).toLowerCase()}</option>)}
          </select>
          <select className={field} value={filters.sector} onChange={(e) => set("sector", e.target.value)} aria-label="Sector">
            <option value="">All sectors</option>
            {(data?.sectors ?? []).map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={filters.flagged_only} onChange={(e) => set("flagged_only", e.target.checked)} /> Flagged only
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-critical">{error}</p>}
        <p className="mt-3 text-sm text-moss">{data ? `${data.total} companies` : "Loading…"}</p>
        <ul className="mt-1 max-h-[34rem] divide-y divide-rule overflow-y-auto border-y border-rule">
          {rows.map((r) => (
            <li key={r.company_id}>
              <button onClick={() => onSelect(r)} aria-current={current?.company_id === r.company_id}
                className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-panel ${current?.company_id === r.company_id ? "bg-panel" : ""}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-moss">{r.sector}{r.flagged_esg ? " · ESG flag" : ""}{r.flagged_cyber ? " · Cyber flag" : ""}</span>
                </span>
                <RiskBadge level={r.risk_level} risk={r.risk} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Inspector company={current} />
    </div>
  );
}
