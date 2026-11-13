"""Tamper-evident audit ledger.

Each record is the canonical risk tuple  tau = <t, R, sE, sC, rid, mh>  and is chained:

    h_current = SHA256( CanonicalJSON(tau) || h_previous )

The first record chains to GENESIS_HASH. Altering, deleting or re-ordering any
record changes every later hash, which `verify_chain` detects by recomputation.
"""
from datetime import datetime, timezone
from typing import Dict, List

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from .models import BlockchainAudit
from .utils import canonical_json, sha256_hex

GENESIS_HASH = "0" * 64
_LOCK_KEY = 727001  # Postgres advisory-lock id so concurrent analyses cannot fork the chain


def make_tau(t: str, risk: float, s_e: float, s_c: float, rid: str, mh: str) -> Dict:
    return {
        "t": t,
        "R": round(float(risk), 6),
        "sE": round(float(s_e), 6),
        "sC": round(float(s_c), 6),
        "rid": rid,
        "mh": mh,
    }


def chain_hash(tau: Dict, prev_hash: str) -> str:
    return sha256_hex(canonical_json(tau) + prev_hash)


def append_records(db: Session, taus: List[Dict]) -> List[BlockchainAudit]:
    """Append tuples to the ledger inside the caller's transaction."""
    if db.bind.dialect.name == "postgresql":
        db.execute(text(f"SELECT pg_advisory_xact_lock({_LOCK_KEY})"))
    last = db.execute(
        select(BlockchainAudit).order_by(BlockchainAudit.idx.desc()).limit(1)
    ).scalar_one_or_none()
    prev = last.hash if last else GENESIS_HASH
    blocks = []
    for tau in taus:
        h = chain_hash(tau, prev)
        block = BlockchainAudit(
            t=tau["t"], risk=tau["R"], s_e=tau["sE"], s_c=tau["sC"], rid=tau["rid"],
            model_hash=tau["mh"], prev_hash=prev, hash=h,
        )
        db.add(block)
        blocks.append(block)
        prev = h
    db.flush()
    return blocks


def verify_chain(db: Session) -> Dict:
    """Recompute the full chain from genesis and report the first inconsistency."""
    rows = db.execute(select(BlockchainAudit).order_by(BlockchainAudit.idx.asc())).scalars().all()
    expected_prev = GENESIS_HASH
    result = {
        "valid": True, "length": len(rows), "head_hash": rows[-1].hash if rows else GENESIS_HASH,
        "genesis_hash": GENESIS_HASH, "first_invalid_idx": None, "reason": None,
        "verified_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    for row in rows:
        if row.prev_hash != expected_prev:
            result.update(valid=False, first_invalid_idx=row.idx,
                          reason="Broken link: previous hash does not match (record removed, inserted or re-ordered).")
            return result
        tau = make_tau(row.t, row.risk, row.s_e, row.s_c, row.rid, row.model_hash)
        if chain_hash(tau, row.prev_hash) != row.hash:
            result.update(valid=False, first_invalid_idx=row.idx,
                          reason="Record contents do not match their stored hash (record was altered).")
            return result
        expected_prev = row.hash
    return result


def stats(db: Session) -> Dict:
    count = db.execute(select(func.count(BlockchainAudit.idx))).scalar_one()
    last = db.execute(select(BlockchainAudit).order_by(BlockchainAudit.idx.desc()).limit(1)).scalar_one_or_none()
    return {"length": count, "head_hash": last.hash if last else GENESIS_HASH}


def serialize(block: BlockchainAudit) -> Dict:
    return {
        "idx": block.idx, "t": block.t, "risk": block.risk, "s_e": block.s_e, "s_c": block.s_c,
        "rid": block.rid, "model_hash": block.model_hash, "prev_hash": block.prev_hash, "hash": block.hash,
    }
