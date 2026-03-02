export interface UploadResponse {
  dataset_id: string;
  row_count: number;
  sku_count: number;
  customer_values: string[];
  message: string;
}

export interface SkuItem {
  product_sku_code: number;
  top_brand: string;
  flavor_internal: string;
  pack_type_internal: string;
  pack_size_internal: number;
  units_per_package_internal: number;
}

export interface SkuListResponse {
  items: SkuItem[];
}

export interface BaselineResponse {
  yearweek: number;
  price_per_litre: number;
  volume_units: number;
}

export interface CurvePoint {
  price_change_pct: number;
  price_per_litre: number;
  predicted_volume_units: number;
}

export interface SelectedResult {
  price_change_pct: number;
  new_price_per_litre: number;
  predicted_volume_units: number;
  delta_volume_units: number;
  delta_volume_pct: number;
  elasticity: number;
}

export interface ModelInfo {
  model_name: string;
  model_version: string;
  features_version: string;
}

export interface SimulateResponse {
  model_info: ModelInfo;
  warnings: string[];
  baseline: BaselineResponse | null;
  selected: SelectedResult;
  curve: CurvePoint[];
}

export interface SimulateRequest {
  dataset_id: string;
  product_sku_code: number;
  customer: string;
  promotion_indicator: 0 | 1;
  week: number;
  baseline_override_price_per_litre: number | null;
  selected_price_change_pct: number | null;
  selected_new_price_per_litre: number | null;
}

export interface SkuLookupRequest {
  dataset_id: string;
  top_brand: string;
  flavor_internal: string;
  pack_type_internal: string;
  pack_size_internal: number;
  units_per_package_internal: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown[];
  request_id: string;
}

export interface PriceRange {
  sku: number;
  metric: string;
  n: number;
  p1: number;
  p5: number;
  p50: number;
  p95: number;
  p99: number;
}
