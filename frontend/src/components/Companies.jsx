import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { LEVELS, levelLabel } from "../lib/risk.js";
import Inspector from "./Inspector.jsx";
import { Card, RiskBadge, Skeleton } from "./ui.jsx";

export default function Companies({ selected, onSelect, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ flagged_only: true, level: "", sector: "", q: "" });
  const [query, setQuery] = useState("");
  const inspectorRef = useRef(null);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === query ? f : { ...f, q: query })), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const params = { limit: 300 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.results(params).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [filters, refreshKey]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const rows = data?.results ?? [];
  const current = rows.find((r) => r.company_id === selected?.company_id) ?? (selected?.explanations ? selected : null);

  // On phones the inspector sits below the list, so bring it into view after a pick.
  function pick(r) {
    onSelect(r);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }
  const backToList = () => document.getElementById("company-list")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card id="company-list" aria-label="Company list" className="scroll-mt-32 p-4 sm:p-5 lg:sticky lg:top-36">
        <div className="grid grid-cols-2 gap-2">
          <input className="field col-span-2" type="search" placeholder="Search name or ticker" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search companies" />
          <select className="field w-full min-w-0" value={filters.level} onChange={(e) => set("level", e.target.value)} aria-label="Risk level">
            <option value="">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
          </select>
          <select className="field w-full min-w-0" value={filters.sector} onChange={(e) => set("sector", e.target.value)} aria-label="Sector">
            <option value="">All sectors</option>
            {(data?.sectors ?? []).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-moss">{data ? `${data.total} ${data.total === 1 ? "company" : "companies"}` : "Loading…"}</span>
          <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
            <span>Flagged only</span>
            <button type="button" role="switch" aria-checked={filters.flagged_only} onClick={() => set("flagged_only", !filters.flagged_only)}
              className={`relative h-5 w-9 rounded-full transition ${filters.flagged_only ? "bg-brand" : "bg-rule"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${filters.flagged_only ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-critical-fg">{error}</p>}

        <ul className="scrollbar-thin -mx-2 mt-3 max-h-[28rem] space-y-1 overflow-y-auto px-2 lg:max-h-[calc(100vh-20rem)]">
          {!data && [0, 1, 2, 3, 4, 5].map((i) => <li key={i}><Skeleton className="h-14" /></li>)}
          {rows.map((r) => {
            const on = current?.company_id === r.company_id;
            return (
              <li key={r.company_id}>
                <button onClick={() => pick(r)} aria-current={on}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${on ? "bg-ink text-paper" : "hover:bg-sunk"}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className={`block truncate text-xs ${on ? "text-paper/70" : "text-moss"}`}>
                      {r.sector}{r.flagged_esg ? " · ESG flag" : ""}{r.flagged_cyber ? " · Cyber flag" : ""}
                    </span>
                  </span>
                  <RiskBadge level={r.risk_level} risk={r.risk} />
                </button>
              </li>
            );
          })}
          {data && rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-moss">No companies match these filters.</li>}
        </ul>
      </Card>
      <div ref={inspectorRef} className="scroll-mt-32">
        <Inspector company={current} onBack={backToList} />
      </div>
    </div>
  );
}
