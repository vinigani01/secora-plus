import { useRef } from "react";

export default function ControlPanel({ busy, onDemo, onUpload, onRerun, canRerun }) {
  const input = useRef(null);
  const disabled = !!busy;
  const btn = "rounded px-4 py-2 text-sm font-semibold disabled:opacity-50";
  return (
    <section className="mt-5 flex flex-wrap items-center gap-3 rounded border border-rule bg-panel p-4">
      <button className={`${btn} bg-ink text-paper`} disabled={disabled} onClick={onDemo}>Load demo data</button>
      <button className={`${btn} border border-ink`} disabled={disabled} onClick={() => input.current.click()}>Upload CSV</button>
      <input ref={input} type="file" accept=".csv,text/csv" hidden
        onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) onUpload(f); }} />
      <button className={`${btn} border border-rule`} disabled={disabled || !canRerun} onClick={onRerun}>Run analysis again</button>
      <p className="ml-auto text-sm text-moss" aria-live="polite">
        {busy || "Each scoring run appends one record per company to the audit ledger."}
      </p>
    </section>
  );
}
