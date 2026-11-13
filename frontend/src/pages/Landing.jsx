import { useEffect, useState } from "react";
import { api } from "../api.js";
import LedgerChip from "../components/LedgerChip.jsx";
import { Icon, Logo } from "../components/ui.jsx";
import { Link } from "../lib/router.jsx";
import { BANDS, bandFor, LEVEL_CLASS, levelLabel, powerMean } from "../lib/risk.js";

const STEPS = [
  {
    n: "01", title: "Ingest",
    body: "Upload a CSV of companies or load the built-in demo universe. Every file is checked for required columns, numeric types, value ranges and duplicate names before anything is scored.",
    tag: "/api/upload · /api/demo",
  },
  {
    n: "02", title: "Detect",
    body: "Two Isolation Forests run side by side, one on 9 ESG features and one on 6 cyber features, each with its own scaler. Each returns an anomaly score between 0 and 1.",
    tag: "200 trees · 15% contamination",
  },
  {
    n: "03", title: "Combine",
    body: "The two scores merge through a cubic power mean into a single 0-100 risk score, then fall into a Low, Medium, High or Critical band.",
    tag: "R = (½sE³ + ½sC³)^⅓",
  },
  {
    n: "04", title: "Record",
    body: "Every score is appended to a SHA-256 hash chain together with the model manifest hash. Anyone can recompute the chain and see whether a single value changed.",
    tag: "/api/blockchain/verify",
  },
];

const FEATURES = [
  { title: "Risk distribution", body: "See how the whole universe spreads across risk bands and the 0-100 score at a glance." },
  { title: "Sector heatmap", body: "Rank sectors by mean risk and spot where High and Critical companies cluster." },
  { title: "Explainable flags", body: "Open any flagged company to see which features pushed it away from normal, as z-scores." },
  { title: "Tamper-evident audit trail", body: "Browse every ledger record and re-verify the full chain from the genesis hash in one click." },
  { title: "Model provenance", body: "Each record carries the SHA-256 of the model manifest, so you know exactly which detectors produced it." },
  { title: "Graceful fallback", body: "If scoring fails, SECORA serves the last committed results and labels them as stale instead of showing nothing." },
];

const ESG = ["Environmental pillar", "Social pillar", "Governance pillar", "Industry-normalised composite", "Year-on-year change", "Emissions intensity", "ESG spend share", "Sector-relative position", "Score consistency"];
const CYBER = ["Incident count", "Breach count", "Average severity", "Mean days to detect", "Records exposed (log10)", "Critical vulnerabilities"];

export default function Landing() {
  const [verify, setVerify] = useState(null);
  const [apiDown, setApiDown] = useState(false);
  useEffect(() => {
    api.verify().then(setVerify).catch(() => setApiDown(true));
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgb(var(--rule))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:pb-24">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow rounded-full bg-brand-soft px-3 py-1">ESG + cyber risk</span>
              {!apiDown && <LedgerChip verify={verify} className="!py-1 text-xs" />}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              One risk score for ESG and cyber, with a ledger you can audit.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-moss">
              SECORA runs two independent anomaly detectors over ESG disclosures and cyber incident data, combines them into a 0-100 risk score,
              and writes every result to a SHA-256 hash chain so nobody can quietly change it later.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/app?demo=1" className="btn-primary px-5 py-3 text-base"><Icon.play className="h-4 w-4" /> Try it with demo data</Link>
              <Link to="/app" className="btn-outline px-5 py-3 text-base">Open dashboard <Icon.arrow className="h-4 w-4" /></Link>
            </div>
            <p className="mt-4 text-sm text-moss">The demo scores 240 synthetic companies across 11 sectors in a few seconds.</p>
          </div>
          <HeroCard />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y border-rule bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHead eyebrow="How it works" title="From a spreadsheet to an auditable score in four steps"
            body="Each domain is judged on its own data by its own model, so a weak ESG profile and a weak security record are detected independently and then combined." />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex flex-col rounded-2xl border border-rule bg-paper p-5">
                <span className="font-mono text-sm font-medium text-brand-fg">{s.n}</span>
                <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-moss">{s.body}</p>
                <span className="mt-4 self-start rounded-md bg-sunk px-2 py-1 font-mono text-[11px] text-ink">{s.tag}</span>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <FeatureList title="ESG detector" count={9} items={ESG} note="Pillar scores plus derived signals such as emissions per unit of revenue and how far the composite drifts from its own pillars." />
            <FeatureList title="Cyber detector" count={6} items={CYBER} note="Company-level incident and breach history. The feature builder can be swapped for CICIDS2017-style flow statistics." />
          </div>
        </div>
      </section>

      {/* Power mean playground */}
      <section id="score" className="scroll-mt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <SectionHead eyebrow="The risk score" title="Why a cubic power mean instead of an average"
              body="A plain average lets a clean record in one domain hide a serious problem in the other. Raising scores to the third power before averaging keeps a single strong anomaly visible, while two moderate scores stay moderate." />
            <ul className="mt-6 space-y-2">
              {BANDS.map((b) => (
                <li key={b.level} className="flex items-center gap-3 text-sm">
                  <span className={`inline-flex w-24 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LEVEL_CLASS[b.level].chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_CLASS[b.level].dot}`} />{levelLabel(b.level)}
                  </span>
                  <span className="tabular-nums text-moss">{b.from} – {b.level === "CRITICAL" ? 100 : `< ${b.to}`}</span>
                </li>
              ))}
            </ul>
          </div>
          <Playground />
        </div>
      </section>

      {/* Ledger */}
      <section id="ledger" className="dark scroll-mt-20 border-y border-rule bg-panel text-ink">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Audit ledger</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Change one number and the chain tells you where.</h2>
            <p className="mt-4 text-moss">
              Each result becomes a canonical tuple of computation time, risk, both domain scores, request ID and model-manifest hash.
              Its hash includes the previous record's hash, so the records form a chain back to a genesis value of 64 zeros.
            </p>
            <p className="mt-6 overflow-x-auto rounded-xl bg-sunk px-4 py-3 font-mono text-sm">
              h<sub>i</sub> = SHA256(CanonicalJSON(⟨t, R, s<sub>E</sub>, s<sub>C</sub>, rid, mh⟩) ‖ h<sub>i−1</sub>)
            </p>
            <p className="mt-4 text-moss">Verification recomputes every hash from the start. The first mismatch is the record someone edited, and everything after it is marked as untrusted.</p>
          </div>
          <ChainDiagram />
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHead eyebrow="Inside the dashboard" title="Built for the analyst who has to explain the flag" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand-fg"><Icon.check className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-moss">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Get started */}
      <section id="start" className="scroll-mt-20 border-t border-rule bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHead eyebrow="Get started" title="Three ways in" />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <StartCard title="Explore the demo" body="Score 240 synthetic companies and click through every view. Nothing to prepare.">
              <Link to="/app?demo=1" className="btn-primary w-full">Load demo data</Link>
            </StartCard>
            <StartCard title="Upload your CSV" body="At least 20 rows with unique names. Scores 0-100, severity 0-10. Header names are case-insensitive.">
              <p className="rounded-lg bg-sunk p-3 font-mono text-[11px] leading-relaxed text-moss">
                company, sector, environmental_score, social_score, governance_score, composite_score, emissions, revenue, esg_expenditure,
                incident_count, breach_count, avg_severity, mttd_days, records_exposed, critical_vulns
                <span className="text-moss/70"> + optional ticker, prior_composite_score</span>
              </p>
              <Link to="/app" className="btn-outline mt-3 w-full">Go to upload</Link>
            </StartCard>
            <StartCard title="Call the API" body="Every view in the dashboard is a plain REST endpoint. Interactive docs live at /docs on the backend.">
              <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper">{`POST /api/demo
POST /api/analyze  {"dataset_id": 1}
GET  /api/results?flagged_only=true
GET  /api/blockchain/verify`}</pre>
            </StartCard>
          </div>
        </div>
      </section>

    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-moss sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold text-ink">SECORA</span>
          · Secure ESG and Cyber Operations Risk Analyzer
        </div>
    
        <div className="flex flex-wrap items-center gap-4">
          <p>FastAPI · scikit-learn · PostgreSQL · React</p>
    
          <a
            href="https://github.com/vinigani01/secora-plus"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-brand-fg"
          >
            <Icon.github className="h-4 w-4" />
            GitHub Repository
          </a>
        </div>
      </div>
    </footer>
      
    </div>
  );
}

function SectionHead({ eyebrow, title, body }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-moss">{body}</p>}
    </div>
  );
}

function FeatureList({ title, count, items, note }) {
  return (
    <div className="rounded-2xl border border-rule bg-paper p-5">
      <div className="flex items-baseline justify-between"><h3 className="text-lg font-bold">{title}</h3><span className="text-sm text-moss">{count} features</span></div>
      <p className="mt-1 text-sm text-moss">{note}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {items.map((i) => <li key={i} className="rounded-full border border-rule bg-panel px-2.5 py-1 text-xs font-medium">{i}</li>)}
      </ul>
    </div>
  );
}

function StartCard({ title, body, children }) {
  return (
    <div className="flex flex-col rounded-2xl border border-rule bg-paper p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mb-4 mt-1.5 flex-1 text-sm text-moss">{body}</p>
      {children}
    </div>
  );
}

// Illustrative card; numbers modelled on a company from the synthetic demo universe.
function HeroCard() {
  const sE = 0.93, sC = 0.74, R = powerMean(sE, sC);
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="card relative z-10 p-5 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-moss">Illustrative example</p>
            <p className="mt-1 font-display text-xl font-bold">Falcon Media</p>
            <p className="text-sm text-moss">Communication Services</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${LEVEL_CLASS.CRITICAL.chip}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-critical" /> Critical
          </span>
        </div>
        <div className="mt-5 flex items-end gap-2">
          <span className="font-display text-6xl font-extrabold leading-none tabular-nums">{R.toFixed(1)}</span>
          <span className="pb-1.5 text-sm text-moss">/ 100 aggregate risk</span>
        </div>
        <div className="mt-5 space-y-3">
          <MiniBar label="ESG anomaly" value={sE} />
          <MiniBar label="Cyber anomaly" value={sC} />
        </div>
        <div className="mt-5 border-t border-rule pt-4">
          <p className="text-xs font-semibold text-moss">Top drivers (z-score)</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {[["Score consistency", 4.9], ["Year-on-year change", 4.7], ["Critical vulns", 3.4], ["Days to detect", 3.2]].map(([k, z]) => (
              <li key={k} className="flex items-center justify-between gap-2 rounded-lg bg-sunk px-2.5 py-1.5"><span className="truncate">{k}</span><span className="font-mono text-xs font-semibold text-critical-fg">+{z}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card absolute -bottom-6 -left-4 z-20 hidden items-center gap-3 px-4 py-3 shadow-lift sm:flex">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-low text-white"><Icon.check className="h-4 w-4" /></div>
        <div className="text-xs"><p className="font-semibold">Ledger record appended</p><p className="font-mono text-moss">h = 9f3a…c41e</p></div>
      </div>
      <div className="absolute -right-3 -top-3 -z-0 h-full w-full rounded-2xl border border-rule bg-sunk" aria-hidden="true" />
    </div>
  );
}

function MiniBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-moss">{label}</span><span className="font-semibold tabular-nums">{value.toFixed(2)}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full bg-critical" style={{ width: `${value * 100}%` }} /></div>
    </div>
  );
}

function Playground() {
  const [sE, setSE] = useState(0.85);
  const [sC, setSC] = useState(0.1);
  const R = powerMean(sE, sC);
  const avg = 50 * (sE + sC);
  const band = bandFor(R);
  const avgBand = bandFor(avg);
  return (
    <div className="card p-5 sm:p-6">
      <p className="text-sm font-semibold">Try it: move the two domain scores</p>
      <div className="mt-5 space-y-5">
        <Slider label="ESG anomaly score sE" value={sE} onChange={setSE} />
        <Slider label="Cyber anomaly score sC" value={sC} onChange={setSC} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-ink p-4">
          <p className="text-xs font-semibold text-moss">SECORA power mean (p = 3)</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{R.toFixed(1)}</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${LEVEL_CLASS[band].chip}`}>{levelLabel(band)}</span>
        </div>
        <div className="rounded-xl border border-rule p-4 opacity-80">
          <p className="text-xs font-semibold text-moss">Plain average</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-moss">{avg.toFixed(1)}</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${LEVEL_CLASS[avgBand].chip}`}>{levelLabel(avgBand)}</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-moss">
        {band !== avgBand
          ? `Here the average would call this ${levelLabel(avgBand).toLowerCase()} risk; the power mean keeps it at ${levelLabel(band).toLowerCase()}.`
          : "With balanced scores the two methods agree. Push one slider high and the other low to see them split."}
      </p>
    </div>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm"><span>{label}</span><span className="font-mono font-semibold">{value.toFixed(2)}</span></span>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(+e.target.value)}
        className="mt-2 w-full accent-[rgb(var(--brand))]" />
    </label>
  );
}

function ChainDiagram() {
  const blocks = [
    { i: 1, prev: "0000…0000", h: "a41c…7e02", ok: true },
    { i: 2, prev: "a41c…7e02", h: "5be9…19d4", ok: true },
    { i: 3, prev: "5be9…19d4", h: "c07f…e3a1", ok: false },
  ];
  return (
    <div className="dark space-y-3">
      {blocks.map((b, k) => (
        <div key={b.i}>
          <div className={`rounded-xl border p-4 font-mono text-xs ${b.ok ? "border-rule bg-sunk/60" : "border-critical/70 bg-critical/15"}`}>
            <div className="flex items-center justify-between font-sans text-sm">
              <span className="font-semibold">Record #{b.i}</span>
              {b.ok ? <span className="text-brand">verified</span> : <span className="text-critical-fg">R edited 71.2 → 31.0 · mismatch</span>}
            </div>
            <div className="mt-2 grid grid-cols-[5rem_1fr] gap-y-1 text-moss">
              <span>previous</span><span className="text-ink">{b.prev}</span>
              <span>hash</span><span className={b.ok ? "text-ink" : "text-critical-fg line-through"}>{b.h}</span>
            </div>
          </div>
          {k < blocks.length - 1 && <div className="ml-8 h-3 w-0.5 bg-rule" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
