"""Independent ESG / Cyber Isolation Forests, power-mean aggregation and model manifest."""
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from ..config import ALPHA, CONTAMINATION, N_ESTIMATORS, POWER_P, RANDOM_STATE, RISK_BANDS
from ..utils import canonical_json, sha256_file, sha256_hex
from .features import CYBER_FEATURES, ESG_FEATURES, build_cyber_features, build_esg_features

ARTIFACTS = {"esg": "esg_detector.joblib", "cyber": "cyber_detector.joblib"}


class ModelUnavailable(RuntimeError):
    pass


@dataclass
class DomainModel:
    name: str
    features: List[str]
    scaler: StandardScaler
    model: IsolationForest
    lo: float  # calibration: raw anomaly score at the training median -> 0
    hi: float  # calibration: raw anomaly score at the training 99.5th percentile -> 1

    def score(self, X: pd.DataFrame):
        z = self.scaler.transform(X[self.features].to_numpy(dtype=float))
        raw = -self.model.score_samples(z)
        s = np.clip((raw - self.lo) / (self.hi - self.lo), 0.0, 1.0)
        flagged = self.model.predict(z) == -1
        return z, s, flagged


@dataclass
class Bundle:
    esg: DomainModel
    cyber: DomainModel
    manifest: dict
    manifest_hash: str


def power_mean(s_e, s_c, alpha: float = ALPHA, p: float = POWER_P):
    """R = (alpha * sE^p + (1 - alpha) * sC^p)^(1/p), with sE, sC in [0, 1]."""
    s_e = np.clip(np.asarray(s_e, dtype=float), 0.0, 1.0)
    s_c = np.clip(np.asarray(s_c, dtype=float), 0.0, 1.0)
    return (alpha * s_e ** p + (1.0 - alpha) * s_c ** p) ** (1.0 / p)


def risk_level(risk: float) -> str:
    for upper, label in RISK_BANDS:
        if risk < upper:
            return label
    return RISK_BANDS[-1][1]


def _fit_domain(X: pd.DataFrame, features: List[str]):
    scaler = StandardScaler().fit(X[features].to_numpy(dtype=float))
    z = scaler.transform(X[features].to_numpy(dtype=float))
    model = IsolationForest(
        n_estimators=N_ESTIMATORS, contamination=CONTAMINATION, random_state=RANDOM_STATE, n_jobs=-1
    ).fit(z)
    raw = -model.score_samples(z)
    lo = float(np.median(raw))
    hi = float(np.percentile(raw, 99.5))
    if hi <= lo + 1e-9:
        hi = lo + 1e-6
    return scaler, model, lo, hi


def train(df: pd.DataFrame, model_dir: Path, training_source: str = "synthetic") -> dict:
    """Fit both detectors independently and write artifacts + manifest.json."""
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "name": "SECORA", "version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_rows": int(len(df)), "training_source": training_source,
        "aggregation": {"formula": "power_mean", "alpha": ALPHA, "p": POWER_P},
        "risk_bands": [[u, l] for u, l in RISK_BANDS],
        "domains": {}, "artifacts": {},
    }
    for name, feats, builder in (
        ("esg", ESG_FEATURES, build_esg_features),
        ("cyber", CYBER_FEATURES, build_cyber_features),
    ):
        X = builder(df)
        scaler, model, lo, hi = _fit_domain(X, feats)
        path = model_dir / ARTIFACTS[name]
        joblib.dump({"scaler": scaler, "model": model}, path)
        manifest["domains"][name] = {
            "features": feats, "n_estimators": N_ESTIMATORS, "contamination": CONTAMINATION,
            "random_state": RANDOM_STATE, "calibration": {"lo": lo, "hi": hi},
            "scaler_mean": [round(float(v), 8) for v in scaler.mean_],
            "scaler_scale": [round(float(v), 8) for v in scaler.scale_],
        }
        manifest["artifacts"][ARTIFACTS[name]] = sha256_file(path)
    (model_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True))
    return manifest


def load_bundle(model_dir: Path) -> Bundle:
    """Load models after verifying every artifact digest recorded in the manifest."""
    model_dir = Path(model_dir)
    manifest_path = model_dir / "manifest.json"
    if not manifest_path.exists():
        raise ModelUnavailable(f"No model manifest at {manifest_path}. Run `python -m scripts.train`.")
    manifest = json.loads(manifest_path.read_text())
    loaded = {}
    for name, fname in ARTIFACTS.items():
        path = model_dir / fname
        if not path.exists():
            raise ModelUnavailable(f"Missing model artifact {fname}")
        if sha256_file(path) != manifest["artifacts"].get(fname):
            raise ModelUnavailable(f"Artifact {fname} does not match the manifest digest (possible tampering)")
        blob = joblib.load(path)
        d = manifest["domains"][name]
        loaded[name] = DomainModel(
            name, d["features"], blob["scaler"], blob["model"],
            d["calibration"]["lo"], d["calibration"]["hi"],
        )
    return Bundle(loaded["esg"], loaded["cyber"], manifest, sha256_hex(canonical_json(manifest)))


def _explain(z_row, raw_row, features) -> List[dict]:
    items = [
        {"feature": f, "z": round(float(z), 3), "value": round(float(v), 4)}
        for f, z, v in zip(features, z_row, raw_row)
    ]
    items.sort(key=lambda d: -abs(d["z"]))
    return items


def score_records(bundle: Bundle, df: pd.DataFrame) -> List[Dict]:
    """Score every row. Returns one dict per row, in the order of `df`."""
    E = build_esg_features(df.reset_index(drop=True))
    C = build_cyber_features(df.reset_index(drop=True))
    z_e, s_e, f_e = bundle.esg.score(E)
    z_c, s_c, f_c = bundle.cyber.score(C)
    risk = power_mean(s_e, s_c) * 100.0
    out = []
    for i in range(len(E)):
        out.append({
            "esg_score": round(float(s_e[i]), 6),
            "cyber_score": round(float(s_c[i]), 6),
            "risk": round(float(risk[i]), 4),
            "risk_level": risk_level(float(risk[i])),
            "flagged_esg": bool(f_e[i]),
            "flagged_cyber": bool(f_c[i]),
            "explanations": {
                "esg": _explain(z_e[i], E.iloc[i].to_numpy(), ESG_FEATURES),
                "cyber": _explain(z_c[i], C.iloc[i].to_numpy(), CYBER_FEATURES),
            },
        })
    return out
