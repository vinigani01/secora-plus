# SECORA: features you can add without a rewrite

Each idea builds on endpoints and tables that already exist. Effort: S = an evening, M = a weekend, L = longer.
Ordered by value for the effort, with the two security gaps first because they matter if this is ever shown as "tamper-evident".

## Security gaps worth closing first

### 1. Anchor the ledger head hash outside the database (M)
A hash chain stored in the same database it protects only catches partial edits. Anyone with write access to
`blockchain_audit` can change a record and recompute every hash after it, and `/api/blockchain/verify` will still say "intact".
Fix: after each `/api/analyze`, publish the new head hash somewhere the DB owner cannot rewrite (a signed git commit, an
append-only S3 object with object lock, or an RFC 3161 timestamping service), and have verify compare against the latest anchor.
- Touches: `backend/app/ledger.py` (anchor + compare), new `anchors` table in `models.py`, one extra line in the Audit trail card.

### 2. Protect the write endpoints (S)
`/api/upload`, `/api/demo` and `/api/analyze` are open, so anyone who finds the Render URL can append records to your ledger.
Add an `X-API-Key` dependency on those three routes, read the key from an env var in `render.yaml`, and send it from the
frontend only when the user enters it (keep read-only views public).
- Touches: `backend/app/routes.py`, `backend/app/config.py`, `frontend/src/api.js`, `render.yaml`.

## Analyst features

### 3. Export results (S)
"Download CSV" and "Download JSON" buttons on the Flagged companies tab, built from `/api/results` with the current filters.
- Touches: `frontend/src/components/Companies.jsx` only.

### 4. Click a sector to drill in (S)
Clicking a heatmap row switches to Flagged companies with that sector pre-filtered.
- Touches: `Overview.jsx`, `Companies.jsx`, `pages/Dashboard.jsx` (pass the filter through).

### 5. What-if sliders for alpha and p in the inspector (S)
Recompute R client-side from the company's `esg_score` and `cyber_score` with `powerMean()` (already in `lib/risk.js`)
so an analyst can see how sensitive a band is to the weighting. Label it a preview; the ledger keeps the official value.
- Touches: `Inspector.jsx`.

### 6. Run history and run-to-run comparison (M)
`/api/results` and `/api/dashboard` already accept `run_id`. Add `GET /api/runs` (list `analysis_runs`), a run picker in the
dashboard header, and a "changed since last run" view showing companies whose band moved.
- Touches: `routes.py` (one route), `pages/Dashboard.jsx`, new `components/RunCompare.jsx`.

### 7. Peer comparison in the inspector (M)
Next to each z-score bar, show the sector median for that feature, computed from `/api/results?sector=...`.
Explanations already carry the raw `value`, so no backend change is needed.
- Touches: `Inspector.jsx`.

### 8. Downloadable ledger proof per record (S-M)
A "Download proof" button on each audit record producing JSON with the tuple, `prev_hash`, `hash` and a 10-line Python
snippet that recomputes the hash offline. Strong demo for the "auditable" claim.
- Touches: `AuditTrail.jsx`; optionally `GET /api/blockchain/{idx}` in `routes.py`.

### 9. Upload dry-run (S)
`POST /api/upload?dry_run=true` runs `validate_frame` and returns the errors or a row count without creating a dataset,
so the UI can show a preview table before scoring.
- Touches: `routes.py`, `ControlPanel.jsx`.

## Model and operations

### 10. Data-drift warning (M)
`models/manifest.json` already stores calibration. Store per-feature training mean and std there too, and flag uploads
whose feature means sit more than 2 std away, since Isolation Forest scores are meaningless on a shifted population.
- Touches: `ml/pipeline.py`, `services.py`, a banner in the dashboard.

### 11. Scheduled re-scoring with alerts (L)
A Render cron job that re-runs the scraper and `/api/analyze` weekly and emails or posts to Slack when a company enters
CRITICAL. Needs #2 first.
- Touches: new `scripts/scheduled_run.py`, a `cron` service in `render.yaml`.
