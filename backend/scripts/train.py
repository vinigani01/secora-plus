"""Train both Isolation Forests, write the model manifest and the committed fallback results.

    python -m scripts.train
"""
import json
from datetime import datetime, timezone

import pandas as pd

from app.config import DATA_DIR, MODEL_DIR
from app.ml import demo_data
from app.ml.features import OPTIONAL_COLUMNS, REQUIRED_COLUMNS
from app.ml.pipeline import load_bundle, score_records, train


def main() -> None:
    frames = [demo_data.generate(600, seed=1234)]
    source = "synthetic"
    scraped_path = DATA_DIR / "training_companies.csv"
    if scraped_path.exists():
        scraped = pd.read_csv(scraped_path)
        cols = [c for c in REQUIRED_COLUMNS + OPTIONAL_COLUMNS if c in scraped.columns]
        frames.append(scraped[cols])
        source = f"synthetic+scraped({len(scraped)} rows)"
    train_df = pd.concat(frames, ignore_index=True)
    manifest = train(train_df, MODEL_DIR, training_source=source)
    print(f"Trained on {manifest['training_rows']} rows ({source}) -> {MODEL_DIR}")

    bundle = load_bundle(MODEL_DIR)
    demo = demo_data.generate(240, seed=7)
    scored = score_records(bundle, demo)
    results = []
    for (_, row), rec in zip(demo.iterrows(), scored):
        results.append({"name": row["company"], "ticker": row["ticker"], "sector": row["sector"], **rec,
                        "flagged": rec["flagged_esg"] or rec["flagged_cyber"]})
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "fallback_results.json").write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model_hash": bundle.manifest_hash, "dataset": "demo (seed=7)", "results": results,
    }))
    print(f"Wrote fallback_results.json ({len(results)} companies); model hash {bundle.manifest_hash}")


if __name__ == "__main__":
    main()
