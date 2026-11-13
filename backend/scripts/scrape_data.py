"""Scrape real-world company, breach and (best-effort) ESG data to build training data.

    pip install -r requirements-scraper.txt
    python -m scripts.scrape_data --max-esg 120

Sources
  * Wikipedia "List of S&P 500 companies"  -> company universe, ticker, GICS sector   (BeautifulSoup)
  * Wikipedia "List of data breaches"      -> breach_count / records_exposed matched to companies
  * Yahoo Finance sustainability + revenue -> ESG pillar scores, revenue (best effort via yfinance)

Per-company emissions, ESG spend and most operational cyber metrics are not freely published in a
machine-readable form. Anything that could not be scraped is imputed from the seeded synthetic
generator and flagged in the `esg_real` / `breach_real` columns, so you always know what is real.
Output: data/training_companies.csv (picked up automatically by `python -m scripts.train`).
"""
import argparse
import re
import time

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup

from app.config import DATA_DIR
from app.ml import demo_data
from app.ml.features import OPTIONAL_COLUMNS, REQUIRED_COLUMNS

HEADERS = {"User-Agent": "SECORA-research/1.0 (academic project; contact: you@example.com)"}
SP500_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
BREACH_URL = "https://en.wikipedia.org/wiki/List_of_data_breaches"


def _get(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def scrape_sp500() -> pd.DataFrame:
    table = _get(SP500_URL).find("table", {"id": "constituents"})
    rows = []
    for tr in table.find_all("tr")[1:]:
        td = [c.get_text(strip=True) for c in tr.find_all("td")]
        if len(td) >= 4:
            rows.append({"ticker": td[0].replace(".", "-"), "company": td[1], "sector": td[2]})
    print(f"S&P 500 constituents: {len(rows)}")
    return pd.DataFrame(rows)


def _parse_records(text: str) -> float:
    text = re.sub(r"\[.*?\]", "", text).lower().replace(",", "")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(billion|million|thousand)?", text)
    if not m:
        return 0.0
    mult = {"billion": 1e9, "million": 1e6, "thousand": 1e3}.get(m.group(2), 1.0)
    return float(m.group(1)) * mult


def scrape_breaches() -> pd.DataFrame:
    soup = _get(BREACH_URL)
    out = []
    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True).lower() for th in table.find("tr").find_all("th")]
        if "entity" not in headers or "records" not in headers:
            continue
        ie, ir = headers.index("entity"), headers.index("records")
        iy = headers.index("year") if "year" in headers else None
        for tr in table.find_all("tr")[1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) != len(headers):  # rowspan rows - skip rather than mis-align
                continue
            out.append({"entity": cells[ie], "records": _parse_records(cells[ir]),
                        "year": cells[iy] if iy is not None else ""})
    print(f"Breach events: {len(out)}")
    return pd.DataFrame(out)


def _norm(name: str) -> str:
    name = re.sub(r"\(.*?\)|\[.*?\]", "", name.lower())
    name = re.sub(r"\b(inc|corp|corporation|company|co|ltd|plc|holdings|group|the|&)\b\.?", " ", name)
    return re.sub(r"[^a-z0-9 ]", "", name).strip()


def match_breaches(universe: pd.DataFrame, breaches: pd.DataFrame) -> pd.DataFrame:
    keys = [(_norm(e), r) for e, r in zip(breaches["entity"], breaches["records"])]
    counts, records = [], []
    for company in universe["company"]:
        n = _norm(company)
        hit = [r for k, r in keys if n and len(n) >= 4 and (n == k or re.search(rf"\b{re.escape(n)}\b", k))]
        counts.append(float(len(hit)))
        records.append(float(sum(hit)))
    out = universe.copy()
    out["breach_count_real"], out["records_exposed_real"] = counts, records
    return out


def scrape_esg(universe: pd.DataFrame, max_n: int) -> pd.DataFrame:
    """Best-effort Yahoo Finance sustainability (Sustainalytics risk points) and revenue via yfinance."""
    try:
        import yfinance as yf
    except ImportError:
        print("yfinance not installed - skipping ESG scrape")
        return universe.assign(esg_real=False)
    cols = {c: np.nan for c in ["environmental_score", "social_score", "governance_score", "composite_score", "revenue"]}
    data, real = [], []
    for i, tkr in enumerate(universe["ticker"]):
        rec = dict(cols)
        ok = False
        if i < max_n:
            try:
                tk = yf.Ticker(tkr)
                sus = tk.sustainability
                if sus is not None and not sus.empty:
                    vals = sus.iloc[:, 0].to_dict()
                    # Risk points (lower is better) -> 0-100 score (higher is better). Heuristic scaling.
                    conv = lambda k, mult: float(np.clip(100 - float(vals[k]) * mult, 0, 100))
                    rec["environmental_score"] = conv("environmentScore", 4)
                    rec["social_score"] = conv("socialScore", 4)
                    rec["governance_score"] = conv("governanceScore", 4)
                    rec["composite_score"] = conv("totalEsg", 2.2)
                    ok = True
                rev = (tk.info or {}).get("totalRevenue")
                if rev:
                    rec["revenue"] = float(rev) / 1e6
            except Exception as exc:
                print(f"  {tkr}: {type(exc).__name__}")
            time.sleep(1.0)  # be polite
        data.append(rec)
        real.append(ok)
    out = pd.concat([universe.reset_index(drop=True), pd.DataFrame(data)], axis=1)
    out["esg_real"] = real
    print(f"Real ESG scores retrieved for {sum(real)} companies")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-esg", type=int, default=120, help="max tickers to query on Yahoo Finance")
    ap.add_argument("--limit", type=int, default=0, help="only use the first N companies (0 = all)")
    args = ap.parse_args()

    universe = scrape_sp500()
    if args.limit:
        universe = universe.head(args.limit)
    universe = match_breaches(universe, scrape_breaches())
    universe = scrape_esg(universe, args.max_esg)

    base = demo_data.generate(universe=universe[["company", "ticker", "sector"]], seed=99)
    real_esg = universe["esg_real"].to_numpy()
    for col in ["environmental_score", "social_score", "governance_score", "composite_score"]:
        base.loc[real_esg, col] = universe.loc[real_esg, col].to_numpy()
    has_rev = universe["revenue"].notna().to_numpy()
    base.loc[has_rev, "revenue"] = universe.loc[has_rev, "revenue"].to_numpy()
    base["breach_count"] = np.maximum(base["breach_count"], universe["breach_count_real"].to_numpy())
    base["records_exposed"] = np.maximum(base["records_exposed"], universe["records_exposed_real"].to_numpy())
    base["esg_real"] = real_esg
    base["breach_real"] = (universe["breach_count_real"] > 0).to_numpy()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / "training_companies.csv"
    base[REQUIRED_COLUMNS + OPTIONAL_COLUMNS + ["esg_real", "breach_real"]].to_csv(path, index=False)
    print(f"Wrote {len(base)} rows -> {path}")


if __name__ == "__main__":
    main()
