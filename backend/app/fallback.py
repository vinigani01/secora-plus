"""Stale-but-valid committed results, served when the model or database path fails."""
import json
from typing import Dict, List, Optional

from .config import DATA_DIR

FALLBACK_PATH = DATA_DIR / "fallback_results.json"


def load_fallback() -> Optional[Dict]:
    if not FALLBACK_PATH.exists():
        return None
    payload = json.loads(FALLBACK_PATH.read_text())
    results: List[Dict] = payload.get("results", [])
    for i, r in enumerate(results, start=1):
        r.setdefault("company_id", i)
        r.setdefault("rid", None)
    return payload
