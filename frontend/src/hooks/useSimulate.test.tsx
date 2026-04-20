import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSimulate } from "./useSimulate";
import { useAppStore } from "@/store/useAppStore";
import { server } from "@/test/msw/server";

const BASE = "http://localhost:8000";

function seedStore() {
  const s = useAppStore.getState();
  s.reset();
  s.setCustomer("L2_TESCO");
  s.setWeek(20);
  s.setBaselinePrice(1.5);
  s.setNewPrice(1.8);
}

describe("useSimulate", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("canSimulate is true by default", () => {
    const { result } = renderHook(() => useSimulate());
    expect(result.current.canSimulate).toBe(true);
  });

  it("runNow fetches and stores the result", async () => {
    seedStore();
    const { result } = renderHook(() => useSimulate());

    await act(async () => {
      await result.current.runNow();
    });

    await waitFor(() => {
      expect(useAppStore.getState().simulateResult).not.toBeNull();
    });
    expect(useAppStore.getState().cachedCurve).not.toBeNull();
  });

  it("reuses cached curve when fingerprint unchanged (second call uses predict-points)", async () => {
    seedStore();
    const { result } = renderHook(() => useSimulate());

    let simulateCalls = 0;
    let pointsCalls = 0;
    server.use(
      http.post(`${BASE}/v1/simulate`, () => {
        simulateCalls += 1;
        return HttpResponse.json({
          model_info: { model_name: "m", model_version: "v", features_version: "f" },
          warnings: [],
          baseline: { yearweek: 1, price_per_litre: 1.5, volume_units: 8000 },
          baseline_elasticity: -1.8,
          selected: {
            price_change_pct: 20,
            new_price_per_litre: 1.8,
            predicted_volume_units: 5500,
            delta_volume_units: -2500,
            delta_volume_pct: -0.31,
            elasticity: -1.8,
          },
          arc_elasticity: -1.75,
          curve: [{ price_per_litre: 1, predicted_volume_units: 8000 }],
        });
      }),
      http.post(`${BASE}/v1/predict-points`, () => {
        pointsCalls += 1;
        return HttpResponse.json({
          baseline: { price_per_litre: 1.5, predicted_volume: 8000, elasticity: -1.8 },
          selected: { price_per_litre: 1.9, predicted_volume: 5000, elasticity: -1.8 },
          arc_elasticity: -1.75,
        });
      })
    );

    await act(async () => {
      await result.current.runNow();
    });
    expect(simulateCalls).toBe(1);
    expect(pointsCalls).toBe(0);

    // Change only the price (not a curve-affecting feature)
    act(() => {
      useAppStore.getState().setNewPrice(1.9);
    });

    await act(async () => {
      await result.current.runNow();
    });
    // Second call should reuse curve → predict-points, NOT simulate
    expect(simulateCalls).toBe(1);
    expect(pointsCalls).toBe(1);
  });

  it("propagates API errors to error state", async () => {
    seedStore();
    server.use(
      http.post(`${BASE}/v1/simulate`, () =>
        HttpResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "bad", details: [], request_id: "r" } },
          { status: 422 }
        )
      )
    );
    const { result } = renderHook(() => useSimulate());
    await act(async () => {
      await result.current.runNow();
    });
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
  });
});
