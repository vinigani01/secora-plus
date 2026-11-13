import logging
import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

log = logging.getLogger("secora.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(retries: int = 15, delay: float = 2.0) -> None:
    """Create tables, waiting for the database container to accept connections."""
    from . import models  # noqa: F401  (register tables)

    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(engine)
            return
        except Exception as exc:  # pragma: no cover - depends on infra timing
            log.warning("Database not ready (%s/%s): %s", attempt, retries, exc)
            time.sleep(delay)
    raise RuntimeError("Database unavailable after retries")
