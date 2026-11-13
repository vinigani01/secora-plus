import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import AuditTrail from "./components/AuditTrail.jsx";
import Banner from "./components/Banner.jsx";
import Companies from "./components/Companies.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import Overview from "./components/Overview.jsx";

const TABS = [["overview", "Overview"], ["companies", "Flagged companies"], ["audit", "Audit trail"]];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [dash, setDash] = useState(null);
  const [verify, setVerify] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const datasetId = useRef(null);

  const refresh = useCallback(async () => {
    const [d, v] = await Promise.all([api.dashboard(), api.verify()]);
    setDash(d);
    setVerify(v);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setNotice({ kind: "error", text: e.message }));
  }, [refresh]);

  async function run(label, fn) {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice({ kind: "error", text: e.message, details: e.details });
    } finally {
      setBusy("");
    }
  }

  async function analyze(id) {
    const r = await api.analyze(id ?? datasetId.current);
    if (r.status === "fallback") {
      setNotice({ kind: "warn", text: `Scoring failed (${r.error}). Showing the last committed results instead.` });
      setDash(r.dashboard);
    } else {
      setNotice({ kind: "ok", text: `Scored ${r.run.n_companies} companies; ${r.run.n_flagged} flagged and written to the audit ledger.` });
    }
    setVerify(await api.verify());
    if (r.status !== "fallback") await refresh();
  }

  const loadDemo = () => run("Loading demo data and scoring…", async () => {
    const d = await api.demo();
    datasetId.current = d.dataset.id;
    await analyze(d.dataset.id);
  });
  const upload = (file) => run("Validating and scoring upload…", async () => {
    const u = await api.upload(file);
    datasetId.current = u.dataset.id;
    await analyze(u.dataset.id);
  });
  const rerun = () => run("Scoring…", () => analyze());

  const openCompany = (c) => { setSelected(c); setTab("companies"); };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5 pt-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">SECORA</h1>
          <p className="mt-1 text-sm text-moss">Secure ESG and Cyber Operations Risk Analyzer</p>
        </div>
        <LedgerChip verify={verify} />
      </header>

      <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label="Views">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id}
            className={`whitespace-nowrap rounded-t border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === id ? "border-ink text-ink" : "border-transparent text-moss hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </nav>

      <ControlPanel busy={busy} onDemo={loadDemo} onUpload={upload} onRerun={rerun} canRerun={!!dash && !dash.empty} />
      <Banner notice={notice} stale={dash?.stale} onDismiss={() => setNotice(null)} />

      {tab === "overview" && <Overview dash={dash} onOpen={openCompany} onDemo={loadDemo} busy={!!busy} />}
      {tab === "companies" && <Companies selected={selected} onSelect={setSelected} refreshKey={dash?.run?.id} />}
      {tab === "audit" && <AuditTrail verify={verify} onVerified={setVerify} refreshKey={dash?.ledger?.length} />}
    </div>
  );
}

function LedgerChip({ verify }) {
  if (!verify) return null;
  const empty = verify.length === 0;
  const ok = verify.valid;
  const color = empty ? "bg-rule text-ink" : ok ? "bg-low text-white" : "bg-critical text-white";
  return (
    <div className={`rounded px-3 py-2 text-sm font-semibold ${color}`} role="status">
      {empty ? "Ledger empty" : ok ? `Ledger intact · ${verify.length} records` : `Ledger broken at record ${verify.first_invalid_idx}`}
    </div>
  );
}
