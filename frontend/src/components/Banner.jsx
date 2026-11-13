import { Icon } from "./ui.jsx";

const TONE = {
  error: "border-critical/40 bg-critical-soft text-critical-fg",
  warn: "border-medium/40 bg-medium-soft text-medium-fg",
  ok: "border-low/40 bg-low-soft text-low-fg",
};

export default function Banner({ notice, stale, onDismiss }) {
  if (!stale && !notice) return null;
  return (
    <div className="mt-4 space-y-2">
      {stale && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONE.warn}`} role="alert">
          <Icon.alert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-ink">
            <strong className="text-medium-fg">Showing stale results.</strong> These come from the committed fallback file, not a live run.
            Load the demo data or upload a CSV, then run the analysis to replace them.
          </p>
        </div>
      )}
      {notice && (
        <div role="alert" className={`flex animate-rise items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONE[notice.kind] ?? TONE.ok}`}>
          {notice.kind === "ok" ? <Icon.check className="mt-0.5 h-4 w-4 shrink-0" /> : <Icon.alert className="mt-0.5 h-4 w-4 shrink-0" />}
          <div className="min-w-0 flex-1 text-ink">
            <p className="break-words">{notice.text}</p>
            {notice.details?.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5">{notice.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
            )}
          </div>
          <button onClick={onDismiss} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
            <Icon.x className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
