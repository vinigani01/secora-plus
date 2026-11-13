import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { short } from "../lib/risk.js";

const PAGE = 20;

export default function AuditTrail({ verify, onVerified, refreshKey }) {
  const [blocks, setBlocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (offset = 0) => {
    try {
      const d = await api.blockchain(PAGE, offset);
      setTotal(d.total);
      setBlocks((prev) => (offset === 0 ? d.blocks : [...prev, ...d.blocks]));
      setError("");
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(0); }, [load, refreshKey]);

  async function check() {
    setChecking(true);
    try { onVerified(await api.verify()); } catch (e) { setError(e.message); } finally { setChecking(false); }
  }

  const bad = verify && !verify.valid;
  return (
    <div className="mt-6 space-y-6">
      <section className={`rounded border p-5 ${bad ? "border-critical bg-[#F6DDE1]" : "border-rule bg-panel"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {!verify ? "Checking ledger…" : verify.length === 0 ? "The ledger is empty" : bad ? `Tampering detected at record ${verify.first_invalid_idx}` : "Every record matches its hash"}
            </h2>
            {verify && verify.length > 0 && (
              <p className="mt-1 text-sm">{bad ? verify.reason : `${verify.length} records recomputed from the genesis hash at ${verify.verified_at}.`}</p>
            )}
            {verify && <p className="mt-2 font-mono text-xs text-moss break-all">Head hash {verify.head_hash}</p>}
          </div>
          <button onClick={check} disabled={checking} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
            {checking ? "Verifying…" : "Verify chain now"}
          </button>
        </div>
      </section>
      {error && <p className="text-sm text-critical">{error}</p>}

      <ol className="relative ml-3 border-l-2 border-ink pl-6">
        {blocks.map((b) => {
          const broken = bad && b.idx === verify.first_invalid_idx;
          return (
            <li key={b.idx} className="relative pb-5">
              <span className={`absolute -left-[33px] top-1.5 h-3 w-3 rounded-full border-2 border-ink ${broken ? "bg-critical" : "bg-paper"}`} aria-hidden="true" />
              <div className={`rounded border p-3 ${broken ? "border-critical bg-[#F6DDE1]" : "border-rule bg-panel"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">Record {b.idx}</span>
                  <span className="text-xs text-moss">{b.t}</span>
                </div>
                <p className="mt-1 text-sm tabular-nums">Risk {b.risk.toFixed(2)} · ESG {b.s_e.toFixed(3)} · Cyber {b.s_c.toFixed(3)} · request {b.rid}</p>
                <dl className="mt-2 grid gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-[auto_1fr]">
                  <dt className="text-moss">hash</dt><dd title={b.hash}>{short(b.hash, 16)}</dd>
                  <dt className="text-moss">previous</dt><dd title={b.prev_hash}>{short(b.prev_hash, 16)}</dd>
                  <dt className="text-moss">model</dt><dd title={b.model_hash}>{short(b.model_hash, 16)}</dd>
                </dl>
              </div>
            </li>
          );
        })}
      </ol>
      {blocks.length < total && (
        <button onClick={() => load(blocks.length)} className="rounded border border-ink px-4 py-2 text-sm font-semibold">
          Show older records ({total - blocks.length} more)
        </button>
      )}
      {total === 0 && <p className="text-moss">Run an analysis to create the first records.</p>}
    </div>
  );
}
