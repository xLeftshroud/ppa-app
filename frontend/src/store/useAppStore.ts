import { create } from "zustand";
import type { SkuItem, SimulateResponse, HistoricalPriceResponse, CurvePoint, PriceRange } from "@/types/api";

export type CustomPlot = {
  id: string;
  title: string;
  color: string;
  isVisible: boolean;
  columns: string[];
};

interface AppState {
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
  week: number | null;

  // Historical reference + user's simulation baseline
  historicalPrice: HistoricalPriceResponse | null;
  baselinePrice: number | null;

  // Price
  priceInputMode: "direct" | "percentage";
  selectedPriceChangePct: number;
  selectedNewPrice: number | null;

  // Results
  simulateResult: SimulateResponse | null;
  priceRange: PriceRange | null;

  // Committed attrs snapshot (updated only on simulate, used by scatter overlays)
  committedAttrs: {
    selectedSku: number | null;
    attrBrand: string | null;
    attrFlavor: string | null;
    attrPackType: string | null;
    attrPackSize: number | null;
    attrUnitsPkg: number | null;
    selectedCustomer: string | null;
    promotionIndicator: 0 | 1;
  } | null;

  // Curve cache
  cachedCurve: CurvePoint[] | null;
  cachedCurveFingerprint: string | null;

  // Custom Plots
  customPlots: CustomPlot[];

  // Actions
  setSelectedSku: (sku: number | null, attrs: SkuItem | null) => void;
  setAttrBrand: (v: string | null) => void;
  setAttrFlavor: (v: string | null) => void;
  setAttrPackType: (v: string | null) => void;
  setAttrPackSize: (v: number | null) => void;
  setAttrUnitsPkg: (v: number | null) => void;
  setCustomer: (c: string | null) => void;
  setPromotion: (p: 0 | 1) => void;
  setWeek: (w: number | null) => void;
  setHistoricalPrice: (hp: HistoricalPriceResponse | null) => void;
  setBaselinePrice: (price: number | null) => void;
  setPriceInputMode: (mode: "direct" | "percentage") => void;
  setPriceChangePct: (pct: number) => void;
  setNewPrice: (price: number | null) => void;
  setSimulateResult: (result: SimulateResponse | null) => void;
  setPriceRange: (pr: PriceRange | null) => void;
  commitAttrs: () => void;
  setCachedCurve: (curve: CurvePoint[], fingerprint: string) => void;
  clearSkuAttrs: () => void;
  addCustomPlot: (plot: CustomPlot) => void;
  updateCustomPlot: (id: string, patch: Partial<CustomPlot>) => void;
  removeCustomPlot: (id: string) => void;
  clearCustomPlots: () => void;
  reset: () => void;
}

const initialState = {
  selectedSku: null,
  skuAttributes: null,
  attrBrand: null,
  attrFlavor: null,
  attrPackType: null,
  attrPackSize: null,
  attrUnitsPkg: null,
  selectedCustomer: null,
  promotionIndicator: 0 as const,
  week: null,
  historicalPrice: null,
  baselinePrice: null,
  priceInputMode: "direct" as const,
  selectedPriceChangePct: 0,
  selectedNewPrice: null,
  simulateResult: null,
  priceRange: null,
  cachedCurve: null,
  cachedCurveFingerprint: null,
  committedAttrs: null,
  customPlots: [],
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  setSelectedSku: (sku, attrs) =>
    set(sku != null
      ? {
          selectedSku: sku,
          skuAttributes: attrs,
          attrBrand: attrs?.top_brand ?? null,
          attrFlavor: attrs?.flavor_internal ?? null,
          attrPackType: attrs?.pack_type_internal ?? null,
          attrPackSize: attrs?.pack_size_internal ?? null,
          attrUnitsPkg: attrs?.units_per_package_internal ?? null,
          historicalPrice: null,
          baselinePrice: null,
          cachedCurve: null,
          cachedCurveFingerprint: null,
        }
      : {
          selectedSku: null,
          skuAttributes: null,
        },
    ),

  setAttrBrand: (v) => set({ attrBrand: v, selectedSku: null, skuAttributes: null, cachedCurve: null, cachedCurveFingerprint: null }),
  setAttrFlavor: (v) => set({ attrFlavor: v, selectedSku: null, skuAttributes: null, cachedCurve: null, cachedCurveFingerprint: null }),
  setAttrPackType: (v) => set({ attrPackType: v, selectedSku: null, skuAttributes: null, cachedCurve: null, cachedCurveFingerprint: null }),
  setAttrPackSize: (v) => set({ attrPackSize: v, selectedSku: null, skuAttributes: null, cachedCurve: null, cachedCurveFingerprint: null }),
  setAttrUnitsPkg: (v) => set({ attrUnitsPkg: v, selectedSku: null, skuAttributes: null, cachedCurve: null, cachedCurveFingerprint: null }),

  setCustomer: (c) =>
    set({ selectedCustomer: c, historicalPrice: null, baselinePrice: null, cachedCurve: null, cachedCurveFingerprint: null }),

  setPromotion: (p) => set({ promotionIndicator: p, cachedCurve: null, cachedCurveFingerprint: null }),
  setWeek: (w) => set({ week: w, cachedCurve: null, cachedCurveFingerprint: null }),

  setHistoricalPrice: (hp) => set({ historicalPrice: hp }),
  setBaselinePrice: (price) => set({ baselinePrice: price }),

  setPriceInputMode: (mode) => set(mode === "percentage" ? { priceInputMode: mode, selectedNewPrice: null } : { priceInputMode: mode }),
  setPriceChangePct: (pct) => set({ selectedPriceChangePct: pct, selectedNewPrice: null }),
  setNewPrice: (price) => set({ selectedNewPrice: price }),

  setSimulateResult: (result) => set({ simulateResult: result }),
  setPriceRange: (pr) => set({ priceRange: pr }),
  commitAttrs: () => set((s) => ({
    committedAttrs: {
      selectedSku: s.selectedSku,
      attrBrand: s.attrBrand,
      attrFlavor: s.attrFlavor,
      attrPackType: s.attrPackType,
      attrPackSize: s.attrPackSize,
      attrUnitsPkg: s.attrUnitsPkg,
      selectedCustomer: s.selectedCustomer,
      promotionIndicator: s.promotionIndicator,
    },
  })),
  setCachedCurve: (curve, fingerprint) => set({ cachedCurve: curve, cachedCurveFingerprint: fingerprint }),

  clearSkuAttrs: () => set({ selectedSku: null, skuAttributes: null, attrBrand: null, attrFlavor: null, attrPackType: null, attrPackSize: null, attrUnitsPkg: null, historicalPrice: null, baselinePrice: null, cachedCurve: null, cachedCurveFingerprint: null }),

  addCustomPlot: (plot) => set((s) => ({ customPlots: [...s.customPlots, plot] })),
  updateCustomPlot: (id, patch) => set((s) => ({
    customPlots: s.customPlots.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),
  removeCustomPlot: (id) => set((s) => ({
    customPlots: s.customPlots.filter((p) => p.id !== id),
  })),
  clearCustomPlots: () => set({ customPlots: [] }),

  reset: () => set(initialState),
}));
