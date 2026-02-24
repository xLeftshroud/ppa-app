# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PPA (Price Promotion Analysis) is a full-stack monorepo for price elasticity / what-if simulation. Users upload CSV training data, select a SKU + customer + week + promotion, and the system generates a 41-point demand curve with local elasticity calculation.

## Architecture

- **`backend/`** — Python FastAPI server (port 8000)
  - `app/main.py` — App factory, lifespan (loads ML pipeline at startup), CORS, router registration
  - `app/routers/` — FastAPI route handlers: `datasets`, `catalog`, `baseline`, `simulate`
  - `app/services/` — Business logic: `dataset_service` (in-memory dict store), `catalog_service`, `baseline_service`, `simulation_service`, `pipeline_service`
  - `app/models/` — Pydantic v2 request/response schemas
  - `app/utils/` — CSV validation, feature builder (week_sin/cos), error handling middleware (request_id injection, unified error envelope)
  - `app/ml/` — DummyDemandModel (sklearn BaseEstimator), metadata.json, pipeline.joblib placeholder

- **`frontend/`** — React 18 + TypeScript + Vite (port 5173)
  - `src/api/` — Fetch-based API client with typed functions per endpoint
  - `src/store/useAppStore.ts` — Zustand global state (dataset, SKU, controls, baseline, results)
  - `src/hooks/` — TanStack Query hooks: `useSimulate` (debounced 300ms), `useBaseline`, `useCatalog`
  - `src/components/` — shadcn/ui-based components: upload zone, SKU selector, input controls, results card, ECharts demand curve
  - `src/pages/HomePage.tsx` — Two-column layout wiring all components

## Build & Run

```bash
# Docker (both services)
docker compose up --build

# Backend only
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend only
cd frontend && npm install && npm run dev
```

## Key Business Rules

- **Baseline**: Filter dataset by `sku + customer`, take row with `max(yearweek)` → baseline_price = price_per_litre, baseline_volume = nielsen_total_volume
- **Curve**: 41 points from -100% to +100% (step 5%) centered on baseline_price; prices clamped to min 0.01; deduplicated; batch predicted via `pipeline.predict(df)`
- **Elasticity**: Local ±1% center-difference at selected price point. Falls back to one-sided if P- clamped to 0.01
- **Week features**: `week_sin = sin(2*pi*week/52)`, `week_cos = cos(2*pi*week/52)`

## Unified Error Format

All API errors return: `{"error": {"code": "...", "message": "...", "details": [...], "request_id": "uuid"}}`

Error codes: CSV_PARSE_ERROR (400), CSV_SCHEMA_INVALID (422), BASELINE_NOT_FOUND (404), INFERENCE_ERROR (500), VALIDATION_ERROR (422)

## Dataset Storage

Datasets are stored in-memory (Python dict keyed by UUID). Server restart loses all uploaded datasets. For production, replace `dataset_service.py` with a persistent store.

## ML Pipeline

- On startup, tries `joblib.load("app/ml/pipeline.joblib")`; falls back to `DummyDemandModel`
- DummyDemandModel uses log-log demand: `V = 8000 * (price/1.50)^(-1.8)` with customer/promo/seasonal multipliers
- Real pipeline must accept a DataFrame with 10 feature columns (no `product_sku_code` — it's a composite of brand/flavor/pack attributes):
  `customer, top_brand, flavor_internal, pack_type_internal, promotion_indicator, pack_size_internal, units_per_package_internal, price_per_litre, week_sin, week_cos`
