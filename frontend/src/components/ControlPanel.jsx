import { useRef, useState } from "react";
import { Icon, Spinner } from "./ui.jsx";

// Header expected by /api/upload (see services.validate_frame). Used for the template download.
const TEMPLATE = [
  "company,ticker,sector,environmental_score,social_score,governance_score,composite_score,prior_composite_score,emissions,revenue,esg_expenditure,incident_count,breach_count,avg_severity,mttd_days,records_exposed,critical_vulns",
  "Example Corp,EXC,Information Technology,62.1,58.4,71.0,63.8,60.2,12500,4200,38,3,1,5.2,24,15000,2",
].join("\n");

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE + "\n"], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "secora_template.csv" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ControlPanel({ busy, onDemo, onUpload, onRerun, canRerun }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const disabled = !!busy;

  const take = (f) => { if (f && !disabled) onUpload(f); };

  return (
    <section
      aria-label="Data and scoring"
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
      className={`card relative mt-6 overflow-hidden p-4 transition sm:p-5 ${drag ? "border-brand ring-4 ring-brand/15" : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button className="btn-primary" disabled={disabled} onClick={onDemo}>
            <Icon.play className="h-4 w-4" /> Load demo data
          </button>
          <button className="btn-outline" disabled={disabled} onClick={() => input.current.click()}>
            <Icon.upload className="h-4 w-4" /> Upload CSV
          </button>
          <input ref={input} type="file" accept=".csv,text/csv" hidden
            onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; take(f); }} />
          <button className="btn-outline" disabled={disabled || !canRerun} onClick={onRerun}>
            <Icon.refresh className="h-4 w-4" /> Run analysis again
          </button>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-moss lg:justify-end lg:text-right" aria-live="polite">
          {busy ? (
            <span className="inline-flex items-center gap-2 font-medium text-ink"><Spinner /> {busy}</span>
          ) : (
            <span>Drop a CSV anywhere on this card. Each run appends one ledger record per company.</span>
          )}
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1 font-semibold text-brand-fg hover:underline">
            <Icon.download className="h-4 w-4" /> CSV template
          </button>
        </div>
      </div>
      {drag && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-brand-soft/90 text-base font-semibold text-brand-fg">
          Drop to validate and score
        </div>
      )}
    </section>
  );
}
