# SECORA

**Secure ESG and Cyber Operations Risk Analyzer**

SECORA scores companies on two kinds of risk at once: what their ESG disclosures look like, and what their cyber incident history looks like. Two independent Isolation Forests flag anomalies in each domain, a power mean combines them into one 0-100 risk score, and every score is written to a SHA-256 hash-chained audit ledger, so any later edit to a stored result can be detected.

Live at: https://secora-rpaz.onrender.com

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development without Docker](#local-development-without-docker)
- [Scraping data and retraining](#scraping-data-and-retraining)
- [Deploying to Render](#deploying-to-render)
- [API reference](#api-reference)
- [CSV format](#csv-format)
- [Demonstrating tamper detection](#demonstrating-tamper-detection)
- [Limitations](#limitations)
- [Roadmap](#roadmap)

## Features

**Landing page (`/`)** explains the pipeline for first-time visitors. It walks through the four steps (ingest, detect, combine, record) and lists the features each detector uses. An interactive slider compares the power mean with a plain average, and a hash-chain diagram shows how tampering is caught. "Try it with demo data" opens the dashboard and scores the demo set in one click. A badge shows the live ledger status.

**Dashboard (`/app`)**
- **Overview:** headline numbers, a risk-level donut, a 0-100 risk histogram, a sector heatmap, and the ten highest-risk flagged companies.
- **Flagged companies:** search and filter by level and sector. The inspector shows the company's risk gauge, both domain scores, its ledger request ID, and per-feature z-scores that explain why it was flagged.
- **Audit trail:** every ledger record with copyable hashes, plus one-click verification of the full chain. The first broken record is highlighted.
- **Data in:** load the demo data, upload a CSV (button or drag and drop, with structural validation and row-level error messages), download a CSV template, or re-run the analysis.
- **Failure fallback:** if scoring fails (missing or tampered model, database error), the API serves the last committed results and the UI labels them as stale instead of showing nothing.

**UI:** responsive down to phone width, light and dark themes (follows the system setting, with a toggle in the header), loading placeholders, and keyboard-accessible controls.

## How it works

```
CSV upload / demo data
        │
        ▼
 validation ──► ESG features (9) ──► StandardScaler ──► Isolation Forest ──► s_E ┐
            └─► Cyber features (6) ─► StandardScaler ──► Isolation Forest ──► s_C ┤
                                                                                  ▼
                                        R = (α·s_E^p + (1-α)·s_C^p)^(1/p) × 100, α = 0.5, p = 3
                                                                                  │
                                         LOW < 25 ≤ MEDIUM < 45 ≤ HIGH < 65 ≤ CRITICAL
                                                                                  │
                                                                                  ▼
                              τ = ⟨t, R, s_E, s_C, rid, mh⟩ ──► h = SHA256(CanonicalJSON(τ) ‖ h_prev)
```

| Piece | Detail |
|---|---|
| ESG features (9) | 3 pillar scores, industry-normalised composite (z within sector), YoY change, emissions intensity (emissions / revenue), expenditure share (ESG spend / revenue), sector-relative position (composite minus sector median), score consistency (composite minus mean of pillars) |
| Cyber features (6) | Incident count, breach count, average severity, mean days to detect, log10 records exposed, critical vulnerabilities. These are company-level; to use CICIDS2017 flow statistics instead, edit `CYBER_FEATURES` and `build_cyber_features` |
| Detectors | One `StandardScaler` + `IsolationForest(n_estimators=200, contamination=0.15)` per domain, trained and stored separately |
| Domain score | `-score_samples` calibrated to [0, 1]: the training median maps to 0, the training 99.5th percentile to 1 |
| Aggregate | Cubic power mean with α = 0.5. Cubing before averaging keeps one strong anomaly visible instead of letting a clean score in the other domain average it away |
| Risk bands | LOW < 25, MEDIUM < 45, HIGH < 65, CRITICAL ≥ 65 (edit `RISK_BANDS` in `backend/app/config.py`) |
| Explanations | Per-feature z-scores from each domain's scaler, sorted by magnitude |
| Model manifest | `models/manifest.json` records features, parameters, calibration and the SHA-256 of each model file. Models refuse to load if a file does not match. `mh` is the SHA-256 of the canonical manifest JSON |
| Ledger | One record per company per run. Genesis `h_prev` is 64 zeros. `rid` is `<run id>-<n>` and links the record to its `anomaly_results` row. Verification recomputes every hash from genesis and reports the first mismatch |
| Fallback | If scoring fails, `/api/analyze` returns HTTP 200 with `status: "fallback"` and the committed `backend/data/fallback_results.json`. `/api/dashboard` and `/api/results` do the same when no completed run exists |

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy, scikit-learn, pandas, numpy |
| Frontend | React 18, Vite, Tailwind CSS, Chart.js (react-chartjs-2) |
| Database | PostgreSQL 16 (SQLite when `DATABASE_URL` is unset, for local development) |
| Scraping | BeautifulSoup, yfinance |
| Runtime | Docker, Docker Compose, nginx (serves the built frontend) |
| Hosting | Render Blueprint (`render.yaml`) |

Database tables: `datasets`, `companies`, `cyber_threats`, `analysis_runs`, `anomaly_results`, `blockchain_audit`.

## Project structure

```
secora-plus/
├── docker-compose.yml            # db + backend + frontend
├── render.yaml                   # Render Blueprint: Postgres + 2 Docker web services
├── FEATURE_IDEAS.md              # add-ons that fit the current architecture
├── docs/screenshots/             # images used in this README
├── backend/
│   ├── Dockerfile, start.sh, requirements.txt, requirements-scraper.txt
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, startup (DB init, model load)
│   │   ├── routes.py             # all /api routes
│   │   ├── services.py           # CSV validation, ingestion, analysis, fallback logic
│   │   ├── ledger.py             # hash chain: append + verify
│   │   ├── dashboard.py          # aggregation for charts and heatmap
│   │   ├── fallback.py           # committed stale results
│   │   ├── models.py, database.py, config.py, utils.py
│   │   └── ml/ features.py, pipeline.py, demo_data.py
│   ├── scripts/ scrape_data.py, train.py
│   └── data/fallback_results.json   # generated by train.py, commit it
└── frontend/
    ├── Dockerfile, nginx.conf.template, 40-runtime-config.sh   # API URL injected at container start
    ├── index.html, tailwind.config.js, vite.config.js
    └── src/
        ├── pages/ Landing.jsx (/), Dashboard.jsx (/app)
        ├── components/           # Header, ControlPanel, Overview, Companies, Inspector, AuditTrail, ui.jsx
        ├── lib/ router.jsx, theme.jsx (light/dark tokens), risk.js, chart.js
        └── api.js                # fetch wrapper for every /api route
```

## Quick start with Docker

Requires Docker Desktop (or Docker Engine with the Compose plugin).

```bash
git clone https://github.com/<your-username>/secora.git
cd secora
docker compose up --build
```

- App: http://localhost:3000 (landing page), http://localhost:3000/app (dashboard)
- API docs (Swagger): http://localhost:8000/docs

The backend image trains both models during `docker build`, so it starts ready. Click **Try it with demo data** on the landing page, or **Load demo data** in the dashboard.

Quick API check:

```bash
curl -X POST localhost:8000/api/demo
curl -X POST localhost:8000/api/analyze -H 'content-type: application/json' -d '{}'
curl localhost:8000/api/blockchain/verify
```

Reset everything, including the database volume: `docker compose down -v`.

## Local development without Docker

**Backend** (from `backend/`, Python 3.12):

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.train              # creates models/ and data/fallback_results.json
uvicorn app.main:app --reload        # http://localhost:8000
```

Leave `DATABASE_URL` unset to use a local SQLite file, or point it at Postgres:
`DATABASE_URL=postgresql://secora:secora@localhost:5432/secora`.

**Frontend** (from `frontend/`, Node 18+):

```bash
npm install
npm run dev                          # http://localhost:5173, proxies /api to :8000
```

`npm run build` writes the production bundle to `frontend/dist/`.

## Scraping data and retraining

```bash
cd backend
pip install -r requirements.txt -r requirements-scraper.txt
python -m scripts.scrape_data --max-esg 120   # writes data/training_companies.csv
python -m scripts.train                       # writes models/*.joblib, manifest.json, data/fallback_results.json
```

What the scraper collects:
- The S&P 500 universe, its sectors, and a breach history, from Wikipedia (BeautifulSoup).
- Best-effort Yahoo Finance ESG scores and revenue through `yfinance`, for the first `--max-esg` tickers. Yahoo returns nothing for many tickers, and its layout changes.

Per-company emissions, ESG spend and operational cyber metrics are not freely available. Missing values are imputed from the seeded generator and marked by the `esg_real` and `breach_real` columns in the CSV. Treat the imputed columns as synthetic, and check the scraped sites' terms of use before running the scraper at scale.

`train.py` always adds 600 synthetic companies to the scraped rows. After retraining, rebuild the backend image (`docker compose build backend`), and commit `data/fallback_results.json` and `data/training_companies.csv`.

## Deploying to Render

1. Push the repo to GitHub, including `backend/data/fallback_results.json`.
2. In Render, choose **New > Blueprint** and select the repo. `render.yaml` creates `secora-db` (Postgres), `secora-backend` and `secora-frontend`.
3. After the first deploy, note each service's public URL. If Render added a suffix because a name was taken, update the URLs:
   - `secora-backend` > Environment > `CORS_ORIGINS`: set it to the frontend URL.
   - `secora-frontend` > Environment > `API_BASE_URL`: set it to the backend URL, with no trailing slash.

   Then redeploy both services. The frontend needs no rebuild, because the URL is written into `config.js` when the container starts.
4. Open the frontend URL and click **Try it with demo data**. Check that `https://<backend>/api/health` returns `"status": "ok"`.

Free-plan notes:
- Free web services sleep after inactivity, so the first request can take about a minute.
- Free Postgres databases expire after 30 days.
- Backend build time includes model training, which takes under a minute.

## API reference

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Database check and whether the models loaded |
| GET, POST | `/api/demo` | Create (once) and return the built-in synthetic demo dataset |
| POST | `/api/upload` | Upload a CSV (multipart `file`). Validates structure and ranges; returns 422 with a list of errors on failure |
| POST | `/api/analyze` | Body `{"dataset_id": n}` or `{}` for the latest dataset. Scores companies, stores results, appends ledger records. Returns `status: "completed"` or `status: "fallback"` |
| GET | `/api/results` | Scored companies with explanations. Query: `run_id`, `flagged_only`, `level`, `sector`, `q`, `limit`, `offset` |
| GET | `/api/dashboard` | Summary, histogram, sector heatmap and top flagged companies. Query: `run_id` |
| GET | `/api/blockchain` | Ledger records, newest first. Query: `limit`, `offset` |
| GET | `/api/blockchain/verify` | Recomputes the chain. Returns `valid`, `length`, `head_hash`, `first_invalid_idx`, `reason` |

Interactive docs are served at `/docs` on the backend.

## CSV format

Header names are case-insensitive. You need at least 20 rows with unique company names. Score columns must be 0-100 and `avg_severity` 0-10. `revenue` must be above 0, and counts must not be negative. The dashboard's **CSV template** link downloads a file with this header.

| Column | Meaning |
|---|---|
| `company`, `sector` | Name and sector (required) |
| `environmental_score`, `social_score`, `governance_score`, `composite_score` | ESG scores, 0-100 |
| `emissions` | tCO2e |
| `revenue`, `esg_expenditure` | USD millions |
| `incident_count`, `breach_count`, `critical_vulns` | Counts |
| `avg_severity` | 0-10 |
| `mttd_days` | Mean days to detect |
| `records_exposed` | Records exposed in breaches |
| `ticker`, `prior_composite_score` | Optional; the prior score drives the YoY feature |

## Demonstrating tamper detection

```bash
docker compose exec db psql -U secora -d secora -c "UPDATE blockchain_audit SET risk = 1 WHERE idx = 5;"
curl localhost:8000/api/blockchain/verify    # valid: false, first_invalid_idx: 5
```

The ledger badge turns red, and the Audit trail tab highlights record 5 as the first mismatch.

To see the fallback path, change one byte of `backend/models/esg_detector.joblib` and restart the backend. The model then fails its manifest check, and **Run analysis again** serves the committed results with a stale-results banner.

## Roadmap

[FEATURE_IDEAS.md](FEATURE_IDEAS.md) lists 11 additions that fit the current design, with effort estimates and the files each one touches. Among them: anchoring the ledger head hash outside the database, API-key protection, results export, run-to-run comparison, what-if sliders for α and p, and a data-drift warning.
