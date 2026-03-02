from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.pipeline_service import load_pipeline
from app.services.price_range_service import load_training_csv
from app.utils.error_handler import RequestIdMiddleware, register_exception_handlers
from app.utils.logging_config import setup_logging
from app.routers import datasets, catalog, baseline, simulate, price_range, scatter


setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_pipeline()
    load_training_csv()
    yield


app = FastAPI(title="PPA API", version="1.0.0", lifespan=lifespan)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(datasets.router, prefix="/v1")
app.include_router(catalog.router, prefix="/v1")
app.include_router(baseline.router, prefix="/v1")
app.include_router(simulate.router, prefix="/v1")
app.include_router(price_range.router, prefix="/v1")
app.include_router(scatter.router, prefix="/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
