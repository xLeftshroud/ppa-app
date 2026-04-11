import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { runSimulation } from "./simulate";
import { ApiError } from "./client";
import type { SimulateRequest } from "@/types/api";

const BASE = "http://localhost:8000";

const body: SimulateRequest = {
  dataset_id: "fake-dataset-id",
  product_sku_code: 100001,
  customer: "L2_TESCO",
  promotion_indicator: 0,
  week: 20,
  top_brand: "FANTA",
  flavor_internal: "ORANGE",
  pack_type_internal: "CAN",
  pack_size_internal: 330,
  units_per_package_internal: 8,
  baseline_override_price_per_litre: 1.5,
  selected_price_change_pct: null,
  selected_new_price_per_litre: 1.8,
};

describe("runSimulation", () => {
  it("returns parsed response on success", async () => {
    const res = await runSimulation(body);
    expect(res.model_info.model_name).toBe("DummyDemandModel");
    expect(res.curve.length).toBeGreaterThan(0);
    expect(res.selected?.elasticity).toBeLessThan(0);
  });

  it("throws ApiError with unified envelope fields on error", async () => {
    server.use(
      http.post(`${BASE}/v1/simulate`, () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Dataset not found",
              details: [],
              request_id: "req-123",
            },
          },
          { status: 422 }
        )
      )
    );

    await expect(runSimulation(body)).rejects.toMatchObject({
      name: "ApiError",
      code: "VALIDATION_ERROR",
      request_id: "req-123",
    });

    try {
      await runSimulation(body);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
    }
  });
});
