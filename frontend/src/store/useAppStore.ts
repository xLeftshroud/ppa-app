import { create } from "zustand";
import type { SkuItem, SimulateResponse, BaselineResponse } from "@/types/api";

export type CustomPlot = {
  id: string;
  title: string;
  color: string;
  isVisible: boolean;
  columns: string[];
};

interface AppState {
  // Dataset
  datasetId: string | null;
  rowCount: number | null;
  skuCount: number | null;

  // SKU
  selectedSku: number | null;
  skuAttributes: SkuItem | null;

  // SKU Attributes (editable)
  attrBrand: string | null;
  attrFlavor: string | null;
  attrPackType: string | null;
  attrPackSize: number | null;
  attrUnitsPkg: number | null;

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

  // Custom Plots
  customPlots: CustomPlot[];

  // Actions
  setDataset: (id: string, rows: number, skus: number) => void;
  setSelectedSku: (sku: number | null, attrs: SkuItem | null) => void;
  setAttrBrand: (v: string | null) => void;
  setAttrFlavor: (v: string | null) => void;
  setAttrPackType: (v: string | null) => void;
  setAttrPackSize: (v: number | null) => void;
  setAttrUnitsPkg: (v: number | null) => void;
  setCustomer: (c: string | null) => void;
  setPromotion: (p: 0 | 1) => void;
  setWeek: (w: number) => void;
  setBaseline: (bl: BaselineResponse | null) => void;
  setBaselineOverride: (price: number | null) => void;
  setPriceChangePct: (pct: number) => void;
  setNewPrice: (price: number | null) => void;
  setSimulateResult: (result: SimulateResponse | null) => void;
  addCustomPlot: (plot: CustomPlot) => void;
  updateCustomPlot: (id: string, patch: Partial<CustomPlot>) => void;
  removeCustomPlot: (id: string) => void;
  reset: () => void;
}

const initialState = {
  datasetId: null,
  rowCount: null,
  skuCount: null,
  selectedSku: null,
  skuAttributes: null,
  attrBrand: null,
  attrFlavor: null,
  attrPackType: null,
  attrPackSize: null,
  attrUnitsPkg: null,
  selectedCustomer: null,
  promotionIndicator: 0 as const,
  week: 1,
  baseline: null,
  baselineOverride: null,
  selectedPriceChangePct: 0,
  selectedNewPrice: null,
  simulateResult: null,
  customPlots: [],
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  setDataset: (id, rows, skus) =>
    set({ datasetId: id, rowCount: rows, skuCount: skus, selectedSku: null, skuAttributes: null, attrBrand: null, attrFlavor: null, attrPackType: null, attrPackSize: null, attrUnitsPkg: null, baseline: null, simulateResult: null }),

  setSelectedSku: (sku, attrs) =>
    set({
      selectedSku: sku,
      skuAttributes: attrs,
      attrBrand: attrs?.top_brand ?? null,
      attrFlavor: attrs?.flavor_internal ?? null,
      attrPackType: attrs?.pack_type_internal ?? null,
      attrPackSize: attrs?.pack_size_internal ?? null,
      attrUnitsPkg: attrs?.units_per_package_internal ?? null,
      baseline: null,
      baselineOverride: null,
      simulateResult: null,
    }),

  setAttrBrand: (v) => set({ attrBrand: v, selectedSku: null, skuAttributes: null, simulateResult: null }),
  setAttrFlavor: (v) => set({ attrFlavor: v, selectedSku: null, skuAttributes: null, simulateResult: null }),
  setAttrPackType: (v) => set({ attrPackType: v, selectedSku: null, skuAttributes: null, simulateResult: null }),
  setAttrPackSize: (v) => set({ attrPackSize: v, selectedSku: null, skuAttributes: null, simulateResult: null }),
  setAttrUnitsPkg: (v) => set({ attrUnitsPkg: v, selectedSku: null, skuAttributes: null, simulateResult: null }),

  setCustomer: (c) =>
    set({ selectedCustomer: c, baseline: null, baselineOverride: null, simulateResult: null }),

  setPromotion: (p) => set({ promotionIndicator: p, simulateResult: null }),
  setWeek: (w) => set({ week: w, simulateResult: null }),

  setBaseline: (bl) => set({ baseline: bl }),
  setBaselineOverride: (price) => set({ baselineOverride: price, simulateResult: null }),

  setPriceChangePct: (pct) => set({ selectedPriceChangePct: pct, selectedNewPrice: null, simulateResult: null }),
  setNewPrice: (price) => set({ selectedNewPrice: price, simulateResult: null }),

  setSimulateResult: (result) => set({ simulateResult: result }),

  addCustomPlot: (plot) => set((s) => ({ customPlots: [...s.customPlots, plot] })),
  updateCustomPlot: (id, patch) => set((s) => ({
    customPlots: s.customPlots.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),
  removeCustomPlot: (id) => set((s) => ({
    customPlots: s.customPlots.filter((p) => p.id !== id),
  })),

  reset: () => set(initialState),
}));
