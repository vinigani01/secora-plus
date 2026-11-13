import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import services
from .config import CORS_ORIGINS
from .database import init_db
from .routes import router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("secora")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        bundle = services.get_bundle()
        log.info("Model manifest %s loaded", bundle.manifest_hash[:12])
    except Exception as exc:
        log.error("Models unavailable - /api/analyze will serve the committed fallback: %s", exc)
    yield


app = FastAPI(title="SECORA API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)
app.include_router(router)


@app.get("/")
def root():
    return {"service": "SECORA", "docs": "/docs"}
