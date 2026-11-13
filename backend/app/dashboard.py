"""Pure aggregation: list of result dicts -> dashboard payload (works for DB rows and fallback)."""
import json
from typing import Dict, List

import numpy as np
import pandas as pd

from .config import RISK_LEVELS

TOP_FIELDS = ["company_id", "name", "ticker", "sector", "risk", "risk_level", "esg_score", "cyber_score",
              "flagged_esg", "flagged_cyber"]



def build(results: List[Dict]) -> Dict:
    if not results:
        return {"summary": {"companies": 0, "flagged": 0, "mean_risk": 0.0, "levels": {l: 0 for l in RISK_LEVELS}},
                "histogram": [], "sector_heatmap": [], "top_flagged": []}
    df = pd.DataFrame(results)
    df["flagged"] = df["flagged_esg"].astype(bool) | df["flagged_cyber"].astype(bool)
    levels = {l: int((df["risk_level"] == l).sum()) for l in RISK_LEVELS}

    edges = list(range(0, 101, 10))
    counts, _ = np.histogram(df["risk"].clip(0, 100), bins=edges)
    histogram = [{"bin": f"{edges[i]}-{edges[i + 1]}", "count": int(c)} for i, c in enumerate(counts)]

    heat = []
    for sector, g in df.groupby("sector"):
        heat.append({
            "sector": sector, "n": int(len(g)), "mean_risk": round(float(g["risk"].mean()), 2),
            "mean_esg": round(float(g["esg_score"].mean()), 3), "mean_cyber": round(float(g["cyber_score"].mean()), 3),
            "flagged": int(g["flagged"].sum()),
            "levels": {l: int((g["risk_level"] == l).sum()) for l in RISK_LEVELS},
        })
    heat.sort(key=lambda r: -r["mean_risk"])

    top = df[df["flagged"]].sort_values("risk", ascending=False).head(10)
    cols = [c for c in TOP_FIELDS if c in top.columns]
    return {
        "summary": {"companies": int(len(df)), "flagged": int(df["flagged"].sum()),
                    "mean_risk": round(float(df["risk"].mean()), 2), "levels": levels},
        "histogram": histogram,
        "sector_heatmap": heat,
        "top_flagged": json.loads(top[cols].to_json(orient="records")),
    }
