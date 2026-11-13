import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./secora.db")
    # Render and Heroku-style URLs use the bare postgres:// / postgresql:// schemes.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = _database_url()
MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))

# Detector + aggregation hyper-parameters (SECORA specification).
N_ESTIMATORS = 200
CONTAMINATION = 0.15
ALPHA = 0.5
POWER_P = 3.0
RANDOM_STATE = 42

# Aggregate risk (0-100) -> category. Upper bounds are exclusive.
RISK_BANDS = [(25.0, "LOW"), (45.0, "MEDIUM"), (65.0, "HIGH"), (101.0, "CRITICAL")]
RISK_LEVELS = [label for _, label in RISK_BANDS]
