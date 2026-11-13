import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import AuditTrail from "../components/AuditTrail.jsx";
import Banner from "../components/Banner.jsx";
import Companies from "../components/Companies.jsx";
import ControlPanel from "../components/ControlPanel.jsx";
import LedgerChip from "../components/LedgerChip.jsx";
import Overview from "../components/Overview.jsx";
import { CopyButton } from "../components/ui.jsx";
import { navigate } from "../lib/router.jsx";
import { fmtTime, short } from "../lib/risk.js";

const TABS = [["overview", "Overview"], ["companies", "Flagged companies"], ["audit", "Audit trail"]];

export default function Dashboard({ search }) {
  const params = new URLSearchParams(search);
  const tab = TABS.some(([id]) => id === params.get("tab")) ? params.get("tab") : "overview";
  const tabsTop = useRef(null);
  const setTab = (id) => {
    navigate(id === "overview" ? "/app" : `/app?tab=${id}`, { replace: true });
    // Start the new view at its top instead of mid-way down the previous one.
    const y = (tabsTop.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 64;
    if (window.scrollY > y) window.scrollTo({ top: y });
  };

  const [dash, setDash] = useState(null);
  const [verify, setVerify] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const datasetId = useRef(null);
  const autoDemo = useRef(false);

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
  const upload = (file) => run(`Validating and scoring ${file.name}…`, async () => {
    const u = await api.upload(file);
    datasetId.current = u.dataset.id;
    await analyze(u.dataset.id);
  });
  const rerun = () => run("Scoring…", () => analyze());

  // The landing page's "Try the demo" button links to /app?demo=1.
  useEffect(() => {
    if (params.get("demo") === "1" && !autoDemo.current) {
      autoDemo.current = true;
      navigate("/app", { replace: true });
      loadDemo();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const openCompany = (c) => { setSelected(c); setTab("companies"); };
  const runInfo = dash?.run;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Risk dashboard</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">ESG and cyber risk</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-moss">
            {runInfo ? (
              <>
                <span>Run <span className="font-mono text-ink">{runInfo.id}</span></span>
                {runInfo.finished_at && <span>· {fmtTime(runInfo.finished_at)}</span>}
                {runInfo.model_hash && (
                  <span className="inline-flex items-center gap-1" title={runInfo.model_hash}>
                    · model <span className="font-mono text-ink">{short(runInfo.model_hash, 8)}</span>
                    <CopyButton value={runInfo.model_hash} />
                  </span>
                )}
              </>
            ) : dash?.stale ? "Showing committed fallback results" : dash ? "No analysis run yet" : "Connecting to the API…"}
          </p>
        </div>
        <LedgerChip verify={verify} />
      </div>

      <ControlPanel busy={busy} onDemo={loadDemo} onUpload={upload} onRerun={rerun} canRerun={!!dash && !dash.empty} />
      <Banner notice={notice} stale={dash?.stale} onDismiss={() => setNotice(null)} />

      <div ref={tabsTop} aria-hidden="true" />
      <div className="sticky top-16 z-30 -mx-4 mt-6 bg-paper/85 px-4 py-2 backdrop-blur-md sm:mx-0 sm:px-0">
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-rule bg-panel p-1 shadow-card sm:inline-flex" aria-label="Views" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" onClick={() => setTab(id)} aria-selected={tab === id}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                tab === id ? "bg-ink text-paper shadow-sm" : "text-moss hover:bg-sunk hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {tab === "overview" && <Overview dash={dash} onOpen={openCompany} onDemo={loadDemo} busy={!!busy} />}
        {tab === "companies" && <Companies selected={selected} onSelect={setSelected} refreshKey={dash?.run?.id} />}
        {tab === "audit" && <AuditTrail verify={verify} onVerified={setVerify} refreshKey={dash?.ledger?.length} />}
      </div>
    </div>
  );
}
