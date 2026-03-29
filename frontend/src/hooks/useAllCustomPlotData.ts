import { useQueries } from "@tanstack/react-query";
import { fetchScatter } from "@/api/scatter";
import { useAppStore } from "@/store/useAppStore";
import type { ScatterFilter, SkuItem } from "@/types/api";
import type { CustomPlot } from "@/store/useAppStore";

/**
 * Build a complete attribute map that includes both SkuItem fields
 * and store-level controls (customer, promotion_indicator).
 */
function buildAttrMap(
  attrs: SkuItem,
  customer: string | null,
  promotionIndicator: 0 | 1,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    map[k] = String(v);
  }
  if (customer != null) map["customer"] = customer;
  map["promotion_indicator"] = String(promotionIndicator);
  return map;
}

function buildFilters(plot: CustomPlot, attrMap: Record<string, string>): ScatterFilter[] {
  return plot.columns
    .filter((col) => col in attrMap && attrMap[col] !== "undefined")
    .map((col) => ({
      column: col,
      value: attrMap[col],
    }));
}

export function useAllCustomPlotData() {
  const customPlots = useAppStore((s) => s.customPlots);
  const skuAttributes = useAppStore((s) => s.skuAttributes);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const promotionIndicator = useAppStore((s) => s.promotionIndicator);

  const visiblePlots = customPlots.filter((p) => p.isVisible);
  const attrMap = skuAttributes
    ? buildAttrMap(skuAttributes, selectedCustomer, promotionIndicator)
    : null;

  const queries = useQueries({
    queries: visiblePlots.map((plot) => {
      const filters = attrMap ? buildFilters(plot, attrMap) : [];
      return {
        queryKey: ["scatter", plot.id, filters] as const,
        queryFn: () => fetchScatter({ filters }),
        enabled: !!attrMap && filters.length > 0,
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
