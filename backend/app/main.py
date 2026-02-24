from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.pipeline_service import load_pipeline
from app.utils.error_handler import RequestIdMiddleware, register_exception_handlers
from app.utils.logging_config import setup_logging
from app.routers import datasets, catalog, baseline, simulate


setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_pipeline()
    yield


app = FastAPI(title="PPA API", version="1.0.0", lifespan=lifespan)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(datasets.router, prefix="/v1")
app.include_router(catalog.router, prefix="/v1")
app.include_router(baseline.router, prefix="/v1")
app.include_router(simulate.router, prefix="/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
