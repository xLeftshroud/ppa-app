import { useQueries } from "@tanstack/react-query";
import { fetchScatter } from "@/api/scatter";
import { useAppStore } from "@/store/useAppStore";
import type { ScatterFilter } from "@/types/api";
import type { CustomPlot } from "@/store/useAppStore";

/**
 * Build attribute map from store-level fields (works with or without SKU).
 */
function buildAttrMap(
  selectedSku: number | null,
  attrBrand: string | null,
  attrFlavor: string | null,
  attrPackType: string | null,
  attrPackSize: number | null,
  attrUnitsPkg: number | null,
  customer: string | null,
  promotionIndicator: 0 | 1,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (selectedSku != null) map["product_sku_code"] = String(selectedSku);
  if (attrBrand != null) map["top_brand"] = attrBrand;
  if (attrFlavor != null) map["flavor_internal"] = attrFlavor;
  if (attrPackType != null) map["pack_type_internal"] = attrPackType;
  if (attrPackSize != null) map["pack_size_internal"] = String(attrPackSize);
  if (attrUnitsPkg != null) map["units_per_package_internal"] = String(attrUnitsPkg);
  if (customer != null) map["customer"] = customer;
  map["promotion_indicator"] = String(promotionIndicator);
  return map;
}

function buildFilters(plot: CustomPlot, attrMap: Record<string, string>): ScatterFilter[] {
  return plot.columns
    .filter((col) => col in attrMap)
    .map((col) => ({
      column: col,
      value: attrMap[col],
    }));
}

export function useAllCustomPlotData() {
  const customPlots = useAppStore((s) => s.customPlots);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const attrBrand = useAppStore((s) => s.attrBrand);
  const attrFlavor = useAppStore((s) => s.attrFlavor);
  const attrPackType = useAppStore((s) => s.attrPackType);
  const attrPackSize = useAppStore((s) => s.attrPackSize);
  const attrUnitsPkg = useAppStore((s) => s.attrUnitsPkg);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const promotionIndicator = useAppStore((s) => s.promotionIndicator);

  const visiblePlots = customPlots.filter((p) => p.isVisible);
  const attrMap = buildAttrMap(
    selectedSku, attrBrand, attrFlavor, attrPackType,
    attrPackSize, attrUnitsPkg, selectedCustomer, promotionIndicator,
  );

  const queries = useQueries({
    queries: visiblePlots.map((plot) => {
      const filters = buildFilters(plot, attrMap);
      return {
        queryKey: ["scatter", plot.id, filters] as const,
        queryFn: () => fetchScatter({ filters }),
        enabled: filters.length > 0,
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  return visiblePlots.map((plot, i) => ({
    plot,
    data: queries[i]?.data ?? null,
    isLoading: queries[i]?.isLoading ?? false,
  }));
}
