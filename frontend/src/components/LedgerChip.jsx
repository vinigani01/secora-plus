import { Icon } from "./ui.jsx";

export default function LedgerChip({ verify, className = "" }) {
  if (!verify) return <span className={`skeleton inline-block h-8 w-44 rounded-full ${className}`} aria-hidden="true" />;
  const empty = verify.length === 0;
  const ok = verify.valid;
  const tone = empty ? "bg-sunk text-moss ring-rule" : ok ? "bg-low-soft text-low-fg ring-low/30" : "bg-critical-soft text-critical-fg ring-critical/40";
  return (
    <span role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${tone} ${className}`}>
      {empty ? <span className="h-2 w-2 rounded-full bg-moss" aria-hidden="true" />
        : ok ? <span className="relative flex h-2 w-2" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-low opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-low" /></span>
        : <Icon.alert className="h-4 w-4" />}
      {empty ? "Ledger empty" : ok ? `Ledger intact · ${verify.length} records` : `Ledger broken at record ${verify.first_invalid_idx}`}
    </span>
  );
}
