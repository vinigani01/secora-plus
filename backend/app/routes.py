import logging
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from . import ledger, services
from .config import MAX_UPLOAD_BYTES
from .database import get_db
from .models import BlockchainAudit, Dataset

log = logging.getLogger("secora.routes")
router = APIRouter(prefix="/api")


class AnalyzeRequest(BaseModel):
    dataset_id: Optional[int] = None


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "model_loaded": services.model_available()}


@router.api_route("/demo", methods=["GET", "POST"])
def demo(db: Session = Depends(get_db)):
    """Create (once) and return the built-in synthetic demo dataset."""
    ds = services.get_or_create_demo_dataset(db)
    return {"dataset": services.serialize_dataset(ds),
            "message": "Demo dataset ready. POST /api/analyze to score it."}


@router.post("/upload")
def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.")
    try:
        df = services.parse_csv(raw)
    except Exception as exc:
        raise HTTPException(422, detail={"message": "Could not parse the file as CSV.", "errors": [str(exc)[:200]]})
    clean, errors = services.validate_frame(df)
    if errors:
        raise HTTPException(422, detail={"message": "CSV validation failed.", "errors": errors})
    ds = services.create_dataset(db, clean, file.filename or "upload.csv", "upload", file.filename, raw)
    return {"dataset": services.serialize_dataset(ds), "rows": len(clean)}


@router.post("/analyze")
def analyze(req: Optional[AnalyzeRequest] = None, db: Session = Depends(get_db)):
    dataset_id = req.dataset_id if req else None
    try:
        run = services.run_analysis(db, dataset_id)
    except services.NoDatasetError as exc:
        raise HTTPException(404, str(exc))
    except Exception as exc:  # model missing/tampered, DB failure, ...
        log.exception("Analysis failed - serving committed fallback")
        db.rollback()
        return JSONResponse(status_code=200, content={
            "status": "fallback", "error": f"{type(exc).__name__}: {exc}",
            "dashboard": services.dashboard_payload(db, run_id="__fallback__"),
        })
    return {"status": "completed", "run": run, "dashboard": services.dashboard_payload(db, run["id"])}


@router.get("/results")
def results(
    run_id: Optional[str] = None, flagged_only: bool = False, level: Optional[str] = None,
    sector: Optional[str] = None, q: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000), offset: int = Query(0, ge=0), db: Session = Depends(get_db),
):
    cur = services.current_results(db, run_id)
    rows = cur["results"]
    if flagged_only:
        rows = [r for r in rows if r["flagged_esg"] or r["flagged_cyber"]]
    if level:
        rows = [r for r in rows if r["risk_level"] == level.upper()]
    if sector:
        rows = [r for r in rows if r["sector"] == sector]
    if q:
        rows = [r for r in rows if q.lower() in r["name"].lower() or q.lower() in (r.get("ticker") or "").lower()]
    rows = sorted(rows, key=lambda r: -r["risk"])
    return {"stale": cur["stale"], "run": cur["run"], "total": len(rows),
            "sectors": sorted({r["sector"] for r in cur["results"]}), "results": rows[offset: offset + limit]}


@router.get("/dashboard")
def dashboard(run_id: Optional[str] = None, db: Session = Depends(get_db)):
    return services.dashboard_payload(db, run_id)


@router.get("/blockchain")
def blockchain(limit: int = Query(25, ge=1, le=500), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    total = db.execute(select(func.count(BlockchainAudit.idx))).scalar_one()
    rows = db.execute(select(BlockchainAudit).order_by(BlockchainAudit.idx.desc()).limit(limit).offset(offset)).scalars().all()
    return {"total": total, "genesis_hash": ledger.GENESIS_HASH, "blocks": [ledger.serialize(b) for b in rows]}


@router.get("/blockchain/verify")
def blockchain_verify(db: Session = Depends(get_db)):
    return ledger.verify_chain(db)
