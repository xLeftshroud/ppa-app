import { create } from "zustand";
import type { SkuItem, SimulateResponse, BaselineResponse } from "@/types/api";

interface AppState {
  // Dataset
  datasetId: string | null;
  rowCount: number | null;
  skuCount: number | null;

  // SKU
  selectedSku: number | null;
  skuAttributes: SkuItem | null;

  // Controls
  selectedCustomer: string | null;
  promotionIndicator: 0 | 1;
  week: number;

  // Baseline
  baseline: BaselineResponse | null;
  baselineOverride: number | null;

  // Price
  selectedPriceChangePct: number;
  selectedNewPrice: number | null;

  // Results
  simulateResult: SimulateResponse | null;

  // Actions
  setDataset: (id: string, rows: number, skus: number) => void;
  setSelectedSku: (sku: number | null, attrs: SkuItem | null) => void;
  setCustomer: (c: string | null) => void;
  setPromotion: (p: 0 | 1) => void;
  setWeek: (w: number) => void;
  setBaseline: (bl: BaselineResponse | null) => void;
  setBaselineOverride: (price: number | null) => void;
  setPriceChangePct: (pct: number) => void;
  setNewPrice: (price: number | null) => void;
  setSimulateResult: (result: SimulateResponse | null) => void;
  reset: () => void;
}

const initialState = {
  datasetId: null,
  rowCount: null,
  skuCount: null,
  selectedSku: null,
  skuAttributes: null,
  selectedCustomer: null,
  promotionIndicator: 0 as const,
  week: 1,
  baseline: null,
  baselineOverride: null,
  selectedPriceChangePct: 0,
  selectedNewPrice: null,
  simulateResult: null,
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  setDataset: (id, rows, skus) =>
    set({ datasetId: id, rowCount: rows, skuCount: skus, selectedSku: null, skuAttributes: null, baseline: null, simulateResult: null }),

  setSelectedSku: (sku, attrs) =>
    set({ selectedSku: sku, skuAttributes: attrs, baseline: null, baselineOverride: null, simulateResult: null }),

  setCustomer: (c) =>
    set({ selectedCustomer: c, baseline: null, baselineOverride: null, simulateResult: null }),

  setPromotion: (p) => set({ promotionIndicator: p, simulateResult: null }),
  setWeek: (w) => set({ week: w, simulateResult: null }),

  setBaseline: (bl) => set({ baseline: bl }),
  setBaselineOverride: (price) => set({ baselineOverride: price, simulateResult: null }),

  setPriceChangePct: (pct) => set({ selectedPriceChangePct: pct, selectedNewPrice: null }),
  setNewPrice: (price) => set({ selectedNewPrice: price }),

  setSimulateResult: (result) => set({ simulateResult: result }),
  reset: () => set(initialState),
}));
