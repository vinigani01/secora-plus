"""Seeded synthetic generator used for the demo dataset, initial training and imputation."""
import numpy as np
import pandas as pd

# sector -> (mean ESG pillar score, emissions intensity tCO2e per USD million, cyber incident rate)
SECTORS = {
    "Information Technology": (68, 12, 5.0),
    "Financials": (64, 8, 6.0),
    "Energy": (48, 900, 3.5),
    "Health Care": (66, 25, 5.5),
    "Utilities": (52, 1100, 2.5),
    "Industrials": (58, 180, 3.0),
    "Consumer Staples": (60, 95, 2.8),
    "Consumer Discretionary": (59, 60, 3.5),
    "Materials": (53, 650, 2.6),
    "Communication Services": (62, 20, 4.8),
    "Real Estate": (61, 70, 1.8),
}
NAME_A = ["Aurora", "Beacon", "Cobalt", "Delta", "Ember", "Falcon", "Granite", "Harbor", "Ionic", "Juniper",
          "Keystone", "Lumen", "Meridian", "Nimbus", "Orchid", "Pinnacle", "Quartz", "Redwood", "Summit", "Tidal"]
NAME_B = ["Systems", "Holdings", "Energy", "Capital", "Health", "Logistics", "Networks", "Materials",
          "Foods", "Power", "Labs", "Industries", "Media", "Retail", "Properties"]
COLUMNS = [
    "company", "ticker", "sector", "environmental_score", "social_score", "governance_score",
    "composite_score", "prior_composite_score", "emissions", "revenue", "esg_expenditure",
    "incident_count", "breach_count", "avg_severity", "mttd_days", "records_exposed", "critical_vulns",
]


def generate(n: int = 240, seed: int = 7, universe: pd.DataFrame = None, inject: bool = True) -> pd.DataFrame:
    """Create n companies. `universe` (company, ticker, sector) overrides the synthetic identities."""
    rng = np.random.default_rng(seed)
    if universe is not None:
        base = universe.reset_index(drop=True)
        n = len(base)
        names, tickers, sectors = base["company"].tolist(), base["ticker"].fillna("").tolist(), base["sector"].to_numpy()
    else:
        sectors = rng.choice(list(SECTORS), size=n)
        names, tickers = [], []
        for i in range(n):
            a, b = NAME_A[(i % 300) // len(NAME_B)], NAME_B[i % len(NAME_B)]
            suffix = f" {i // 300 + 1}" if i >= 300 else ""
            names.append(f"{a} {b}{suffix}")
            tickers.append((a[:2] + b[:2]).upper())

    mu = np.array([SECTORS.get(s, (58, 100, 3.5))[0] for s in sectors], dtype=float)
    intensity0 = np.array([SECTORS.get(s, (58, 100, 3.5))[1] for s in sectors], dtype=float)
    rate = np.array([SECTORS.get(s, (58, 100, 3.5))[2] for s in sectors], dtype=float)

    env = np.clip(rng.normal(mu - 2, 10, n), 5, 98)
    soc = np.clip(rng.normal(mu, 9, n), 5, 98)
    gov = np.clip(rng.normal(mu + 4, 8, n), 5, 98)
    comp = np.clip(0.4 * env + 0.3 * soc + 0.3 * gov + rng.normal(0, 1.5, n), 0, 100)
    prior = np.clip(comp + rng.normal(0, 3, n), 0, 100)
    revenue = np.exp(rng.normal(8.2, 1.0, n))  # USD millions
    intensity = intensity0 * np.exp(rng.normal(0, 0.35, n))
    spend_share = np.clip(rng.gamma(4, 0.0035, n), 0.002, 0.06)

    incidents = rng.poisson(rate).astype(float)
    breaches = rng.poisson(0.25, n).astype(float)
    severity = np.clip(rng.normal(4.6, 1.1, n), 1, 10)
    mttd = np.exp(rng.normal(np.log(18), 0.4, n))
    records = np.where(breaches > 0, np.exp(rng.normal(11, 1.2, n)) * breaches, 0.0)
    vulns = rng.poisson(3.5, n).astype(float)

    if inject:
        perm = rng.permutation(n)
        idx_e = perm[: int(0.10 * n)]
        idx_c = perm[int(0.07 * n): int(0.17 * n)]  # ~3% overlap -> anomalous in both domains
        for i in idx_e:
            kind = rng.integers(0, 3)
            if kind == 0:  # greenwashing: headline score far above pillars, little spend
                comp[i] = min(100, (env[i] + soc[i] + gov[i]) / 3 + rng.uniform(18, 30))
                spend_share[i] *= 0.2
            elif kind == 1:  # environmental collapse with rising emissions
                env[i] = max(2, env[i] - rng.uniform(30, 45))
                prior[i] = min(100, comp[i] + rng.uniform(12, 20))
                intensity[i] *= rng.uniform(4, 7)
            else:  # governance crash
                gov[i] = max(2, gov[i] - rng.uniform(35, 50))
        for i in idx_c:
            incidents[i] *= rng.uniform(4, 8)
            breaches[i] = rng.integers(2, 6)
            severity[i] = min(10, severity[i] + rng.uniform(2, 3.5))
            mttd[i] *= rng.uniform(3, 6)
            records[i] = np.exp(rng.normal(16.5, 1.0))
            vulns[i] += rng.integers(10, 25)

    df = pd.DataFrame({
        "company": names, "ticker": tickers, "sector": sectors,
        "environmental_score": env, "social_score": soc, "governance_score": gov,
        "composite_score": comp, "prior_composite_score": prior,
        "emissions": revenue * intensity, "revenue": revenue, "esg_expenditure": revenue * spend_share,
        "incident_count": np.round(incidents), "breach_count": breaches, "avg_severity": severity,
        "mttd_days": mttd, "records_exposed": np.round(records), "critical_vulns": vulns,
    })
    num = df.select_dtypes("number").columns
    df[num] = df[num].round(3)
    return df[COLUMNS]
