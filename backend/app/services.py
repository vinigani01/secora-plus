"""Dataset ingestion/validation and the analysis orchestration (score -> persist -> ledger)."""
import hashlib
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import dashboard as dash
from . import fallback, ledger
from .config import MODEL_DIR
from .ml import demo_data
from .ml.features import OPTIONAL_COLUMNS, REQUIRED_COLUMNS
from .ml.pipeline import Bundle, ModelUnavailable, load_bundle, score_records
from .models import AnalysisRun, AnomalyResult, Company, CyberThreat, Dataset

log = logging.getLogger("secora.services")

_bundle: Optional[Bundle] = None


class NoDatasetError(RuntimeError):
    pass


def get_bundle(force: bool = False) -> Bundle:
    global _bundle
    if _bundle is None or force:
        _bundle = load_bundle(MODEL_DIR)
    return _bundle


def model_available() -> bool:
    try:
        get_bundle()
        return True
    except Exception:
        return False


# ----------------------------------------------------------------- validation
SCORE_COLS = ["environmental_score", "social_score", "governance_score", "composite_score"]
NONNEG_COLS = ["emissions", "esg_expenditure", "incident_count", "breach_count", "mttd_days",
               "records_exposed", "critical_vulns"]


def validate_frame(df: pd.DataFrame) -> Tuple[Optional[pd.DataFrame], List[str]]:
    """Structural + range validation. Returns (clean_df, errors); clean_df is None when invalid."""
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        return None, [f"Missing required columns: {', '.join(missing)}"]
    errors: List[str] = []
    if len(df) < 3:
        errors.append(f"At least 3 companies are required for stable scoring (found {len(df)}).")
    if len(df) > 20000:
        errors.append("At most 20,000 rows are supported per upload.")

    df["company"] = df["company"].astype(str).str.strip()
    df["sector"] = df["sector"].astype(str).str.strip()
    for name, col in (("company", df["company"]), ("sector", df["sector"])):
        blanks = df.index[(col == "") | (col.str.lower() == "nan")]
        if len(blanks):
            errors.append(f"Empty {name} in rows {_rows(blanks)}.")
    dup = df["company"][df["company"].duplicated()].unique()
    if len(dup):
        errors.append(f"Duplicate company names: {', '.join(map(str, dup[:5]))}.")

    numeric = SCORE_COLS + NONNEG_COLS + ["revenue", "avg_severity"] + (
        ["prior_composite_score"] if "prior_composite_score" in df.columns else [])
    for col in numeric:
        coerced = pd.to_numeric(df[col], errors="coerce")
        if col == "prior_composite_score":
            bad = df.index[coerced.isna() & df[col].notna()]
        else:
            bad = df.index[coerced.isna()]
        if len(bad):
            errors.append(f"Column '{col}' must be numeric and non-empty (rows {_rows(bad)}).")
        df[col] = coerced
    if errors:
        return None, errors[:20]

    for col in SCORE_COLS:
        bad = df.index[(df[col] < 0) | (df[col] > 100)]
        if len(bad):
            errors.append(f"'{col}' must be within 0-100 (rows {_rows(bad)}).")
    bad = df.index[df["revenue"] <= 0]
    if len(bad):
        errors.append(f"'revenue' must be > 0 (rows {_rows(bad)}).")
    bad = df.index[(df["avg_severity"] < 0) | (df["avg_severity"] > 10)]
    if len(bad):
        errors.append(f"'avg_severity' must be within 0-10 (rows {_rows(bad)}).")
    for col in NONNEG_COLS:
        bad = df.index[df[col] < 0]
        if len(bad):
            errors.append(f"'{col}' must be >= 0 (rows {_rows(bad)}).")
    if errors:
        return None, errors[:20]
    if "ticker" not in df.columns:
        df["ticker"] = ""
    if "prior_composite_score" not in df.columns:
        df["prior_composite_score"] = None
    return df[REQUIRED_COLUMNS + OPTIONAL_COLUMNS], []


def _rows(index) -> str:
    rows = [str(int(i) + 2) for i in list(index)[:8]]  # +2: header line + 1-based
    return ", ".join(rows) + (" ..." if len(index) > 8 else "")


def parse_csv(raw: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(raw))


# ------------------------------------------------------------------ datasets
def create_dataset(db: Session, df: pd.DataFrame, name: str, source: str, filename: Optional[str], raw: bytes) -> Dataset:
    ds = Dataset(name=name, source=source, filename=filename, row_count=len(df),
                 sha256=hashlib.sha256(raw).hexdigest())
    db.add(ds)
    db.flush()
    for row in df.to_dict("records"):
        prior = row.get("prior_composite_score")
        company = Company(
            dataset_id=ds.id, name=row["company"], ticker=(row.get("ticker") or None), sector=row["sector"],
            environmental_score=row["environmental_score"], social_score=row["social_score"],
            governance_score=row["governance_score"], composite_score=row["composite_score"],
            prior_composite_score=None if pd.isna(prior) else float(prior),
            emissions=row["emissions"], revenue=row["revenue"], esg_expenditure=row["esg_expenditure"],
        )
        db.add(company)
        db.flush()
        db.add(CyberThreat(
            company_id=company.id, dataset_id=ds.id, incident_count=row["incident_count"],
            breach_count=row["breach_count"], avg_severity=row["avg_severity"], mttd_days=row["mttd_days"],
            records_exposed=row["records_exposed"], critical_vulns=row["critical_vulns"],
        ))
    db.commit()
    return ds


def get_or_create_demo_dataset(db: Session) -> Dataset:
    ds = db.execute(select(Dataset).where(Dataset.source == "demo").order_by(Dataset.id.desc())).scalars().first()
    if ds:
        return ds
    df = demo_data.generate(240, seed=7)
    return create_dataset(db, df, "SECORA demo universe (synthetic)", "demo", None,
                          df.to_csv(index=False).encode())


def serialize_dataset(ds: Dataset) -> Dict:
    return {"id": ds.id, "name": ds.name, "source": ds.source, "filename": ds.filename,
            "row_count": ds.row_count, "sha256": ds.sha256,
            "created_at": ds.created_at.isoformat() if ds.created_at else None}


def load_frame(db: Session, dataset_id: int) -> pd.DataFrame:
    rows = db.execute(
        select(Company, CyberThreat).join(CyberThreat, CyberThreat.company_id == Company.id)
        .where(Company.dataset_id == dataset_id).order_by(Company.id)
    ).all()
    recs = []
    for c, t in rows:
        recs.append({
            "company_id": c.id, "company": c.name, "ticker": c.ticker, "sector": c.sector,
            "environmental_score": c.environmental_score, "social_score": c.social_score,
            "governance_score": c.governance_score, "composite_score": c.composite_score,
            "prior_composite_score": c.prior_composite_score, "emissions": c.emissions,
            "revenue": c.revenue, "esg_expenditure": c.esg_expenditure,
            "incident_count": t.incident_count, "breach_count": t.breach_count, "avg_severity": t.avg_severity,
            "mttd_days": t.mttd_days, "records_exposed": t.records_exposed, "critical_vulns": t.critical_vulns,
        })
    return pd.DataFrame(recs)


# ------------------------------------------------------------------ analysis
def serialize_run(run: AnalysisRun) -> Dict:
    return {"id": run.id, "dataset_id": run.dataset_id, "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "model_hash": run.model_hash, "n_companies": run.n_companies, "n_flagged": run.n_flagged,
            "error": run.error}


def run_analysis(db: Session, dataset_id: Optional[int] = None) -> Dict:
    if dataset_id is None:
        ds = db.execute(select(Dataset).order_by(Dataset.id.desc())).scalars().first()
    else:
        ds = db.get(Dataset, dataset_id)
    if ds is None:
        raise NoDatasetError("No dataset found. Load the demo data or upload a CSV first.")

    run_id = uuid.uuid4().hex[:12]
    db.add(AnalysisRun(id=run_id, dataset_id=ds.id, status="running", started_at=datetime.now(timezone.utc)))
    db.commit()
    try:
        bundle = get_bundle()
        frame = load_frame(db, ds.id)
        scored = score_records(bundle, frame)
        t = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
        taus = []
        for i, (rec, cid) in enumerate(zip(scored, frame["company_id"].tolist()), start=1):
            rid = f"{run_id}-{i:04d}"
            rec["rid"] = rid
            db.add(AnomalyResult(
                run_id=run_id, company_id=int(cid), esg_score=rec["esg_score"], cyber_score=rec["cyber_score"],
                risk=rec["risk"], risk_level=rec["risk_level"], flagged_esg=rec["flagged_esg"],
                flagged_cyber=rec["flagged_cyber"], explanations=rec["explanations"], rid=rid,
            ))
            taus.append(ledger.make_tau(t, rec["risk"], rec["esg_score"], rec["cyber_score"], rid,
                                        bundle.manifest_hash))
        ledger.append_records(db, taus)
        run = db.get(AnalysisRun, run_id)
        run.status = "completed"
        run.finished_at = datetime.now(timezone.utc)
        run.model_hash = bundle.manifest_hash
        run.n_companies = len(scored)
        run.n_flagged = sum(1 for r in scored if r["flagged_esg"] or r["flagged_cyber"])
        db.commit()
        return serialize_run(run)
    except Exception as exc:
        db.rollback()
        run = db.get(AnalysisRun, run_id)
        run.status = "failed"
        run.error = f"{type(exc).__name__}: {exc}"[:590]
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise


# ------------------------------------------------------------------- queries
def latest_completed_run(db: Session) -> Optional[AnalysisRun]:
    return db.execute(select(AnalysisRun).where(AnalysisRun.status == "completed")
                      .order_by(AnalysisRun.started_at.desc())).scalars().first()


def fetch_results(db: Session, run_id: str) -> List[Dict]:
    rows = db.execute(
        select(AnomalyResult, Company).join(Company, Company.id == AnomalyResult.company_id)
        .where(AnomalyResult.run_id == run_id).order_by(AnomalyResult.risk.desc())
    ).all()
    out = []
    for r, c in rows:
        out.append({
            "company_id": c.id, "name": c.name, "ticker": c.ticker, "sector": c.sector,
            "esg_score": r.esg_score, "cyber_score": r.cyber_score, "risk": r.risk, "risk_level": r.risk_level,
            "flagged_esg": r.flagged_esg, "flagged_cyber": r.flagged_cyber,
            "flagged": bool(r.flagged_esg or r.flagged_cyber), "explanations": r.explanations, "rid": r.rid,
        })
    return out


def current_results(db: Session, run_id: Optional[str] = None) -> Dict:
    """Results of the requested/latest run, or the committed fallback (stale=True) when none exist."""
    run = db.get(AnalysisRun, run_id) if run_id else latest_completed_run(db)
    if run is not None and run.status == "completed":
        return {"stale": False, "run": serialize_run(run), "results": fetch_results(db, run.id)}
    fb = fallback.load_fallback()
    if fb:
        return {"stale": True, "run": {"id": "fallback", "status": "stale", "model_hash": fb.get("model_hash"),
                                       "finished_at": fb.get("generated_at"), "n_companies": len(fb["results"])},
                "results": fb["results"]}
    return {"stale": False, "run": None, "results": []}


def dashboard_payload(db: Session, run_id: Optional[str] = None) -> Dict:
    cur = current_results(db, run_id)
    body = dash.build(cur["results"])
    return {"stale": cur["stale"], "run": cur["run"], "empty": cur["run"] is None,
            "ledger": ledger.stats(db), **body}
