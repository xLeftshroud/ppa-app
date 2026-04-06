export interface UploadResponse {
  dataset_id: string;
  row_count: number;
  sku_count: number;
  customer_values: string[];
  message: string;
}

export interface SkuItem {
  product_sku_code: number;
  material_medium_description: string;
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
  baseline_elasticity: number | null;
  selected: SelectedResult | null;
  arc_elasticity: number | null;
  curve: CurvePoint[];
}

export interface SimulateRequest {
  dataset_id: string;
  product_sku_code: number | null;
  customer: string | null;
  promotion_indicator: 0 | 1;
  week: number | null;
  top_brand: string | null;
  flavor_internal: string | null;
  pack_type_internal: string | null;
  pack_size_internal: number | null;
  units_per_package_internal: number | null;
  baseline_override_price_per_litre: number | null;
  selected_price_change_pct: number | null;
  selected_new_price_per_litre: number | null;
}

export interface PredictPointsRequest {
  dataset_id: string;
  product_sku_code: number | null;
  customer: string | null;
  promotion_indicator: 0 | 1;
  week: number | null;
  top_brand: string | null;
  flavor_internal: string | null;
  pack_type_internal: string | null;
  pack_size_internal: number | null;
  units_per_package_internal: number | null;
  baseline_price: number | null;
  selected_price: number | null;
}

export interface PointPrediction {
  price_per_litre: number;
  predicted_volume: number;
  elasticity: number;
}

export interface PredictPointsResponse {
  baseline: PointPrediction | null;
  selected: PointPrediction | null;
  arc_elasticity: number | null;
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

export interface ScatterFilter {
  column: string;
  value: string;
}

export interface ScatterRequest {
  filters: ScatterFilter[];
}

export interface ScatterPoint {
  price_per_litre: number;
  nielsen_total_volume: number;
}

export interface ScatterResponse {
  points: ScatterPoint[];
  count: number;
}
