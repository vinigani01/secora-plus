import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtTime, short } from "../lib/risk.js";
import { Card, CopyButton, Icon, Skeleton, Spinner } from "./ui.jsx";

const PAGE = 20;

export default function AuditTrail({ verify, onVerified, refreshKey }) {
  const [blocks, setBlocks] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (offset = 0) => {
    try {
      const d = await api.blockchain(PAGE, offset);
      setTotal(d.total);
      setBlocks((prev) => (offset === 0 ? d.blocks : [...(prev ?? []), ...d.blocks]));
      setError("");
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(0); }, [load, refreshKey]);

  async function check() {
    setChecking(true);
    try { onVerified(await api.verify()); } catch (e) { setError(e.message); } finally { setChecking(false); }
  }

  const bad = verify && !verify.valid;
  const empty = verify && verify.length === 0;
  const tone = bad ? "border-critical/50 bg-critical-soft" : empty || !verify ? "" : "border-low/40 bg-low-soft";

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-6 lg:sticky lg:top-36">
        <Card className={`p-5 sm:p-6 ${tone}`} aria-live="polite">
          <div className="flex items-start gap-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bad ? "bg-critical text-white" : empty || !verify ? "bg-sunk text-moss" : "bg-low text-white"}`}>
              {!verify || checking ? <Spinner className="h-5 w-5" /> : bad ? <Icon.alert className="h-5 w-5" /> : <Icon.check className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">
                {!verify ? "Checking ledger…" : empty ? "The ledger is empty" : bad ? `Tampering detected at record ${verify.first_invalid_idx}` : "Every record matches its hash"}
              </h2>
              {verify && verify.length > 0 && (
                <p className="mt-1 text-sm text-ink/80">{bad ? verify.reason : `${verify.length} records recomputed from the genesis hash · ${fmtTime(verify.verified_at)}`}</p>
              )}
            </div>
          </div>
          {verify?.head_hash && (
            <div className="mt-4 rounded-lg bg-panel/70 p-3">
              <div className="flex items-center justify-between text-xs text-moss"><span>Head hash</span><CopyButton value={verify.head_hash} /></div>
              <p className="mt-1 break-all font-mono text-xs">{verify.head_hash}</p>
            </div>
          )}
          <button onClick={check} disabled={checking} className="btn-primary mt-4 w-full sm:w-auto">
            {checking ? <><Spinner /> Verifying…</> : "Verify chain now"}
          </button>
        </Card>

        <Card className="p-5 text-sm">
          <h3 className="font-bold">How verification works</h3>
          <p className="mt-2 text-moss">Each record stores the tuple τ = ⟨t, R, s<sub>E</sub>, s<sub>C</sub>, rid, mh⟩ and its hash:</p>
          <p className="mt-2 overflow-x-auto rounded-lg bg-sunk px-3 py-2 font-mono text-xs">h<sub>i</sub> = SHA256(CanonicalJSON(τ<sub>i</sub>) ‖ h<sub>i−1</sub>)</p>
          <p className="mt-2 text-moss">Verification walks from the genesis hash (64 zeros) and recomputes every h. Editing any stored value, or deleting a row, breaks that record and every one after it, so the first mismatch points at the tampered record.</p>
        </Card>
      </div>

      <section aria-label="Ledger records">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Records, newest first</h2>
          {total > 0 && <span className="text-sm text-moss">{total} total</span>}
        </div>
        {error && <p className="mb-3 text-sm text-critical-fg">{error}</p>}
        {!blocks && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>}

        <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-0.5 before:bg-rule">
          {(blocks ?? []).map((b) => {
            const broken = bad && b.idx === verify.first_invalid_idx;
            const after = bad && b.idx > verify.first_invalid_idx;
            return (
              <li key={b.idx} className="relative pl-9">
                <span className={`absolute left-[5px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-paper ${broken ? "bg-critical" : after ? "bg-high" : "bg-brand"}`} aria-hidden="true" />
                <div className={`card p-4 ${broken ? "border-critical/60 bg-critical-soft" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-base font-bold">Record #{b.idx}{broken && <span className="ml-2 text-sm text-critical-fg">first mismatch</span>}</span>
                    <time className="text-xs text-moss" dateTime={b.t}>{fmtTime(b.t)}</time>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <Metric label="Risk R" value={b.risk.toFixed(2)} />
                    <Metric label="ESG sE" value={b.s_e.toFixed(3)} />
                    <Metric label="Cyber sC" value={b.s_c.toFixed(3)} />
                  </div>
                  <dl className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 font-mono text-xs">
                    <Row label="request" value={b.rid} full />
                    <Row label="hash" value={b.hash} />
                    <Row label="previous" value={b.prev_hash} />
                    <Row label="model" value={b.model_hash} />
                  </dl>
                </div>
              </li>
            );
          })}
        </ol>
        {blocks && blocks.length < total && (
          <button onClick={() => load(blocks.length)} className="btn-outline mt-4 w-full">
            Show older records ({total - blocks.length} more)
          </button>
        )}
        {blocks && total === 0 && <Card className="p-8 text-center text-moss">Run an analysis to create the first records.</Card>}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-sunk px-2 py-1.5">
      <div className="text-[11px] text-moss">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value, full }) {
  return (
    <>
      <dt className="text-moss">{label}</dt>
      <dd className="truncate" title={value}>{full ? value : short(value, 16)}</dd>
      <dd><CopyButton value={value} /></dd>
    </>
  );
}
