from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(30))  # demo | upload
    filename: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    row_count: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sector: Mapped[str] = mapped_column(String(100), index=True)
    environmental_score: Mapped[float] = mapped_column(Float(53))
    social_score: Mapped[float] = mapped_column(Float(53))
    governance_score: Mapped[float] = mapped_column(Float(53))
    composite_score: Mapped[float] = mapped_column(Float(53))
    prior_composite_score: Mapped[Optional[float]] = mapped_column(Float(53), nullable=True)
    emissions: Mapped[float] = mapped_column(Float(53))  # tCO2e
    revenue: Mapped[float] = mapped_column(Float(53))  # USD millions
    esg_expenditure: Mapped[float] = mapped_column(Float(53))  # USD millions


class CyberThreat(Base):
    __tablename__ = "cyber_threats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    incident_count: Mapped[float] = mapped_column(Float(53))
    breach_count: Mapped[float] = mapped_column(Float(53))
    avg_severity: Mapped[float] = mapped_column(Float(53))
    mttd_days: Mapped[float] = mapped_column(Float(53))
    records_exposed: Mapped[float] = mapped_column(Float(53))
    critical_vulns: Mapped[float] = mapped_column(Float(53))


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20))  # running | completed | failed
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    model_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    n_companies: Mapped[int] = mapped_column(Integer, default=0)
    n_flagged: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)


class AnomalyResult(Base):
    __tablename__ = "anomaly_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    esg_score: Mapped[float] = mapped_column(Float(53))
    cyber_score: Mapped[float] = mapped_column(Float(53))
    risk: Mapped[float] = mapped_column(Float(53))
    risk_level: Mapped[str] = mapped_column(String(10), index=True)
    flagged_esg: Mapped[bool] = mapped_column(Boolean)
    flagged_cyber: Mapped[bool] = mapped_column(Boolean)
    explanations: Mapped[dict] = mapped_column(JSON)
    rid: Mapped[str] = mapped_column(String(64), index=True)


class BlockchainAudit(Base):
    __tablename__ = "blockchain_audit"
    idx: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    t: Mapped[str] = mapped_column(String(40))
    risk: Mapped[float] = mapped_column(Float(53))
    s_e: Mapped[float] = mapped_column(Float(53))
    s_c: Mapped[float] = mapped_column(Float(53))
    rid: Mapped[str] = mapped_column(String(64), unique=True)
    model_hash: Mapped[str] = mapped_column(String(64))
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), unique=True)
