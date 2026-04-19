"""Global project configuration: paths, seeds, column groups."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "train_dataset_cleaned.csv"
OUTPUTS = ROOT / "outputs"
OUTPUTS.mkdir(exist_ok=True)

SEEDS = [42, 123, 456, 789, 2024]
N_FOLDS = 4
N_SPLITS = 4
TEST_WEEK_RATIO = 0.20
TUNING_WALLCLOCK_SEC = 3600

TARGET = "nielsen_total_volume"
TIME_COL = "continuous_week"
DISPLAY_TIME_COL = "yearweek"
PANEL_KEYS = ["product_sku_code", "customer"]

DOMAIN_CORE_FEATURES = [
    "price_per_litre",
    "promotion_indicator",
    "pack_size_internal",
    "units_per_package_internal",
    "total_pack_volume_ml",
    "week_sin",
    "week_cos",
]
COLLINEAR_DROP = ["price_per_item", "price_per_100ml"]
CATEGORICAL_COLS = [
    "product_sku_code",
    "customer",
    "top_brand",
    "flavor_internal",
    "pack_type_internal",
    "pack_tier",
]
