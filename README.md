# PPA — Price Elasticity / What-if Simulation

Web application for price elasticity analysis and demand simulation. Upload training CSV data, select SKU and parameters, then explore demand curves and elasticity metrics.

## Quick Start (Docker)

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Local Development (without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

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

## Replacing the DummyPipeline with a Real Model

1. Train a scikit-learn Pipeline that accepts a DataFrame with these 10 feature columns (in order):
   `customer, top_brand, flavor_internal, pack_type_internal, promotion_indicator, pack_size_internal, units_per_package_internal, price_per_litre, week_sin, week_cos`

   Note: `product_sku_code` is NOT a model feature — it is a composite of brand/flavor/pack attributes.

2. Save it: `joblib.dump(pipeline, "backend/app/ml/pipeline.joblib")`

3. Update `backend/app/ml/metadata.json` with the correct `model_version`, `features_version`, and `price_per_litre` distribution thresholds (p1/p99)

4. Restart the backend — it will auto-detect and load the real pipeline

## CSV Format

Upload CSV files with these required columns (no missing values):

| Column | Type | Notes |
|--------|------|-------|
| `product_sku_code` | int | Unique SKU identifier |
| `customer` | enum | L2_ASDA, L2_CRTG, L2_MORRISONS, L2_SAINSBURY'S, L2_TESCO |
| `yearweek` | int | e.g. 202521, used for baseline lookup |
| `nielsen_total_volume` | int | Volume in units |
| `promotion_indicator` | int | 0 or 1 |
| `top_brand` | str | Brand name |
| `flavor_internal` | str | Flavor |
| `pack_type_internal` | str | Pack type (CAN, PET, etc.) |
| `pack_size_internal` | int | Pack size in ml (330, 550, etc.) |
| `units_per_package_internal` | int | Units per package |
| `price_per_litre` | float | Price per litre |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/datasets/upload` | Upload CSV dataset |
| GET | `/v1/catalog/skus?dataset_id=` | List SKUs with attributes |
| GET | `/v1/catalog/customers` | List valid customers |
| GET | `/v1/catalog/promotions` | List promotion values |
| POST | `/v1/catalog/sku-lookup` | Reverse-lookup SKU by attributes |
| GET | `/v1/baseline?dataset_id=&product_sku_code=&customer=` | Get baseline price/volume |
| POST | `/v1/simulate` | Run simulation (curve + elasticity) |
