"""Feature construction for the two independent detection domains."""
import numpy as np
import pandas as pd

REQUIRED_COLUMNS = [
    "company", "sector", "environmental_score", "social_score", "governance_score",
    "composite_score", "emissions", "revenue", "esg_expenditure",
    "incident_count", "breach_count", "avg_severity", "mttd_days", "records_exposed", "critical_vulns",
]
OPTIONAL_COLUMNS = ["ticker", "prior_composite_score"]

ESG_FEATURES = [
    "environmental", "social", "governance", "composite_norm", "yoy_change",
    "emissions_intensity", "expenditure_share", "sector_relative", "score_consistency",
]
CYBER_FEATURES = [
    "incident_count", "breach_count", "avg_severity", "mttd_days", "records_exposed_log10", "critical_vulns",
]


def build_esg_features(df: pd.DataFrame) -> pd.DataFrame:
    comp = df["composite_score"].astype(float)
    grp = comp.groupby(df["sector"])
    n = grp.transform("count")
    mean = grp.transform("mean")
    std = grp.transform("std").fillna(0.0)
    g_mean = comp.mean()
    g_std = comp.std(ddof=0) or 1.0

    # Industry-normalised composite: z-score inside the sector (global fallback for tiny sectors).
    use_sector = (n >= 5) & (std > 1e-9)
    mu = mean.where(use_sector, g_mean)
    sd = std.where(use_sector, g_std)
    median = grp.transform("median").where(n >= 3, comp.median())

    prior = df["prior_composite_score"].astype(float) if "prior_composite_score" in df else comp
    prior = prior.fillna(comp)
    revenue = df["revenue"].astype(float).clip(lower=1e-9)
    pillars = df[["environmental_score", "social_score", "governance_score"]].astype(float)

    out = pd.DataFrame(index=df.index)
    out["environmental"] = pillars["environmental_score"]
    out["social"] = pillars["social_score"]
    out["governance"] = pillars["governance_score"]
    out["composite_norm"] = (comp - mu) / sd
    out["yoy_change"] = comp - prior
    out["emissions_intensity"] = df["emissions"].astype(float) / revenue
    out["expenditure_share"] = df["esg_expenditure"].astype(float) / revenue
    out["sector_relative"] = comp - median
    out["score_consistency"] = comp - pillars.mean(axis=1)
    return out[ESG_FEATURES]


def build_cyber_features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    out["incident_count"] = df["incident_count"].astype(float)
    out["breach_count"] = df["breach_count"].astype(float)
    out["avg_severity"] = df["avg_severity"].astype(float)
    out["mttd_days"] = df["mttd_days"].astype(float)
    out["records_exposed_log10"] = np.log10(1.0 + df["records_exposed"].astype(float).clip(lower=0))
    out["critical_vulns"] = df["critical_vulns"].astype(float)
    return out[CYBER_FEATURES]
