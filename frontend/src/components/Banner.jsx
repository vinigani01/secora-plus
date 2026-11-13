export default function Banner({ notice, stale, onDismiss }) {
  return (
    <div className="mt-4 space-y-2">
      {stale && (
        <div className="rounded border border-medium bg-[#FBF1D6] px-4 py-3 text-sm" role="alert">
          <strong>Showing stale results.</strong> These come from the committed fallback file, not a live run. Load the demo
          data or upload a CSV, then run the analysis to replace them.
        </div>
      )}
      {notice && (
        <div role="alert" className={`flex items-start justify-between gap-4 rounded border px-4 py-3 text-sm ${
          notice.kind === "error" ? "border-critical bg-[#F6DDE1]" : notice.kind === "warn" ? "border-medium bg-[#FBF1D6]" : "border-low bg-[#D9EEEA]"}`}>
          <div>
            <p>{notice.text}</p>
            {notice.details?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">{notice.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
            )}
          </div>
          <button onClick={onDismiss} className="font-semibold underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
