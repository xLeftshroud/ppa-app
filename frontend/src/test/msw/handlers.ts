import { http, HttpResponse } from "msw";
import type {
  BaselineResponse,
  CurvePoint,
  SimulateResponse,
  SkuListResponse,
} from "@/types/api";

const BASE = "http://localhost:8000";

export const fakeBaseline: BaselineResponse = {
  yearweek: 202522,
  price_per_litre: 1.55,
  volume_units: 7900,
};

const fakeCurve: CurvePoint[] = Array.from({ length: 100 }, (_, i) => ({
  price_per_litre: 0.1 + i * 0.05,
  predicted_volume_units: 10000 / (0.1 + i * 0.05),
}));

export const fakeSimulate: SimulateResponse = {
  model_info: {
    model_name: "DummyDemandModel",
    model_version: "test",
    features_version: "v1",
  },
  warnings: [],
  baseline: fakeBaseline,
  baseline_elasticity: -1.8,
  selected: {
    price_change_pct: 20,
    new_price_per_litre: 1.86,
    predicted_volume_units: 5500,
    delta_volume_units: -2400,
    delta_volume_pct: -0.304,
    elasticity: -1.8,
  },
  arc_elasticity: -1.75,
  curve: fakeCurve,
};

export const fakeSkuList: SkuListResponse = {
  items: [
    {
      product_sku_code: 100001,
      material_medium_description: "330MLCAN 3X8P FANTA ORG",
      top_brand: "FANTA",
      flavor_internal: "ORANGE",
      pack_type_internal: "CAN",
      pack_size_internal: 330,
      units_per_package_internal: 8,
    },
  ],
};

export const handlers = [
  http.get(`${BASE}/v1/catalog/skus`, () => HttpResponse.json(fakeSkuList)),
  http.get(`${BASE}/v1/catalog/customers`, () => HttpResponse.json(["L2_TESCO", "L2_ASDA"])),
  http.get(`${BASE}/v1/catalog/brands`, () => HttpResponse.json(["FANTA", "SPRITE"])),
  http.get(`${BASE}/v1/catalog/flavors`, () => HttpResponse.json(["ORANGE", "LEMON"])),
  http.get(`${BASE}/v1/catalog/pack-types`, () => HttpResponse.json(["CAN", "BOTTLE"])),
  http.get(`${BASE}/v1/baseline`, () => HttpResponse.json(fakeBaseline)),
  http.post(`${BASE}/v1/simulate`, () => HttpResponse.json(fakeSimulate)),
  http.post(`${BASE}/v1/predict-points`, () =>
    HttpResponse.json({
      baseline: { price_per_litre: 1.5, predicted_volume: 8000, elasticity: -1.8 },
      selected: { price_per_litre: 1.8, predicted_volume: 5500, elasticity: -1.8 },
      arc_elasticity: -1.75,
    })
  ),
];
