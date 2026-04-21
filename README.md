# PPA — Price Elasticity / What-if Simulation

Full-stack web app for price elasticity analysis and demand simulation. Select a SKU, customer, week, and promotion, then explore the predicted demand curve and local elasticity metrics.

- **Backend**: Python FastAPI + scikit-learn (port 8000)
- **Frontend**: React 18 + TypeScript + Vite + ECharts (port 5173)

## Quick Start (Docker)

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend loads a training CSV from disk at startup (see `TRAINING_DATA_PATH` below). Make sure the file exists before starting — catalog / simulation endpoints depend on it.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` as the API base. Override with:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Testing

### Backend (pytest + FastAPI TestClient)

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -v
```

### Frontend unit / component (Vitest + React Testing Library + MSW)

```bash
cd frontend
npm run test:run       # headless
npm run test:ui        # interactive UI
```

### End-to-end (Playwright)

```bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e
```

## Environment Configuration

The backend reads settings from `backend/.env` (see `backend/.env.example`). All paths are relative to `backend/`.

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `artifacts/pipeline.joblib` | Path to trained ML pipeline |
| `METADATA_PATH` | `artifacts/metadata.json` | Path to model metadata JSON |
| `TRAINING_DATA_PATH` | `data/dataset.csv` | Path to training CSV (used for catalog, historical prices, per-SKU price quantiles) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173` | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `LLM_PROVIDER` | `openai` | Chat provider (`openai` or `ollama`) |
| `OPENAI_API_KEY` | `` | OpenAI API key for chat |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model used when provider is `openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama OpenAI-compatible base URL |
| `OLLAMA_MODEL` | `` | Local Ollama model name |
| `OLLAMA_API_KEY` | `ollama` | API key passed to Ollama's OpenAI-compatible endpoint |
| `CHAT_MAX_HISTORY` | `20` | Max chat messages retained |
| `CHAT_MAX_TOOL_ROUNDS` | `8` | Max tool-call rounds per chat turn |

Copy and edit:

```bash
cd backend
cp .env.example .env
```

For local Ollama:
- Backend on host → `OLLAMA_BASE_URL=http://localhost:11434/v1`
- Backend in Docker, Ollama on host → `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1`

## ML Pipeline

On startup, the backend calls `joblib.load(MODEL_PATH)`. If that fails, it falls back to `DummyDemandModel` (log-log model, `V = 8000 * (price/1.50)^(-1.8)` with customer / promo / seasonal multipliers).

**Feature filtering**: The backend reads the `features` list from `metadata.json` and passes only those columns to `pipeline.predict(df)`. The frontend is free to send additional fields (e.g., `product_sku_code`) — `simulation_service._filter_features()` drops any column not listed in the metadata, so the API contract stays stable while the model's feature set evolves.

The current `dummy_metadata.json` declares these features:

```
price_per_litre, customer, promotion_indicator, top_brand, flavor_internal,
pack_size_internal, units_per_package_internal, pack_type_internal,
continuous_week, week_sin, week_cos
```

Week features are derived: `week_sin = sin(2π·week/52)`, `week_cos = cos(2π·week/52)`, `continuous_week = max(dataset.continuous_week) + 1`.

## Replacing the Dummy Pipeline with a Real Model

1. Train a scikit-learn `Pipeline` that accepts a DataFrame with the feature columns listed in your `metadata.json`.
2. Save it:
   ```python
   import joblib
   joblib.dump(pipeline, "backend/artifacts/pipeline.joblib")
   ```
3. Update `backend/artifacts/metadata.json` with the correct `model_name`, `model_version`, `features` list.
4. Restart the backend — it will auto-detect and load the real pipeline.

## Price Range Shading

On startup the backend reads `TRAINING_DATA_PATH` and pre-computes per-SKU price quantiles (p1, p5, p50, p95, p99). These drive the confidence shading on the demand curve chart:

- **Red** (< p1, > p99) — low confidence (extrapolation)
- **Orange** (p1–p5, p95–p99) — medium confidence
- **White** (p5–p95) — high confidence

If the CSV is missing the chart renders without shading.

## API Endpoints

All endpoints are prefixed with `/v1` except `/health`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/v1/catalog/skus` | List SKUs with attributes |
| GET | `/v1/catalog/customers` | List distinct customers |
| GET | `/v1/catalog/brands` | List distinct brands |
| GET | `/v1/catalog/flavors` | List distinct flavors |
| GET | `/v1/catalog/pack-types` | List distinct pack types |
| GET | `/v1/historical-price?product_sku_code=&customer=` | Latest historical price/volume for SKU + customer |
| POST | `/v1/simulate` | Full demand curve (0.001–10.0 step 0.001) + baseline + selected-point elasticity |
| POST | `/v1/predict-points` | Lightweight 1–2 price-point prediction without full curve |
| POST | `/v1/scatter` | Scatter-plot data for a SKU/customer slice |
| GET | `/v1/skus` | SKU codes available from the training dataset |
| GET | `/v1/skus/{sku}/price-range` | Per-SKU price quantiles (p1/p5/p50/p95/p99) |
| GET | `/v1/chat/providers` | Enabled chat providers and default selection |
| POST | `/v1/chat` | Send a chat message (supports tool calls into simulation/optimization) |

All error responses follow:
```json
{"error": {"code": "...", "message": "...", "details": [...], "request_id": "uuid"}}
```
Error codes: `CSV_PARSE_ERROR` (400), `CSV_SCHEMA_INVALID` (422), `HISTORICAL_PRICE_NOT_FOUND` (404), `INFERENCE_ERROR` (500), `VALIDATION_ERROR` (422).

## Data Format

The training CSV loaded from `TRAINING_DATA_PATH` must include at least these columns:

| Column | Type | Notes |
|--------|------|-------|
| `product_sku_code` | int | SKU identifier |
| `customer` | str | e.g. `L2_ASDA`, `L2_TESCO` |
| `yearweek` | int | e.g. `202521` — used for historical-price lookup (latest row wins) |
| `continuous_week` | int | Monotonic week index — latest + 1 is used as the "next unseen week" in simulations |
| `nielsen_total_volume` | int/float | Historical volume |
| `promotion_indicator` | int | 0 or 1 |
| `top_brand` | str | Brand name |
| `flavor_internal` | str | Flavor |
| `pack_type_internal` | str | Pack type (CAN, PET, ...) |
| `pack_size_internal` | int | Pack size in ml |
| `units_per_package_internal` | int | Units per package |
| `price_per_litre` | float | Price per litre |
